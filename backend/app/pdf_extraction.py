import re
import os
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from .schemas import PDFExtractionResponse
import pdfplumber
import PyPDF2
from io import BytesIO
import logging
from dotenv import load_dotenv
import ollama

load_dotenv()

router = APIRouter(prefix="/api/pdf-extraction", tags=["pdf-extraction"])

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral:latest")  # Default to llama3.1 for better instruction following

# Check if Ollama is available
ollama_available = False
try:
    client = ollama.Client(host=OLLAMA_BASE_URL)
    models_response = client.list()
    
    # Handle different response formats from Ollama API
    if isinstance(models_response, dict):
        models_list = models_response.get('models', [])
    elif hasattr(models_response, 'models'):
        models_list = models_response.models
    elif isinstance(models_response, list):
        models_list = models_response
    else:
        models_list = []
    
    if models_list and len(models_list) > 0:
        ollama_available = True
        model_names = [m.get('name') if isinstance(m, dict) else getattr(m, 'name', str(m)) for m in models_list]
        logger.info(f"Ollama is available. Using model: {OLLAMA_MODEL}")
        logger.info(f"Available models: {model_names}")
    else:
        logger.warning("Ollama is running but no models found. Please pull a model first.")
except Exception as e:
    logger.warning(f"Ollama not available: {e}. Make sure Ollama is running on {OLLAMA_BASE_URL}")


def extract_text_from_pdf(pdf_file: bytes, focus_bottom_right: bool = True) -> tuple[str, str]:
    """
    Extracts text from the uploaded PDF using pdfplumber.
    Focuses on bottom-right corner (title block area) where project details are typically located.
    Returns full text and title block text separately.
    """
    full_text = ""
    title_block_text = ""
    
    try:
        with pdfplumber.open(BytesIO(pdf_file)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract full page text
                page_text = page.extract_text()
                if page_text:
                    full_text += f"\n--- Page {page_num} ---\n" + page_text + "\n"
                
                # Extract text from bottom-right corner (title block area)
                if focus_bottom_right:
                    # Get page dimensions
                    width = page.width
                    height = page.height
                    
                    # Focus on bottom-right 30% of the page (typical title block area)
                    # This is usually where project details are located in drawings
                    bbox = (
                        width * 0.5,  # Start from middle horizontally
                        height * 0.7,  # Start from 70% down vertically (bottom 30%)
                        width,         # To right edge
                        height         # To bottom edge
                    )
                    
                    # Extract text from this region
                    cropped = page.crop(bbox)
                    cropped_text = cropped.extract_text()
                    if cropped_text:
                        title_block_text += f"\n--- Page {page_num} Title Block ---\n" + cropped_text + "\n"
                    
                    # Also try the entire bottom half in case title block is wider
                    bbox_wide = (
                        width * 0.3,  # Start from 30% horizontally
                        height * 0.7, # Start from 70% down
                        width,
                        height
                    )
                    cropped_wide = page.crop(bbox_wide)
                    cropped_wide_text = cropped_wide.extract_text()
                    if cropped_wide_text and cropped_wide_text not in title_block_text:
                        title_block_text += f"\n--- Page {page_num} Title Block (Wide) ---\n" + cropped_wide_text + "\n"
                
                # Also extract tables (many PDFs have data in tables)
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            if row:
                                row_text = " ".join([str(cell) if cell else "" for cell in row])
                                full_text += row_text + "\n"
                                title_block_text += row_text + "\n"
    
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")
    
    # Fallback to PyPDF2 if needed
    if len(full_text.strip()) < 100:
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_file))
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {e}")
    
    return full_text, title_block_text


