import { useState, useEffect, useRef } from 'react'

type ProjectSetupProps = {
  projectName: string
}

type ProjectData = {
  id: number
  name: string
  project_number: string | null
  professional_engineer: string | null
  general_contractor: string | null
  architect: string | null
  engineer: string | null
  fabricator: string | null
  design_calculation: string | null
  contract_drawings: string | null
  standards: string | null
  detailer: string | null
  detailing_country: string | null
  geolocation: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export default function ProjectSetup({ projectName }: ProjectSetupProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<ProjectData>>({})
  const [contractDrawingsOther, setContractDrawingsOther] = useState('')
  const [standardsOther, setStandardsOther] = useState('')
  const [designCalculationFile, setDesignCalculationFile] = useState<File | null>(null)
  const designCalculationFileRef = useRef<HTMLInputElement>(null)
  
  const contractDrawingsOptions = ['BID Set', 'Construction Set']
  const standardsOptions = ['British Standards (BS)', 'Indian Standards (IS)', 'European Standards (EN)', 'Australian Standards (AS/ NZS)', 'American Standards (AISC/ ASTM/ ACI)']
  
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

  useEffect(() => {
    fetchProjectData()
  }, [projectName])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`http://localhost:8000/api/projects/${encodeURIComponent(projectName)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Project doesn't exist yet, create it with basic info
          await createProject()
          return
        }
        throw new Error('Failed to fetch project data')
      }
      
      const data = await response.json()
      setProjectData(data)
      setEditData(data)
      // Check if contract_drawings or standards are custom values (not in predefined options)
      if (data.contract_drawings && !contractDrawingsOptions.includes(data.contract_drawings)) {
        setContractDrawingsOther(data.contract_drawings)
        setEditData(prev => ({ ...prev, contract_drawings: 'Others' }))
      }
      if (data.standards && !standardsOptions.includes(data.standards)) {
        setStandardsOther(data.standards)
        setEditData(prev => ({ ...prev, standards: 'Others' }))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          project_number: null,
          professional_engineer: null,
          general_contractor: null,
          architect: null,
          engineer: null,
          fabricator: null,
          design_calculation: null,
          contract_drawings: null,
          standards: null,
          detailer: null,
          detailing_country: null,
          geolocation: null,
          description: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const data = await response.json()
      setProjectData(data)
      setEditData(data)
      // Check if contract_drawings or standards are custom values (not in predefined options)
      if (data.contract_drawings && !contractDrawingsOptions.includes(data.contract_drawings)) {
        setContractDrawingsOther(data.contract_drawings)
        setEditData(prev => ({ ...prev, contract_drawings: 'Others' }))
      }
      if (data.standards && !standardsOptions.includes(data.standards)) {
        setStandardsOther(data.standards)
        setEditData(prev => ({ ...prev, standards: 'Others' }))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    }
  }

  const handleDesignCalculationFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValid = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isValid) {
      setError('Please select a valid file type: PDF, TXT, JSON, DOC, DOCX, PPT, PPTX, XLS, XLSX, or JPG')
      return
    }

    setDesignCalculationFile(file)
    setError(null)
  }

  const handleSave = async () => {
    if (!projectData) return

    try {
      setLoading(true)
      // Prepare data for saving - replace 'Others' with custom values if applicable
      const saveData = { ...editData }
      if (saveData.contract_drawings === 'Others') {
        saveData.contract_drawings = contractDrawingsOther || null
      }
      if (saveData.standards === 'Others') {
        saveData.standards = standardsOther || null
      }
      
      // Update design_calculation with file name if file is selected
      if (designCalculationFile) {
        saveData.design_calculation = designCalculationFile.name
      }
      
      const response = await fetch(`http://localhost:8000/api/projects/${encodeURIComponent(projectName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      const data = await response.json()
      setProjectData(data)
      
      // Upload design calculation file if present
      if (designCalculationFile) {
        const formData = new FormData()
        formData.append('files', designCalculationFile)
        const params = new URLSearchParams({ stage: '1', dpId: '1', projectName })
        await fetch(`http://localhost:8000/api/uploads?${params.toString()}`, {
          method: 'POST',
          body: formData
        })
      }
      
      setIsEditing(false)
      setDesignCalculationFile(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditData(projectData || {})
    setIsEditing(false)
    setDesignCalculationFile(null)
    // Reset custom fields
    if (projectData?.contract_drawings && !contractDrawingsOptions.includes(projectData.contract_drawings)) {
      setContractDrawingsOther(projectData.contract_drawings)
    } else {
      setContractDrawingsOther('')
    }
    if (projectData?.standards && !standardsOptions.includes(projectData.standards)) {
      setStandardsOther(projectData.standards)
    } else {
      setStandardsOther('')
    }
  }

  const handleInputChange = (field: keyof ProjectData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value || null
    }))
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 200,
        color: 'var(--color-muted)'
      }}>
        Loading project setup...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: 8,
        color: '#ef4444'
      }}>
        Error: {error}
      </div>
    )
  }

  const fields = [
    { key: 'name', label: 'Job Name', value: projectData?.name || '', placeholder: 'e.g., ABC Tower Extension Project' },
    { key: 'project_number', label: 'Job No.', value: projectData?.project_number || '', placeholder: 'e.g., JOB-1234' },
    { key: 'professional_engineer', label: 'Professional Engineer Name', value: projectData?.professional_engineer || '', placeholder: 'e.g., Engr. John Smith' },
    { key: 'general_contractor', label: 'General Contractor Name', value: projectData?.general_contractor || '', placeholder: 'e.g., Zenith Construction Pvt. Ltd.' },
    { key: 'architect', label: 'Architect Name', value: projectData?.architect || '', placeholder: 'e.g., Ar. David Mathew / D&M Architects' },
    { key: 'engineer', label: 'Engineer Name', value: projectData?.engineer || '', placeholder: 'e.g., Structural Eng. Anil Kumar' },
    { key: 'fabricator', label: 'Fabricator Name', value: projectData?.fabricator || '', placeholder: 'e.g., SteelBuild Fabricators LLP' },
    { key: 'design_calculation', label: 'Design Calculation', value: projectData?.design_calculation || '', isFileUpload: true, placeholder: 'Upload design file or reference' },
    { key: 'contract_drawings', label: 'Contract Drawings', value: projectData?.contract_drawings || '', isSelect: true, selectOptions: ['BID Set', 'Construction Set'], placeholder: 'Select Drawing Set Type' },
    { key: 'standards', label: 'Standards', value: projectData?.standards || '', isSelect: true, selectOptions: ['British Standards (BS)', 'Indian Standards (IS)', 'European Standards (EN)', 'Australian Standards (AS/ NZS)', 'American Standards (AISC/ ASTM/ ACI)', 'Others'], placeholder: 'Select Applicable Standard' },
    { key: 'detailer', label: 'Detailer', value: projectData?.detailer || '', placeholder: 'e.g., BuildAid Detailing Team' },
    { key: 'detailing_country', label: 'Detailing Country', value: projectData?.detailing_country || '', placeholder: 'e.g., India / Australia / UAE' }
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Project Setup</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                background: loading ? 'var(--color-muted)' : 'var(--color-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div style={{ 
        background: 'var(--color-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'grid', gap: 20 }}>
          {fields.map((field) => (
            <div key={field.key}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontWeight: 500,
                color: 'var(--color-text)'
              }}>
                {field.label}
              </label>
              {field.isFileUpload ? (
                <div>
                  {!isEditing ? (
                    <div style={{
                      padding: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      minHeight: 50,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {field.value ? (
                        <span>📄 {field.value}</span>
                      ) : (
                        <span style={{ color: 'var(--color-muted)' }}>No file uploaded</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => designCalculationFileRef.current?.click()}
                        style={{
                          border: '2px dashed var(--color-border)',
                          borderRadius: 8,
                          padding: '1.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: designCalculationFile ? 'var(--color-background)' : 'transparent'
                        }}
                      >
                        {designCalculationFile ? (
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ color: 'var(--color-text)', fontWeight: 500, marginBottom: 4 }}>
                              📄 {designCalculationFile.name}
                            </div>
                            <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                              {(designCalculationFile.size / 1024 / 1024).toFixed(2)} MB
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
                      {field.value && !designCalculationFile && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-muted)' }}>
                          Current file: {field.value}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (field as any).isTextArea ? (
                <textarea
                  value={isEditing ? (editData[field.key as keyof ProjectData] as string) || '' : field.value}
                  onChange={(e) => handleInputChange(field.key as keyof ProjectData, e.target.value)}
                  disabled={!isEditing}
                  placeholder={(field as any).placeholder || `Enter ${field.label.toLowerCase()}`}
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: '0.75rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: isEditing ? 'var(--color-primary)' : 'var(--color-background)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              ) : field.isSelect ? (
                <>
                  <select
                    value={
                      isEditing
                        ? (editData[field.key as keyof ProjectData] as string) || ''
                        : (field.key === 'standards' && projectData?.standards && !standardsOptions.includes(projectData.standards))
                          ? 'Others'
                          : field.value
                    }
                    onChange={(e) => {
                      handleInputChange(field.key as keyof ProjectData, e.target.value)
                      if (e.target.value !== 'Others') {
                        if (field.key === 'standards') setStandardsOther('')
                      }
                    }}
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      background: isEditing ? 'var(--color-primary)' : 'var(--color-background)',
                      color: 'var(--color-text)',
                      cursor: isEditing ? 'pointer' : 'default',
                      marginBottom: (isEditing && (editData[field.key as keyof ProjectData] === 'Others')) ? 8 : 0
                    }}
                  >
                    <option value="" disabled hidden>{(field as any).placeholder || `Select ${field.label.toLowerCase()}`}</option>
                    {field.selectOptions?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {((isEditing && editData[field.key as keyof ProjectData] === 'Others') || 
                    (!isEditing && field.key === 'standards' && projectData?.standards && !standardsOptions.includes(projectData.standards))) && (
                    <input
                      type="text"
                      value={field.key === 'standards' ? standardsOther : ''}
                      onChange={(e) => {
                        if (field.key === 'standards') {
                          setStandardsOther(e.target.value)
                        }
                      }}
                      disabled={!isEditing}
                      placeholder={`Enter custom ${field.label.toLowerCase()}`}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        background: isEditing ? 'var(--color-primary)' : 'var(--color-background)',
                        color: 'var(--color-text)',
                        marginTop: 8
                      }}
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={isEditing ? (editData[field.key as keyof ProjectData] as string) || '' : field.value}
                  onChange={(e) => handleInputChange(field.key as keyof ProjectData, e.target.value)}
                  disabled={!isEditing}
                  placeholder={(field as any).placeholder || `Enter ${field.label.toLowerCase()}`}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: isEditing ? 'var(--color-primary)' : 'var(--color-background)',
                    color: 'var(--color-text)'
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {projectData && (
          <div style={{ 
            marginTop: 24, 
            padding: '1rem', 
            background: 'var(--color-background)', 
            borderRadius: 8,
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              <div>Created: {new Date(projectData.created_at).toLocaleDateString()}</div>
              <div>Last Updated: {new Date(projectData.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
