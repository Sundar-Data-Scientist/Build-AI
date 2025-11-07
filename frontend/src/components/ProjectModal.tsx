import { useState, useRef } from 'react'

type ProjectModalProps = {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectName: string) => void
  userEmail?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg'
]

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.json', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.jpg']

export default function ProjectModal({ isOpen, onClose, onProjectCreated, userEmail }: ProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [professionalEngineer, setProfessionalEngineer] = useState('')
  const [generalContractor, setGeneralContractor] = useState('')
  const [architect, setArchitect] = useState('')
  const [engineer, setEngineer] = useState('')
  const [fabricator, setFabricator] = useState('')
  const [designCalculation, setDesignCalculation] = useState<File | null>(null)
  const [contractDrawings, setContractDrawings] = useState('')
  const [contractDrawingsOther, setContractDrawingsOther] = useState('')
  const [standards, setStandards] = useState('')
  const [standardsOther, setStandardsOther] = useState('')
  const [detailer, setDetailer] = useState('')
  const [detailingCountry, setDetailingCountry] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const designCalculationFileRef = useRef<HTMLInputElement>(null)

  const extractFromPDF = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('http://localhost:8000/api/pdf-extraction', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to extract data from PDF')
      }
      
      const extractedData = await response.json()
      console.log('Extracted data from PDF:', extractedData)
      return extractedData
    } catch (error) {
      console.error('PDF extraction error:', error)
      return null
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const invalid = files.find(f => !(ALLOWED_TYPES.includes(f.type) || ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))))
    if (invalid) {
      setUploadError('Please select a valid file type: PDF, TXT, JSON, DOC, DOCX, PPT, PPTX, XLS, XLSX, or JPG')
      return
    }

    setUploadedFiles(files)
    setUploadError(null)

    // Extract data from PDF files
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length > 0) {
      setIsExtracting(true)
      setExtractionMessage('Extracting data from PDF...')
      
      try {
        // Extract from all PDFs and merge results
        const extractionPromises = pdfFiles.map(file => extractFromPDF(file))
        const results = await Promise.all(extractionPromises)
        
        // Merge all extraction results (first non-null value wins)
        const mergedData: any = {}
        results.forEach(result => {
          if (result) {
            Object.keys(result).forEach(key => {
              if (result[key] && !mergedData[key]) {
                mergedData[key] = result[key]
              }
            })
          }
        })
        
        console.log('Merged extraction data:', mergedData)
        
        // Auto-fill form fields with extracted data
        if (mergedData.job_name && !projectName) {
          setProjectName(mergedData.job_name)
        }
        if (mergedData.job_no && !projectNumber) {
          setProjectNumber(mergedData.job_no)
        }
        if (mergedData.professional_engineer_name && !professionalEngineer) {
          setProfessionalEngineer(mergedData.professional_engineer_name)
        }
        if (mergedData.general_contractor_name && !generalContractor) {
          setGeneralContractor(mergedData.general_contractor_name)
        }
        if (mergedData.architect_name && !architect) {
          setArchitect(mergedData.architect_name)
        }
        if (mergedData.engineer_name && !engineer) {
          setEngineer(mergedData.engineer_name)
        }
        if (mergedData.fabricator_name && !fabricator) {
          setFabricator(mergedData.fabricator_name)
        }
        if (mergedData.design_calculation && !designCalculation) {
          // Design calculation is a file, so we can't auto-fill it, but we can note it
          setExtractionMessage('Design calculation reference found in PDF')
        }
        if (mergedData.contract_drawings && !contractDrawings) {
          // Check if it matches any of our options
          const drawingsLower = mergedData.contract_drawings.toLowerCase()
          if (drawingsLower.includes('construction')) {
            setContractDrawings('Construction Set')
          } else if (drawingsLower.includes('bid')) {
            setContractDrawings('BID Set')
          } else {
            setContractDrawingsOther(mergedData.contract_drawings)
            setContractDrawings('Others')
          }
        }
        if (mergedData.standards && !standards) {
          // Check if it matches any standard options
          const standardsText = mergedData.standards.toLowerCase()
          if (standardsText.includes('british') || standardsText.includes('bs')) {
            setStandards('British Standards (BS)')
          } else if (standardsText.includes('indian') || standardsText.includes('is ')) {
            setStandards('Indian Standards (IS)')
          } else if (standardsText.includes('european') || standardsText.includes('en ')) {
            setStandards('European Standards (EN)')
          } else if (standardsText.includes('australian') || standardsText.includes('as/') || standardsText.includes('nzs')) {
            setStandards('Australian Standards (AS/ NZS)')
          } else if (standardsText.includes('american') || standardsText.includes('aisc') || standardsText.includes('astm') || standardsText.includes('aci')) {
            setStandards('American Standards (AISC/ ASTM/ ACI)')
          } else {
            setStandardsOther(mergedData.standards)
            setStandards('Others')
          }
        }
        if (mergedData.detailer && !detailer) {
          setDetailer(mergedData.detailer)
        }
        if (mergedData.detailing_country && !detailingCountry) {
          setDetailingCountry(mergedData.detailing_country)
        }
        
        setExtractionMessage('Data extracted successfully from PDF!')
        setTimeout(() => setExtractionMessage(null), 3000)
      } catch (error) {
        console.error('Error extracting PDF data:', error)
        setExtractionMessage('Could not extract all data from PDF. Please fill manually.')
        setTimeout(() => setExtractionMessage(null), 3000)
      } finally {
        setIsExtracting(false)
      }
    }
  }

  const handleDesignCalculationFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValid = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isValid) {
      setUploadError('Please select a valid file type: PDF, TXT, JSON, DOC, DOCX, PPT, PPTX, XLS, XLSX, or JPG')
      return
    }

    setDesignCalculation(file)
    setUploadError(null)
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || !projectName.trim()) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // First, create the project with setup information
      const projectResponse = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          project_number: projectNumber || null,
          professional_engineer: professionalEngineer || null,
          general_contractor: generalContractor || null,
          architect: architect || null,
          engineer: engineer || null,
          fabricator: fabricator || null,
          design_calculation: designCalculation ? designCalculation.name : null,
          contract_drawings: contractDrawings === 'Others' ? contractDrawingsOther : (contractDrawings || null),
          standards: standards === 'Others' ? standardsOther : (standards || null),
          detailer: detailer || null,
          detailing_country: detailingCountry || null,
          geolocation: null,
          description: null
        })
      })

      if (!projectResponse.ok) {
        const err = await projectResponse.json().catch(() => ({}))
        throw new Error(err?.detail || 'Failed to create project')
      }

      // Then upload the files
      const formData = new FormData()
      uploadedFiles.forEach(f => formData.append('files', f))
      
      // Upload design calculation file if present
      if (designCalculation) {
        formData.append('files', designCalculation)
      }

      const params = new URLSearchParams({ stage: '1', dpId: '1', projectName })
      if (userEmail) params.append('userEmail', userEmail)
      const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Upload failed')
      }
      await res.json()
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed')
      setIsUploading(false)
      return
    }

    setIsUploading(false)
    onProjectCreated(projectName)
    onClose()
  }

  const handleClose = () => {
    setProjectName('')
    setProjectNumber('')
    setProfessionalEngineer('')
    setGeneralContractor('')
    setArchitect('')
    setEngineer('')
    setFabricator('')
    setDesignCalculation(null)
    setContractDrawings('')
    setContractDrawingsOther('')
    setStandards('')
    setStandardsOther('')
    setDetailer('')
    setDetailingCountry('')
    setUploadedFiles([])
    setUploadError(null)
    setIsExtracting(false)
    setExtractionMessage(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--color-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '2rem',
        maxWidth: 600,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Create New Project</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Upload Files</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 8,
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: uploadedFiles.length > 0 ? 'var(--color-background)' : 'transparent'
              }}
            >
              {uploadedFiles.length > 0 ? (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'var(--color-text)', fontWeight: 500, marginBottom: 8 }}>
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
                  </div>
                  <div style={{ color: 'var(--color-muted)', fontSize: 13, display: 'grid', gap: 4 }}>
                    {uploadedFiles.map(f => (
                      <div key={f.name}>📄 {f.name} — {(f.size / 1024 / 1024).toFixed(2)} MB</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                  <div style={{ color: 'var(--color-text)' }}>Click to upload files</div>
                  <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 4 }}>
                    PDF, TXT, JSON, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.txt,.json,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg"
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Job Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., ABC Tower Extension Project"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Job No.</label>
            <input
              type="text"
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
              placeholder="e.g., JOB-1234"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Professional Engineer Name</label>
            <input
              type="text"
              value={professionalEngineer}
              onChange={(e) => setProfessionalEngineer(e.target.value)}
              placeholder="e.g., Engr. John Smith"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>General Contractor Name</label>
            <input
              type="text"
              value={generalContractor}
              onChange={(e) => setGeneralContractor(e.target.value)}
              placeholder="e.g., Zenith Construction Pvt. Ltd."
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Architect Name</label>
            <input
              type="text"
              value={architect}
              onChange={(e) => setArchitect(e.target.value)}
              placeholder="e.g., Ar. David Mathew / D&M Architects"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Engineer Name</label>
            <input
              type="text"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              placeholder="e.g., Structural Eng. Anil Kumar"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Fabricator Name</label>
            <input
              type="text"
              value={fabricator}
              onChange={(e) => setFabricator(e.target.value)}
              placeholder="e.g., SteelBuild Fabricators LLP"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Design Calculation</label>
            <div
              onClick={() => designCalculationFileRef.current?.click()}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 8,
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: designCalculation ? 'var(--color-background)' : 'transparent'
              }}
            >
              {designCalculation ? (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'var(--color-text)', fontWeight: 500, marginBottom: 4 }}>
                    📄 {designCalculation.name}
                  </div>
                  <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                    {(designCalculation.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                  <div style={{ color: 'var(--color-text)' }}>Upload design file or reference</div>
                  <div style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 4 }}>
                    PDF, TXT, JSON, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG
                  </div>
                </div>
              )}
            </div>
            <input
              ref={designCalculationFileRef}
              type="file"
              onChange={handleDesignCalculationFileSelect}
              accept=".pdf,.txt,.json,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg"
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Contract Drawings</label>
            <select
              value={contractDrawings}
              onChange={(e) => setContractDrawings(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled hidden>Select Drawing Set Type</option>
              <option value="BID Set">BID Set</option>
              <option value="Construction Set">Construction Set</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Standards</label>
            <select
              value={standards}
              onChange={(e) => {
                setStandards(e.target.value)
                if (e.target.value !== 'Others') {
                  setStandardsOther('')
                }
              }}
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                marginBottom: standards === 'Others' ? 8 : 0
              }}
            >
              <option value="" disabled hidden>Select Applicable Standard</option>
              <option value="British Standards (BS)">British Standards (BS)</option>
              <option value="Indian Standards (IS)">Indian Standards (IS)</option>
              <option value="European Standards (EN)">European Standards (EN)</option>
              <option value="Australian Standards (AS/ NZS)">Australian Standards (AS/ NZS)</option>
              <option value="American Standards (AISC/ ASTM/ ACI)">American Standards (AISC/ ASTM/ ACI)</option>
              <option value="Others">Others</option>
            </select>
            {standards === 'Others' && (
              <input
                type="text"
                value={standardsOther}
                onChange={(e) => setStandardsOther(e.target.value)}
                placeholder="Enter custom standards"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: 'var(--color-primary)',
                  color: 'var(--color-text)',
                  marginTop: 8
                }}
              />
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Detailer</label>
            <input
              type="text"
              value={detailer}
              onChange={(e) => setDetailer(e.target.value)}
              placeholder="e.g., BuildAid Detailing Team"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 14 }}>Detailing Country</label>
            <input
              type="text"
              value={detailingCountry}
              onChange={(e) => setDetailingCountry(e.target.value)}
              placeholder="e.g., India / Australia / UAE"
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          {extractionMessage && (
            <div style={{ 
              color: extractionMessage.includes('successfully') ? '#10b981' : '#3b82f6', 
              fontSize: 14, 
              padding: '0.5rem', 
              background: extractionMessage.includes('successfully') ? '#f0fdf4' : '#eff6ff', 
              border: `1px solid ${extractionMessage.includes('successfully') ? '#86efac' : '#93c5fd'}`, 
              borderRadius: 6 
            }}>
              {isExtracting ? '⏳ ' : '✅ '}{extractionMessage}
            </div>
          )}
          {uploadError && (
            <div style={{ color: '#ef4444', fontSize: 14, padding: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
              {uploadError}
            </div>
          )}


          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={handleClose} style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8 }}>
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!projectName.trim() || uploadedFiles.length === 0 || isUploading}
              style={{
                padding: '0.8rem 1.5rem',
                background: isUploading ? 'var(--color-muted)' : 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: isUploading ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? 'Uploading...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
