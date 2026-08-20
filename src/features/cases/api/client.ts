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
  case_superintendent_id?: number | null
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
  inqTypeQDict: CaseDictEntry[]
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
  invoiceNumber?: string | string[]
  orderNumber?: string | string[]
  orderNumberHasValue?: boolean
  serviceProjectActive?: boolean
  caseInquiryKeyword?: string
  caseInquiryDateFrom?: string
  caseInquiryDateTo?: string
  caseProgress?: string | string[]
  caseUrgent?: string | string[]
  caseShouldHandleToday?: string | string[]
  caseInquiryType?: string | string[]
  caseIncharge?: string | string[]
  caseRank?: string | string[]
  vesselPosition?: string | string[]
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/case-list/', {
    params,
    paramsSerializer: {
      indexes: null,
    },
  })
  return (
    res.data.data ?? {
      rows: [],
      total: 0,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
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
      inqTypeQDict: [],
    }
  )
}

export interface KeywordCheckResult {
  exists: boolean
  matchedCaseId?: number
  matchedKeyword?: string
}

export async function fetchCaseInquiryKeywordCheck(params: {
  keyword: string
  excludeCaseId?: number
}): Promise<KeywordCheckResult> {
  const res = await api.get<ApiEnvelope<KeywordCheckResult>>(
    '/case-list/check-keyword',
    { params }
  )
  return (
    res.data.data ?? {
      exists: false,
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
  case_superintendent_id?: number | string | null
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

export interface CaseInquiry {
  inquiry_id: number
  case_id: number
  case_inquiry_division_id: number | null
  case_inquiry_type: string | null
  case_inquired_date: string | null
  remark: string | null
}

function apiRowToCaseInquiry(row: any): CaseInquiry {
  return {
    inquiry_id:
      row.case_inquiry_id != null
        ? Number(row.case_inquiry_id)
        : Number(row.inquiry_id),
    case_id: Number(row.case_id),
    case_inquiry_division_id:
      row.case_inquiry_division_id == null ||
      row.case_inquiry_division_id === ''
        ? null
        : Number(row.case_inquiry_division_id),
    case_inquiry_type:
      row.case_inquiry_type == null || row.case_inquiry_type === ''
        ? null
        : String(row.case_inquiry_type),
    case_inquired_date:
      row.case_inquired_date == null || row.case_inquired_date === ''
        ? null
        : String(row.case_inquired_date).slice(0, 16),
    remark:
      row.case_inquiry_remark != null && row.case_inquiry_remark !== ''
        ? String(row.case_inquiry_remark)
        : row.remark != null && row.remark !== ''
          ? String(row.remark)
          : null,
  }
}

export async function fetchCaseInquiryListByCaseId(
  caseId: number
): Promise<CaseInquiry[]> {
  try {
    const res = await api.get<ApiEnvelope<any[]>>(
      `/case-inquiry-list/by-case/${caseId}`
    )
    const rows = res.data.data ?? []
    return rows.map(apiRowToCaseInquiry)
  } catch (e: any) {
    if (e?.response?.status === 404) return []
    return []
  }
}

export async function fetchCaseInquiryListByCaseIds(
  caseIds: number[]
): Promise<CaseInquiry[]> {
  if (caseIds.length === 0) return []
  try {
    const ids = caseIds
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0)
      .join(',')
    if (!ids) return []
    const res = await api.get<ApiEnvelope<any[]>>(
      `/case-inquiry-list/by-case-ids?ids=${ids}`
    )
    const rows = res.data.data ?? []
    return rows.map(apiRowToCaseInquiry)
  } catch (e: any) {
    if (e?.response?.status === 404) return []
    return []
  }
}

export async function createCaseInquiryBulk(
  rows: Array<{
    case_id: number
    case_inquiry_division_id: number | null
    case_inquiry_type: string | null
    case_inquired_date: string | null
    remark: string | null
  }>
): Promise<number> {
  const res = await api.post<ApiEnvelope<{ inserted: number }>>(
    '/case-inquiry-list/bulk-insert',
    { rows }
  )
  return res.data.data?.inserted ?? 0
}

export async function replaceCaseInquiryByCaseId(args: {
  case_id: number
  rows: Array<{
    case_inquiry_division_id: number | null
    case_inquiry_type: string | null
    case_inquired_date: string | null
    remark: string | null
  }>
}): Promise<{ deleted: number; inserted: number }> {
  const res = await api.post<
    ApiEnvelope<{ deleted: number; inserted: number }>
  >('/case-inquiry-list/replace-by-case', {
    case_id: args.case_id,
    rows: args.rows,
  })
  return {
    deleted: res.data.data?.deleted ?? 0,
    inserted: res.data.data?.inserted ?? 0,
  }
}

export interface CaseMemo {
  case_memo_id: number
  case_id: number
  case_memo_date: string | null
  case_memo_content: string | null
  case_memo_remark: string | null
  case_memo_attachment: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CaseMemoAttachment {
  name: string
  size?: number
  type?: string
}

export function parseAttachments(
  raw: string | null | undefined
): CaseMemoAttachment[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
  } catch {
    return []
  }
}

function stringifyAttachments(
  arr: CaseMemoAttachment[] | undefined | null
): string | null {
  if (!arr || arr.length === 0) return null
  try {
    return JSON.stringify(arr)
  } catch {
    return null
  }
}

export async function fetchCaseMemoListByCaseId(
  caseId: number
): Promise<CaseMemo[]> {
  try {
    const res = await api.get<ApiEnvelope<CaseMemo[]>>(
      `/case-memo-list/by-case/${caseId}`
    )
    return res.data.data ?? []
  } catch (e: any) {
    if (e?.response?.status === 404) return []
    return []
  }
}

export async function fetchCaseMemoListByCaseIds(
  caseIds: number[]
): Promise<CaseMemo[]> {
  if (!caseIds || caseIds.length === 0) return []
  const ids = Array.from(
    new Set(
      caseIds
        .map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0))
        .filter((n): n is number => n > 0)
    )
  )
  if (ids.length === 0) return []
  try {
    const res = await api.get<ApiEnvelope<CaseMemo[]>>(
      `/case-memo-list/by-case-ids?ids=${ids.join(',')}`
    )
    return res.data.data ?? []
  } catch (e: any) {
    if (e?.response?.status === 404) return []
    return []
  }
}

