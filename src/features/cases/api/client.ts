import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

api.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (
      payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      payload.success === false
    ) {
      const msg =
        typeof payload.message === 'string' ? payload.message : '请求失败'
      return Promise.reject(new Error(msg))
    }
    return response
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    if (error.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }
    const serverMsg = error?.response?.data?.message
    if (typeof serverMsg === 'string' && serverMsg) {
      return Promise.reject(new Error(serverMsg))
    }
    return Promise.reject(error)
  }
)

export interface Case {
  case_id: number
  vessel_name: string | null
  invoice_number: string | null
  order_number: string | null
  case_inquiry_keyword: string | null
  case_progress: string | null
  case_urgent: string | null
  case_inquiry_type: string | null
  case_inquiry_date: string | null
  case_follow_date: string | null
  case_uptodate_date: string | null
  case_should_handle_today: string | null
  owner_following: string | null
  shipyard_business: string | null
  case_agent: string | null
  case_superintendent: string | null
  case_surveyor: string | null
  case_delivery_or_service_incharge: string | null
  case_delivery_or_service_deadline: string | null
  case_eta_cargo_ready_date: string | null
  case_etb_cargo_departure_date: string | null
  case_etd_cargo_delivery_date: string | null
  vessel_position: string | null
  case_settlement_done: string | null
  case_epd: string | null
  case_spd: string | null
  case_incharge: string | null
  case_memo_name: string | null
  case_memo_address: string | null
  case_rank: string | null
}

export interface CaseDictEntry {
  dict_id: number
  dict_group: string | null
  dict_value: string | null
  dict_value_remark: string | null
  dict_key: string | number | null
}

export interface CaseGroupsResponse {
  vesselNames: string[]
  invoiceNumbers: string[]
  orderNumbers: string[]
  caseProgresses: string[]
  caseInquiryTypes: string[]
  caseInCharges: string[]
  caseRanks: string[]
  progressDict: CaseDictEntry[]
  urgentDict: CaseDictEntry[]
  inquiryTypeDict: CaseDictEntry[]
  inchargeDict: CaseDictEntry[]
  rankDict: CaseDictEntry[]
  handleTodayDict: CaseDictEntry[]
  vesselPositionDict: CaseDictEntry[]
}

export interface PaginatedResponse {
  rows: Case[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchCaseAll(): Promise<Case[]> {
  const res = await api.get<ApiEnvelope<Case[]>>('/case-list/all')
  return res.data.data ?? []
}

export async function fetchCaseDetail(caseId: number): Promise<Case | null> {
  try {
    const res = await api.get<ApiEnvelope<Case>>(`/case-list/${caseId}`)
    return res.data.data ?? null
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export async function fetchCasePaginated(params: {
  page?: number
  pageSize?: number
  vesselName?: string
  invoiceNumber?: string
  orderNumber?: string
  caseProgress?: string
  caseInquiryType?: string
  caseIncharge?: string
  caseRank?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/case-list/', {
    params,
  })
  return (
    res.data.data ?? {
      rows: [],
      total: 0,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
    }
  )
}

export async function fetchCaseGroups(): Promise<CaseGroupsResponse> {
  const res =
    await api.get<ApiEnvelope<CaseGroupsResponse>>('/case-list/groups')
  return (
    res.data.data ?? {
      vesselNames: [],
      invoiceNumbers: [],
      orderNumbers: [],
      caseProgresses: [],
      caseInquiryTypes: [],
      caseInCharges: [],
      caseRanks: [],
      progressDict: [],
      urgentDict: [],
      inquiryTypeDict: [],
      inchargeDict: [],
      rankDict: [],
      handleTodayDict: [],
      vesselPositionDict: [],
    }
  )
}

export async function createCase(payload: {
  vessel_name?: string | null
  invoice_number?: string | null
  order_number?: string | null
  case_inquiry_keyword?: string | null
  case_progress?: string | null
  case_urgent?: string | null
  case_inquiry_type?: string | null
  case_inquiry_date?: string | null
  case_follow_date?: string | null
  case_uptodate_date?: string | null
  case_should_handle_today?: string | null
  owner_following?: string | null
  shipyard_business?: string | null
  case_agent?: string | null
  case_superintendent?: string | null
  case_surveyor?: string | null
  case_delivery_or_service_incharge?: string | null
  case_delivery_or_service_deadline?: string | null
  case_eta_cargo_ready_date?: string | null
  case_etb_cargo_departure_date?: string | null
  case_etd_cargo_delivery_date?: string | null
  vessel_position?: string | null
  case_settlement_done?: string | null
  case_epd?: string | null
  case_spd?: string | null
  case_incharge?: string | null
  case_memo_name?: string | null
  case_memo_address?: string | null
  case_rank?: string | null
}): Promise<Case> {
  const res = await api.post<ApiEnvelope<Case>>('/case-list/', payload)
  return res.data.data
}

export async function updateCase(
  caseId: number,
  payload: {
    vessel_name?: string | null
    invoice_number?: string | null
    order_number?: string | null
    case_inquiry_keyword?: string | null
    case_progress?: string | null
    case_urgent?: string | null
    case_inquiry_type?: string | null
    case_inquiry_date?: string | null
    case_follow_date?: string | null
    case_uptodate_date?: string | null
    case_should_handle_today?: string | null
    owner_following?: string | null
    shipyard_business?: string | null
    case_agent?: string | null
    case_superintendent?: string | null
    case_surveyor?: string | null
    case_delivery_or_service_incharge?: string | null
    case_delivery_or_service_deadline?: string | null
    case_eta_cargo_ready_date?: string | null
    case_etb_cargo_departure_date?: string | null
    case_etd_cargo_delivery_date?: string | null
    vessel_position?: string | null
    case_settlement_done?: string | null
    case_epd?: string | null
    case_spd?: string | null
    case_incharge?: string | null
    case_memo_name?: string | null
    case_memo_address?: string | null
    case_rank?: string | null
  }
): Promise<Case> {
  const res = await api.put<ApiEnvelope<Case>>(`/case-list/${caseId}`, payload)
  return res.data.data
}

export async function deleteCase(caseId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/case-list/${caseId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteCaseBulk(caseIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/case-list/bulk-delete',
    { ids: caseIds }
  )
  return res.data.data.deleted
}