def extract_json_from_text(text: str) -> dict | None:
    """
    Robustly extracts JSON from potentially wrapped text response.
    Handles incomplete/truncated JSON by trying to fix it.
    """
    # Clean up the text first
    text = text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    # Try to find JSON object - look for opening brace
    start_idx = text.find('{')
    if start_idx == -1:
        return None
    
    # Find the matching closing brace, handling nested objects
    brace_count = 0
    end_idx = start_idx
    for i in range(start_idx, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
    
    # Extract the JSON portion
    json_text = text[start_idx:end_idx] if end_idx > start_idx else text[start_idx:]
    
    # Try to fix incomplete JSON by closing unclosed structures
    if brace_count > 0:
        # JSON is incomplete, try to close it
        # Remove incomplete entries at the end (like "Description": "HEAL...")
        json_text = re.sub(r',\s*"[^"]*"\s*:\s*\[?\s*\{?\s*"[^"]*"\s*:\s*"[^"]*$', '', json_text)
        json_text = re.sub(r',\s*"[^"]*"\s*:\s*"[^"]*$', '', json_text)  # Remove incomplete string values
        json_text = json_text.rstrip().rstrip(',')
        # Close any unclosed braces
        json_text += '}' * brace_count
    
    # Try to parse
    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        # Try to extract just the key-value pairs we need
        result = {}
        # Look for common patterns
        patterns = {
            'Job Name': r'"Job Name"\s*:\s*"([^"]*)"',
            'Project': r'"Project"\s*:\s*"([^"]*)"',
            'Job No': r'"Job No"\s*:\s*"([^"]*)"',
            'Drawing Number': r'"Drawing Number"\s*:\s*"([^"]*)"',
            'General Contractor Name': r'"General Contractor Name"\s*:\s*"([^"]*)"',
            'Client': r'"Client"\s*:\s*"([^"]*)"',
            'Architect Name': r'"Architect Name"\s*:\s*"([^"]*)"',
            'Architect': r'"Architect"\s*:\s*"([^"]*)"',
            'Location': r'"Location"\s*:\s*"([^"]*)"',
            'Project Type': r'"Project Type"\s*:\s*"([^"]*)"',
            'Title': r'"Title"\s*:\s*"([^"]*)"',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result[key] = match.group(1)
        
        return result if result else None


def extract_details_with_ollama(text: str, title_block_text: str = "", model: str = "llama3.1") -> dict:
    """
    Uses local Ollama model to extract structured details from the PDF text.
    Enhanced prompt with descriptions and example for better accuracy.
    """
    if not ollama_available:
        logger.warning("Ollama not available, using fallback pattern matching")
        return extract_with_patterns(text)
    
    # Prioritize title block text if available
    extraction_text = title_block_text if title_block_text.strip() else text
    
    # Limit text length for AI (use first 8000 chars to stay within context limits)
    if len(extraction_text) > 8000:
        extraction_text = extraction_text[:8000] + "\n[... text truncated ...]"
    
    prompt = f"""
You are an expert in parsing architectural and engineering documents like steel framing plans. These typically have a title block with job details at the bottom/right, architect info at bottom left, and revisions.

Extract the following information and return as JSON. Use these exact field names:

- "Job Name" or "Project": Full project title
- "Job No" or "Drawing Number": Project or drawing number
- "Professional Engineer Name": Name of the PE stamping the drawings
- "General Contractor Name" or "Client": Construction company/owner
- "Architect Name" or "Architect": Architecture firm name
- "Engineer Name": Structural engineer name
- "Fabricator Name": Steel fabricator (if mentioned)
- "Design Calculation": Reference to calculations
- "Contract Drawings" or "Title": Drawing set description or title
- "Standards": Codes/standards (e.g., AISC, ASTM, BS, IS, EN)
- "Detailer": Person/firm who detailed (from "Drawn By" or similar)
- "Detailing Country": Country name

If a field is not found, use null. Return ONLY valid JSON with these field names. No extra text.

PDF Text:

{extraction_text}

"""
    
    try:
        client = ollama.Client(host=OLLAMA_BASE_URL)
        response = client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={
                "temperature": 0.05,  # Very low for precision
                "num_predict": 2000  # Increase token limit to prevent truncation
            }
        )
        
        result = response['message']['content']
        
        details = extract_json_from_text(result)
        if details is None:
            logger.error(f"Failed to parse AI response. Raw: {result[:1000]}")
            # Try pattern-based extraction from the raw result
            logger.info("Attempting pattern-based extraction from raw response")
            details = {}
            # Extract key fields using regex
            job_name_match = re.search(r'"Job Name"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if job_name_match:
                details['Job Name'] = job_name_match.group(1)
            project_match = re.search(r'"Project"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if project_match:
                details['Project'] = project_match.group(1)
            job_no_match = re.search(r'"Job No"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if job_no_match:
                details['Job No'] = job_no_match.group(1)
            drawing_num_match = re.search(r'"Drawing Number"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if drawing_num_match:
                details['Drawing Number'] = drawing_num_match.group(1)
            gc_match = re.search(r'"General Contractor Name"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if gc_match:
                details['General Contractor Name'] = gc_match.group(1)
            client_match = re.search(r'"Client"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if client_match:
                details['Client'] = client_match.group(1)
            architect_match = re.search(r'"Architect Name"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if architect_match:
                details['Architect Name'] = architect_match.group(1)
            location_match = re.search(r'"Location"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if location_match:
                details['Location'] = location_match.group(1)
            title_match = re.search(r'"Title"\s*:\s*"([^"]*)"', result, re.IGNORECASE)
            if title_match:
                details['Title'] = title_match.group(1)
            
            if not details:
                # Fallback to pattern matching from original text
                return extract_with_patterns(text)
        
        # Map AI response to our expected format
        # Handle both numbered keys (1-12) and named keys from AI
        mapped_details = {}
        
        # First, try numbered keys (1-12) format
        if any(str(i) in details for i in range(1, 13)):
            mapped_details = {
                'job_name': details.get('1') or details.get('1', 'Not specified'),
                'job_no': details.get('2') or details.get('2', 'Not specified'),
                'professional_engineer_name': details.get('3') or details.get('3', 'Not specified'),
                'general_contractor_name': details.get('4') or details.get('4', 'Not specified'),
                'architect_name': details.get('5') or details.get('5', 'Not specified'),
                'engineer_name': details.get('6') or details.get('6', 'Not specified'),
                'fabricator_name': details.get('7') or details.get('7', 'Not specified'),
                'design_calculation': details.get('8') or details.get('8', 'Not specified'),
                'contract_drawings': details.get('9') or details.get('9', 'Not specified'),
                'standards': details.get('10') or details.get('10', 'Not specified'),
                'detailer': details.get('11') or details.get('11', 'Not specified'),
                'detailing_country': details.get('12') or details.get('12', 'Not specified'),
            }
        else:
            # Map from AI's natural field names to our format
            # Handle various field name variations
            mapped_details = {
                'job_name': (
                    (details.get('Job Name') and details.get('Location') and f"{details.get('Job Name')}, {details.get('Location')}") or
                    details.get('Job Name') or 
                    details.get('Project') or 
                    details.get('Project Name') or 
                    details.get('job_name') or
                    'Not specified'
                ),
                'job_no': (
                    details.get('Job No') or 
                    details.get('Job Number') or 
                    details.get('Drawing Number') or 
                    details.get('Project Number') or
                    details.get('job_no') or
                    'Not specified'
                ),
                'professional_engineer_name': (
                    details.get('Professional Engineer') or 
                    details.get('P.E.') or 
                    details.get('PE') or
                    details.get('professional_engineer_name') or
                    'Not specified'
                ),
                'general_contractor_name': (
                    details.get('General Contractor') or 
                    details.get('GC') or 
                    details.get('Client') or
                    details.get('Owner') or
                    details.get('general_contractor_name') or
                    'Not specified'
                ),
                'architect_name': (
                    details.get('Architect') or 
                    details.get('Architectural Firm') or
                    details.get('architect_name') or
                    'Not specified'
                ),
                'engineer_name': (
                    details.get('Engineer') or 
                    details.get('Structural Engineer') or
                    details.get('engineer_name') or
                    'Not specified'
                ),
                'fabricator_name': (
                    details.get('Fabricator') or 
                    details.get('Steel Fabricator') or
                    details.get('fabricator_name') or
                    'Not specified'
                ),
                'design_calculation': (
                    details.get('Design Calculation') or 
                    details.get('Calculations') or
                    details.get('design_calculation') or
                    'Not specified'
                ),
                'contract_drawings': (
                    details.get('Contract Drawings') or 
                    details.get('Drawing Set') or 
                    details.get('Title') or  # Sometimes title contains drawing info
                    details.get('contract_drawings') or
                    'Not specified'
                ),
                'standards': (
                    details.get('Standards') or 
                    details.get('Code') or
                    details.get('standards') or
                    'Not specified'
                ),
                'detailer': (
                    details.get('Detailer') or 
                    details.get('Drawn By') or
                    details.get('detailer') or
                    'Not specified'
                ),
                'detailing_country': (
                    details.get('Detailing Country') or 
                    details.get('Country') or
                    details.get('Location') or
                    details.get('detailing_country') or
                    'Not specified'
                ),
            }
        
        # Clean up values - handle arrays, remove "Not specified"
        for key, value in mapped_details.items():
            if isinstance(value, list):
                # If value is an array, join it
                mapped_details[key] = ', '.join(str(v) for v in value) if value else None
            elif value == "Not specified" or value == "Not provided" or not value:
                mapped_details[key] = None
            else:
                # Clean string values
                mapped_details[key] = str(value).strip() if value else None
        
        logger.info(f"AI extraction successful: {mapped_details}")
        return mapped_details
    
    except Exception as e:
        logger.error(f"Ollama AI extraction failed: {e}", exc_info=True)
        # Fallback to pattern matching
        return extract_with_patterns(text)


def extract_with_patterns(text: str) -> dict:
    """Fallback pattern-based extraction when AI is not available"""
    result = {}
    normalized_text = text.replace('\n', ' ').replace('\r', ' ')
    normalized_text = ' '.join(normalized_text.split())
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Simple label-based extraction
    label_mappings = {
        'job_name': ['Job Name', 'Project Name', 'Project Title', 'Building Name'],
        'job_no': ['Job No', 'Job Number', 'Project No', 'Project Number', 'Job #', 'Project #'],
        'professional_engineer_name': ['Professional Engineer', 'P.E.', 'PE', 'Engineer of Record', 'EOR'],
        'general_contractor_name': ['General Contractor', 'GC', 'Prime Contractor', 'Main Contractor'],
        'architect_name': ['Architect', 'Architectural Firm', 'Ar.', 'Architect of Record', 'AOR'],
        'engineer_name': ['Structural Engineer', 'Engineer', 'SE', 'Engineering Firm'],
        'fabricator_name': ['Fabricator', 'Steel Fabricator', 'Fabrication Company'],
        'design_calculation': ['Design Calculation', 'Design Calcs', 'Calculations'],
        'contract_drawings': ['Contract Drawings', 'Drawing Set', 'Drawings'],
        'standards': ['Standards', 'Code', 'Design Code'],
        'detailer': ['Detailer', 'Detailing Company', 'Detailing Firm'],
        'detailing_country': ['Detailing Country', 'Country', 'Location'],
    }
    
    for field, labels in label_mappings.items():
        for line in lines:
            for label in labels:
                if label.lower() in line.lower():
                    # Extract value after label
                    pattern = rf'{re.escape(label)}[:\s]+([^\n\r,]+?)(?:\n|$|,)'
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match:
                        value = match.group(1).strip().strip('.,;:')
                        if value and len(value) > 2:
                            result[field] = value
                            break
            if field in result:
                break
    
    return result


@router.post("", response_model=PDFExtractionResponse)
async def extract_pdf_data(file: UploadFile = File(...)):
    """Extract project information from uploaded PDF using AI"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read PDF file
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty PDF file")
        
        # Extract text from PDF (focus on bottom-right title block)
        full_text, title_block_text = extract_text_from_pdf(pdf_bytes, focus_bottom_right=True)
        
        if not full_text or len(full_text.strip()) < 50:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract sufficient text from PDF. The PDF might be image-based or encrypted. Please ensure the PDF contains selectable text."
            )
        
        logger.info(f"Extracted {len(full_text)} chars from full text, {len(title_block_text)} chars from title block")
        
        # Extract structured data using AI
        extracted_data = extract_details_with_ollama(full_text, title_block_text, OLLAMA_MODEL)
        
        # Map to response format
        response = PDFExtractionResponse(
            job_name=extracted_data.get('job_name'),
            job_no=extracted_data.get('job_no'),
            professional_engineer_name=extracted_data.get('professional_engineer_name'),
            general_contractor_name=extracted_data.get('general_contractor_name'),
            architect_name=extracted_data.get('architect_name'),
            engineer_name=extracted_data.get('engineer_name'),
            fabricator_name=extracted_data.get('fabricator_name'),
            design_calculation=extracted_data.get('design_calculation'),
            contract_drawings=extracted_data.get('contract_drawings'),
            standards=extracted_data.get('standards'),
            detailer=extracted_data.get('detailer'),
            detailing_country=extracted_data.get('detailing_country'),
        )
        
        logger.info(f"Final extraction response: {response}")
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@router.post("/debug")
async def debug_extraction(file: UploadFile = File(...)):
    """Debug endpoint to see what text is extracted from PDF"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        pdf_bytes = await file.read()
        full_text, title_block_text = extract_text_from_pdf(pdf_bytes, focus_bottom_right=True)
        extracted_data = extract_details_with_ollama(full_text, title_block_text, OLLAMA_MODEL)
        
        return {
            "full_text_preview": full_text[:2000] if full_text else "No text extracted",
            "title_block_text_preview": title_block_text[:2000] if title_block_text else "No title block text",
            "full_text_length": len(full_text) if full_text else 0,
            "title_block_length": len(title_block_text) if title_block_text else 0,
            "extracted_data": extracted_data,
            "first_10_lines_full": full_text.split('\n')[:10] if full_text else [],
            "first_10_lines_title_block": title_block_text.split('\n')[:10] if title_block_text else [],
            "ollama_available": ollama_available,
            "ollama_model": OLLAMA_MODEL if ollama_available else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