export async function createCaseMemo(payload: {
  case_id: number
  case_memo_date?: string | null
  case_memo_content?: string | null
  case_memo_remark?: string | null
  case_memo_attachment?: CaseMemoAttachment[] | null
}): Promise<CaseMemo> {
  const res = await api.post<ApiEnvelope<CaseMemo>>('/case-memo-list/', {
    case_id: payload.case_id,
    case_memo_date: payload.case_memo_date ?? null,
    case_memo_content: payload.case_memo_content ?? null,
    case_memo_remark: payload.case_memo_remark ?? null,
    case_memo_attachment: stringifyAttachments(payload.case_memo_attachment),
  })
  return res.data.data
}

export async function updateCaseMemo(
  memoId: number,
  payload: {
    case_memo_date?: string | null
    case_memo_content?: string | null
    case_memo_remark?: string | null
    case_memo_attachment?: CaseMemoAttachment[] | null
  }
): Promise<CaseMemo | null> {
  try {
    const res = await api.put<ApiEnvelope<CaseMemo>>(
      `/case-memo-list/${memoId}`,
      {
        case_memo_date: payload.case_memo_date,
        case_memo_content: payload.case_memo_content,
        case_memo_remark: payload.case_memo_remark,
        case_memo_attachment:
          'case_memo_attachment' in payload
            ? stringifyAttachments(payload.case_memo_attachment)
            : undefined,
      }
    )
    return res.data.data ?? null
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export async function deleteCaseMemo(memoId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/case-memo-list/${memoId}`
  )
  return res.data.success && (res.data.data?.deleted ?? 0) > 0
}
