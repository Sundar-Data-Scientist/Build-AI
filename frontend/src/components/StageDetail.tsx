import { useEffect, useState } from 'react'

type StageDetailProps = {
  stageNumber: number
  stageName: string
  onBack: () => void
  projectName?: string
  userEmail?: string
}

type DeliveryPoint = {
  id: number
  title: string
  description: string
  status: 'mandatory' | 'optional'
  completion: 'completed' | 'partial' | 'pending' | 'not-applicable'
  completionText?: string
  approvals: {
    role: string
    status: 'approved' | 'pending'
    approver?: string
    date?: string
  }[]
  responsibilities: {
    role: string
    status: 'completed' | 'pending'
  }[]
  filesCount?: number
  commentsCount?: number
}

export default function StageDetail({ stageNumber, stageName, onBack, projectName, userEmail: injectedEmail }: StageDetailProps) {
  const [stageFiles, setStageFiles] = useState<{ id: number; originalName: string; size: number; storedName: string; createdAt?: string }[]>([])
  const [filesLoading, setFilesLoading] = useState<boolean>(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const userEmail = injectedEmail || ""
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
  const [dpFiles, setDpFiles] = useState<Record<number, { id: number; originalName: string; size: number; storedName: string; createdAt?: string }[]>>({})
  const [dpLoading, setDpLoading] = useState<Record<number, boolean>>({})
  const [dpError, setDpError] = useState<Record<number, string | null>>({})
  const [dpUploading, setDpUploading] = useState<Record<number, boolean>>({})

  const loadFilesForDp = async (dpId: number) => {
    setDpLoading(prev => ({ ...prev, [dpId]: true }))
    setDpError(prev => ({ ...prev, [dpId]: null }))
    try {
      const params = new URLSearchParams({ stage: String(stageNumber), dpId: String(dpId) })
      if (projectName) params.append('projectName', projectName)
      const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load DP files')
      const data = await res.json()
      setDpFiles(prev => ({ ...prev, [dpId]: Array.isArray(data) ? data : [] }))
    } catch (e: any) {
      setDpError(prev => ({ ...prev, [dpId]: e?.message || 'Failed to load files' }))
    } finally {
      setDpLoading(prev => ({ ...prev, [dpId]: false }))
    }
  }

  const handleDpUpload = async (dpId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      setDpUploading(prev => ({ ...prev, [dpId]: true }))
      const form = new FormData()
      Array.from(files)
        .filter((f) => ALLOWED_TYPES.includes(f.type) || ALLOWED_EXTENSIONS.some(ext => (f.name || '').toLowerCase().endsWith(ext)))
        .forEach((f) => form.append('files', f))
      const params = new URLSearchParams({ stage: String(stageNumber), dpId: String(dpId) })
      if (projectName) params.append('projectName', projectName)
      if (userEmail) params.append('userEmail', userEmail)
      const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      await loadFilesForDp(dpId)
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('protocol-uploaded', { detail: { stage: stageNumber, projectName } }))
        }
      } catch {}
    } catch (e) {
      alert('Failed to upload files')
    } finally {
      setDpUploading(prev => ({ ...prev, [dpId]: false }))
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setFilesLoading(true)
      setFilesError(null)
      try {
        const params = new URLSearchParams({ stage: String(stageNumber) })
        if (projectName) params.append('projectName', projectName)
        const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Failed to load files')
        const data = await res.json()
        setStageFiles(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (e.name !== 'AbortError') setFilesError(e?.message || 'Failed to load files')
      } finally {
        setFilesLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [stageNumber, projectName])

  const deliveryPointsStage1: DeliveryPoint[] = [
    {
      id: 1,
      title: 'Contract Drawings',
      description: 'Contract drawings include Structural, Architectural, Civil, Electrical, Landscape, Plumbing, and other relevant drawings. Where applicable, Joist Coordination Drawings shall also be provided. Mainly, Architectural and Structural drawings are supplied.',
      status: 'mandatory',
      completion: 'partial',
      completionText: 'Partially Completed (1/3)',
      approvals: [
      ],
      responsibilities: [
        { role: 'Project Manager', status: 'completed' },
        { role: 'Project Coordinator', status: 'pending' },

      ],

      commentsCount: 0
    },
    {
      id: 2,
      title: 'Scope of work, Project Specifications & Turn over documents',
      description: 'Prepare the Master Contract Drawing Log based on the available drawings.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ],
      commentsCount: 0
    },
    {
      id: 3,
      title: 'Detailing standards and format',
      description: 'Define the project Scope of Work, covering all tasks and responsibilities.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [
      ],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },

      ],
      commentsCount: 0
    },
    {
      id: 4,
      title: 'Customer sample templates or drawings size',
      description: 'Provide Project Specifications and Turnover Documents with all technical requirements and final deliverables.',
      status: 'mandatory',
      completion: 'not-applicable',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ],
      commentsCount: 0
    },
    {
      id: 5,
      title: 'Design calculations, Connection sketch\'s',
      description: 'Coordinate with the client to confirm detailing standards and formats for RFIs, ABMs, MOLs and MCNs.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' }
      ],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ],
      commentsCount: 0
    },
    {
    id: 6,
    title: 'Design calculations, Connection sketch\'s',
    description: 'Obtain customer-provided sample templates or drawing sizes for Anchor Bolt Plans & Details, Assembly Details for Main Steel & Miscellaneous, Part Details, and Erection Plans.',
    status: 'mandatory',
    completion: 'pending',
    approvals: [
      { role: 'Project Manager', status: 'pending' },
      { role: 'Project Coordinator', status: 'pending' }
    ],
    responsibilities: [
      { role: 'Project Manager', status: 'pending' },
      { role: 'Project Coordinator', status: 'pending' },
    ],
    commentsCount: 0
  },
  {
    id: 7,
    title: 'Design calculations, Connection sketch\'s',
    description: 'Collect design calculations and connection sketches from the customer, where applicable.',
    status: 'mandatory',
    completion: 'pending',
    approvals: [
      { role: 'Project Manager', status: 'pending' },
      { role: 'Project Coordinator', status: 'pending' }
    ],
    responsibilities: [
      { role: 'Project Manager', status: 'pending' },
      { role: 'Project Coordinator', status: 'pending' },
    ],
    commentsCount: 0
  }
  ]

  // Stage 2: Pre‑Detailing Meeting (generic placeholders matching the visible format)
  const deliveryPointsStage2: DeliveryPoint[] = [
    {
      id: 8,
      title: 'Create project tree',
      description: 'Create project tree structure.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' }
      ]
    },
    {
      id: 9,
      title: 'Project startup meeting',
      description: 'Conduct a project startup meeting to understand the nuances of the project before the pre-detailing meeting. This review should also address the availability of all required documents.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [ { role: 'PM', status: 'pending' } ],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' }, 
        { role: 'Project Coordinator', status: 'pending' } ]
    },
    {
      id: 10,
      title: 'Send pre‑detailing form',
      description: 'Send the Pre-Detailing meeting form to the customer a couple of days in advance. During the meeting, focus should be on the drawings rather than the format.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
      ]
    },
    {
      id:11,
      title: 'To study contract drawings thoroughly',
      description: 'Stuctural & Architectural drawings and also customer standards/ sample drawing to understand representation and comply with customer expectations to match their workflow and practices. Eg. (Drawing Size Issued to shop and field).',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Editor', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 10,
      title: 'Extract general notes',
      description: 'Extracts of contact drawings \ General notes to be prepared.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' }, { role: 'Project Coordinator', status: 'pending' } ]
    },
    {
      id: 11,
      title: 'Review scope/specs/turnover/standards',
      description: 'To go through with Scope of work , Turn over documents , Project specification and Detailing standards of customer requirements.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' }, 
        ]
    },
    {
      id: 12,
      title: 'Create detailing status report (DSR)',
      description: 'Prepare DSR to track items across plans and elevations for reporting.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Coordinator', status: 'pending' } ]
    },
    {
      id: 13,
      title: 'Check scope/specs/turnover/standards',
      description: 'To check scope of work, line items inclusions & the same to be marked in contract drawings with respect to Foundation plan, Framing plans, Roof framing Plan, Elevation & Section Detail drawings.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 14,
      title: 'Pre-Detailing documents',
      description: 'Specific attention to finish and also to include in Pre-Detailing documents about slots, hole diameter, over sized holes for galavanized items.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },

      ]
    },
    {
      id: 15,
      title: 'Checklist & clarifications',
      description: 'To fill Pre-Detailing check list & to be discussed with Project Managers. Topics to be discussed for Schedules, filling Pre-Detailing check list in accordance with the Client & clearing of all critical information on the project.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 16,
      title: 'Review scope/specs/turnover/standards',
      description: 'Any questions or clarifications if required to be marked on contract drawings and to be discussed in Pre-Detailing meeting.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 17,
      title: 'Minutes of meeting',
      description: 'To send minutes of meeting through email with Pre-Detailing meeting check list to the Client after completion of meeting.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    }
  ]

  // Stage 3: RFI workflow (generic, aligns with screenshot format)
  const deliveryPointsStage3: DeliveryPoint[] = [
    {
      id: 18,
      title: 'Clarify open questions',
      description: 'After studying the Contract drawings thoroughly, any doubts or questions to be asked as RFIs.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 19,
      title: 'Organize RFIs by discipline',
      description: 'RFIs to be raised in a systematical order  starting from Foundation, Embed and then Main steel & Miscellaneous level wise.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },

      ]
    },
    {
      id: 20,
      title: 'Draft primary RFI topics',
      description: 'Capture typical topics (e.g., footing tops, missing grid/points, drawing conflicts, anchor bolt items, profiles/spacing/openings, connection issues).',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },

      ]
    },
    {
      id: 21,
      title: 'One question per RFI',
      description: 'Ensure each RFI contains a single point or question to aid faster resolution.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
       ]
    },
    {
      id: 22,
      title: 'Maintain RFI log & update DSR',
      description: 'Create and maintain the RFI register, updating the detailing status report accordingly.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 23,
      title: 'Track responses and follow‑ups',
      description: 'Target responses within 4–5 days; if pending, follow up regularly until closed.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 24,
      title: 'Escalate partial answers',
      description: 'Escalate partially addressed RFIs that could impact schedules; notify the customer promptly.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    },
    {
      id: 25,
      title: 'Critical issue call',
      description: 'For critical RFIs, initiate a call to resolve issues quickly and document outcomes.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Checker', status: 'pending' },
        { role: 'Project Manager', status: 'pending' },
      ]
    },
    {
      id: 26,
      title: 'Weekly RFI hygiene',
      description: 'Keep the RFI log current and review status weekly to ensure progress.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    }
  ]

  // Stage 4: Modeling & ABM prep (generic, mirrors screenshot structure)
  const deliveryPointsStage4: DeliveryPoint[] = [
    {
      id: 27,
      title: 'Fill specification data & set grids',
      description: 'Enter project specification data and proceed with grid placements as per structural drawings.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Modeler', status: 'pending' } ]
    },
    {
      id: 28,
      title: 'Member placements only',
      description: 'Place members according to plan and avoid applying connections at this stage.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Modeler', status: 'pending' } ]
    },
    {
      id: 29,
      title: 'Prepare breakup plan',
      description: 'Prepare breakup plan with one‑day allowance in hand and perform progressive review of plan.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
      ]
    },
    {
      id: 30,
      title: 'Check templates & reports using mini model',
      description: 'Validate all templates and reports with a mini model before full run.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
      ]
    },
    {
      id: 31,
      title: 'Sequencing as per client requirement',
      description: 'Sequence the project deliverables per client sequence plan and priorities.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        
      ]
    },
    {
      id: 32,
      title: 'Maintain ABM as separate model',
      description: 'Create and maintain the ABM model as a separate controlled model.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
      ]
    },
    {
      id: 33,
      title: 'Generate ABM / MOL',
      description: 'Generate ABM or MOL as per customer requirement and verify for completeness.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
      ]
    },
    {
      id: 34,
      title: 'ABM and AB for IFA',
      description: 'Prepare ABM and Anchor Bolt drawings for Issued‑For‑Approval (IFA).',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 35,
      title: 'Revise on contract changes',
      description: 'If revised contract drawings are received after ABM is sent, revise ABM / MCN as needed.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 36,
      title: 'Invoicing advice after shipment',
      description: 'Provide invoicing advice after shipment for billing closure.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    }
  ]

  // Stage 5: GA/connection checks, QA and production readiness (generic)
  const deliveryPointsStage5: DeliveryPoint[] = [
    {
      id: 37,
      title: 'Mark uncommon/special items in samples',
      description: 'Highlight uncommon or special details in customer sample drawings; raise questions or send samples for review before approvals.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 38,
      title: 'Create general arrangement drawings (GAs)',
      description: 'Prepare GAs for the remaining building areas as the model progresses.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 39,
      title: 'Scope coverage check',
      description: 'Verify that the modeled scope covers all client requirements and deliverables.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 40,
      title: 'Create connection matrix',
      description: 'Prepare a connection matrix to standardize typical connections and references.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Coordinator', status: 'pending' } ]
    },
    {
      id: 41,
      title: 'Create macros for typical connections',
      description: 'Build macros for project typical connections as a quality assurance measure.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
      ]
    },
    {
      id: 42,
      title: 'WIP model checks and backups',
      description: 'Check the WIP model and maintain daily backups to safeguard progress.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
      ]
    },
    {
      id: 43,
      title: 'Prepare IFA sample drawings',
      description: 'Prepare sample drawings for Issued‑For‑Approval (IFA) production review.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Modeler', status: 'pending' } ]
    },
    {
      id: 44,
      title: 'Plan for production and checking',
      description: 'Plan production sequence and allocate checking responsibilities prior to release.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
        
      ]
    },
    {
      id: 45,
      title: 'First‑time‑right principle',
      description: 'Adopt first‑time‑right concept to minimize rework during detailing and checking.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 46,
      title: 'IFC/IFA thoroughness check',
      description: 'Ensure drawings are thorough as if for IFC when sending IFA; perform complete checks.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 47,
      title: 'Approval drawings – include RFI references',
      description: 'Include all required info in approval drawings with respective RFI numbers on erection plans when RFIs are not yet closed.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
      ]
    },
    {
      id: 48,
      title: 'Main steel scope completion check',
      description: 'Confirm main steel scope is complete before moving to miscellaneous or fabrication release.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 49,
      title: 'MAIN STEEL',
      description: 'MAIN STEEL for IFA and then Misc. items will follow.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 50,
      title: 'Send the package',
      description: 'Send the package with Assembly drawings, Erection plan, KSS files Fabtrol reports if applpicable, transmittal, drawing log & shipment note. Some customer requires part  drawing also.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    },
    {
      id: 51,
      title: 'Production clearing',
      description: 'Taking production clearance for every shipment and filling it.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Coordinator', status: 'pending' } ]
    },
    {
      id: 52,
      title: 'Sending Transmittal & updated drawings',
      description: 'Sending Transmittal & updated drawings log with every shipment.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 53,
      title: 'Invoicing advice',
      description: 'Invoicing advice after shipment for billing.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    }
  ]

  // Stage 6: Approval release and BFA handling (generic)
  const deliveryPointsStage6: DeliveryPoint[] = [
    {
      id: 54,
      title: 'On receiving BFA (AB / main steel / misc)',
      description: 'Upon BFA receipt, start approval release workflows for AB, main steel and miscellaneous packages.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 55,
      title: 'Prepare impact / change order report',
      description: 'If BFA comments require design change, prepare impact report or change order notes for billing and scope.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    }
  ]

  // Stage 7: BFA to IFC release planning and checks (generic)
  const deliveryPointsStage7: DeliveryPoint[] = [
    {
      id: 56,
      title: 'Plan for IFC release',
      description: 'Plan timelines for IFC release as specified by the customer and align internal schedule.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 57,
      title: 'Bulk drawing release focus',
      description: 'Focus on releasing drawings in one bulk release when practical to avoid staggered approvals.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 58,
      title: 'Customer confirmation for deviations',
      description: 'If any deviations exist at IFC, obtain customer confirmation prior to release.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 59,
      title: 'IFC checklist – points to consider',
      description: 'Include BFA comments, RFI responses, erection sequence, paint notes, galvanizing first items, fab/NC files, KSS files, shop & field bolt lists; prepare field/plan bolt plans if required.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 60,
      title: 'Post‑release ship mark reference',
      description: 'After releasing all steel members for IFC, send all E‑plans ship mark reference first.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 61,
      title: 'Send full E‑plans set for field',
      description: 'Within ~3 days or a week, send complete E‑plans with required sections for field clarity.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 62,
      title: 'Scope coverage 100% check',
      description: 'Validate that the overall scope items are fully covered prior to closure.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 63,
      title: 'Invoicing advice after shipment',
      description: 'Provide invoicing advice for billing once shipment is complete and documents are released.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    }
  ]
  
  // Stage 8: Impact reports and change orders (generic)
  const deliveryPointsStage8: DeliveryPoint[] = [
    {
      id: 64,
      title: 'Prepare impact report for approval',
      description: 'Create an impact report to obtain customer approval. Include revised contract set, addendums, scope additions, RFI responses, approval comments, field measurements, and field work plans.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 65,
      title: 'Prepare change order when design changes',
      description: 'When design change is called, prepare a change order with the same supporting items as the impact report (revised set, addendums, scope additions, RFIs, approval comments, field measurements, field work plans).',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 66,
      title: 'Submit within client timeline',
      description: 'Ensure impact reports or change orders reach the client within 5 days of change receipt or within the customer-specified time window.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ 
        { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 67,
      title: 'Change order invoicing advice',
      description: 'After completion of work, provide invoicing advice associated with the approved change order for billing.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    }
  ]

  // Stage 9: Detailing Status Report (DSR) weekly process (generic)
  const deliveryPointsStage9: DeliveryPoint[] = [
    {
      id: 68,
      title: 'Maintain weekly DSR',
      description: 'Maintain a weekly Detailing Status Report (DSR) including project name/number and client PM.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 69,
      title: 'Purpose of DSR',
      description: 'Use DSR to initiate action from customer; avoid it being only past information. PM will review the DSR.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Modeler', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 70,
      title: 'Send DSR every Monday',
      description: 'Dispatch the DSR to the respective client every Monday.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    }
  ]

  // Stage 10: Final logs, closure report, backups and printouts (generic)
  const deliveryPointsStage10: DeliveryPoint[] = [
    {
      id: 71,
      title: 'Send final drawing log update',
      description: 'Send the final drawing log updated for AB, embeds, main steel and miscellaneous items with IFC matrix 100%.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },      ]
    },
    {
      id: 72,
      title: 'Send final transmittal log update',
      description: 'Send final transmittal log update with transmittal number, date, counts of assembly drawings, erection plans and part sheets.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Checker', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 73,
      title: 'Drawing status report – project closed',
      description: 'Send the drawing status report mentioning "PROJECT CLOSED" under the highlights section after completion.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    },
    {
      id: 74,
      title: 'Backup all project artifacts',
      description: 'Maintain and take backup of all project related documents, drawings, models and logs.',
      status: 'mandatory',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' } ]
    },
    {
      id: 75,
      title: 'Print IFC latest revisions',
      description: 'Take printouts of all IFC latest revision assembly drawings and erection plans if required for shop or field calls.',
      status: 'optional',
      completion: 'pending',
      approvals: [],
      responsibilities: [ { role: 'Project Manager', status: 'pending' },
        { role: 'Project Coordinator', status: 'pending' },
      ]
    }
  ]

  const deliveryPoints: DeliveryPoint[] =
    stageNumber === 10 ? deliveryPointsStage10 :
    stageNumber === 9 ? deliveryPointsStage9 :
    stageNumber === 8 ? deliveryPointsStage8 :
    stageNumber === 7 ? deliveryPointsStage7 :
    stageNumber === 6 ? deliveryPointsStage6 :
    stageNumber === 5 ? deliveryPointsStage5 :
    stageNumber === 4 ? deliveryPointsStage4 :
    stageNumber === 3 ? deliveryPointsStage3 :
    stageNumber === 2 ? deliveryPointsStage2 :
    deliveryPointsStage1

  // Preload per-DP files so they persist after navigation
  useEffect(() => {
    deliveryPoints.forEach((dp) => {
      loadFilesForDp(dp.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageNumber, projectName])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mandatory': return '#ef4444'
      case 'partial': return '#f59e0b'
      case 'completed': return '#10b981'
      case 'pending': return '#eab308'
      case 'not-applicable': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅'
      case 'completed': return '✅'
      case 'pending': return '🕐'
      default: return '⏳'
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Stage Detail</div>
          <h1 style={{ margin: 0 }}>Stage {stageNumber}: {stageName}</h1>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>0/5 items completed</span>
            <span style={{
              padding: '0.25rem 0.75rem',
              background: '#3b82f6',
              color: 'white',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500
            }}>
              In Progress
            </span>
          </div>
        </div>
        <button 
          onClick={onBack}
          style={{ 
            padding: '0.5rem 1rem', 
            background: 'transparent', 
            border: '1px solid var(--color-border)', 
            color: 'var(--color-text)', 
            borderRadius: 8 
          }}
        >
          ← Back to Protocols
        </button>
      </header>

      
      {/* Delivery Points */}
      <div style={{ display: 'grid', gap: 16 }}>
        {deliveryPoints.map((dp) => (
          <div key={dp.id} style={{
            background: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            {/* DP Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>DP:{dp.id}</h3>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: getStatusColor(dp.status),
                    color: 'white',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {dp.status === 'mandatory' ? 'Mandatory' : 'Optional'}
                  </span>
                  {dp.completionText && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: getStatusColor(dp.completion),
                      color: 'white',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {dp.completionText}
                    </span>
                  )}
                  {dp.completion === 'not-applicable' && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#6b7280',
                      color: 'white',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      Not Applicable
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
                  {dp.description}
                </p>
              </div>

              {/* Responsibilities - Top Right */}
              {dp.responsibilities.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-text)' }}>Responsibilities</h4>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {dp.responsibilities.map((resp, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{getStatusIcon(resp.status)}</span>
                        <span style={{ fontSize: 14 }}>
                          {resp.role} {resp.status === 'pending' ? '(Pending)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Upload section below Responsibilities */}
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--color-text)' }}>Upload Files & Documents</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="file"
                        accept=".pdf,.txt,.json,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg"
                        multiple
                        onChange={(e) => handleDpUpload(dp.id, (e.target as HTMLInputElement).files)}
                        style={{ width: '100%' }}
                      />
                      <button
                        onClick={() => loadFilesForDp(dp.id)}
                        style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 6, whiteSpace: 'nowrap' }}
                      >
                        Refresh
                      </button>
                      {dpUploading[dp.id] && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-muted)' }}>Uploading…</span>
                      )}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {dpLoading[dp.id] ? (
                        <div style={{ color: 'var(--color-muted)' }}>Loading files…</div>
                      ) : dpError[dp.id] ? (
                        <div style={{ color: '#ef4444' }}>{dpError[dp.id]}</div>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                          {(dpFiles[dp.id] || []).map((f) => (
                            <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>📄</span>
                              <span style={{ flex: 1 }}>{f.originalName}</span>
                              <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                              <a href={`http://localhost:8000/api/uploads/${f.id}/download`} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 6, textDecoration: 'none', color: 'var(--color-text)' }}>Download</a>
                            </li>
                          ))}
                          {(dpFiles[dp.id] || []).length === 0 && (
                            <li style={{ color: 'var(--color-muted)', fontSize: 12 }}>No files uploaded yet.</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Approvals Section */}
            {dp.approvals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-text)' }}>
                  Multi-Approval Required ({dp.approvals.filter(a => a.status === 'approved').length}/{dp.approvals.length} approved)
                </h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {dp.approvals.map((approval, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0.5rem',
                      background: 'var(--color-background)',
                      borderRadius: 6
                    }}>
                      <span>{getStatusIcon(approval.status)}</span>
                      <span style={{ fontSize: 14 }}>
                        {approval.role}: {approval.status === 'approved' 
                          ? `Approved by ${approval.approver} on ${approval.date}`
                          : 'Pending approval'
                        }
                      </span>
                      {approval.status === 'approved' && (
                        <button style={{
                          marginLeft: 'auto',
                          padding: '0.25rem 0.5rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {(dp.completion === 'pending' || dp.completion === 'partial' || dp.completion === 'not-applicable') && (
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  Approve
                </button>
              )}
              <button style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 6,
                fontSize: 14
              }}>
                Digital Evidence
              </button>
              <button style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 6,
                fontSize: 14
              }}>
                Comment ({dp.commentsCount || 0})
              </button>
              <button style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 6,
                fontSize: 14
              }}>
                N/A
              </button>
            </div>

            {/* Files & Documents */}
            {dp.filesCount !== undefined && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-text)' }}>Files & Documents</h4>
                <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                  {dp.filesCount} files
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
