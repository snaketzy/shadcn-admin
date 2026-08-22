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
  case_personal_register_completed: string | null
  case_business_register_completed: string | null
  case_e_filing_completed: string | null
  case_paper_based_filing_completed: string | null
  case_epd: string | null
  case_spd: string | null
  case_incharge: string | null
  case_memo_name: string | null
  case_memo_address: string | null
  case_inquiry_attachments: string | null
  case_settlement_attachments: string | null
  case_remark: string | null
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
    console.log('[DEBUG fetchCaseDetail caseId=' + caseId + ']', {
      hasCaseInquiryAttachmentsKey:
        res &&
        res.data &&
        typeof res.data === 'object' &&
        res.data.data &&
        typeof res.data.data === 'object' &&
        'case_inquiry_attachments' in (res.data.data as object),
      hasCaseSettlementAttachmentsKey:
        res &&
        res.data &&
        typeof res.data === 'object' &&
        res.data.data &&
        typeof res.data.data === 'object' &&
        'case_settlement_attachments' in (res.data.data as object),
      keys:
        res && res.data && res.data.data && typeof res.data.data === 'object'
          ? Object.keys(res.data.data as Record<string, unknown>).filter((k) =>
              k.includes('attachment')
            )
          : [],
      inquiryValue: (res?.data?.data as any)?.case_inquiry_attachments ?? null,
      settlementValue:
        (res?.data?.data as any)?.case_settlement_attachments ?? null,
    })
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
  case_personal_register_completed?: string | null
  case_business_register_completed?: string | null
  case_e_filing_completed?: string | null
  case_paper_based_filing_completed?: string | null
  case_epd?: string | null
  case_spd?: string | null
  case_incharge?: string | null
  case_memo_name?: string | null
  case_memo_address?: string | null
  case_inquiry_attachments?: CaseMemoAttachment[] | string | null
  case_settlement_attachments?: CaseMemoAttachment[] | string | null
  case_remark?: string | null
  case_rank?: string | null
}): Promise<Case> {
  const body: any = { ...payload }
  ;(
    ['case_inquiry_attachments', 'case_settlement_attachments'] as const
  ).forEach((key) => {
    if (key in body) {
      const raw = body[key]
      if (typeof raw === 'string') {
        body[key] = raw || null
      } else {
        body[key] = stringifyAttachments(
          raw as CaseMemoAttachment[] | null | undefined
        )
      }
    }
  })
  console.log('[DEBUG createCase body]', {
    hasInquiryKey: 'case_inquiry_attachments' in body,
    inquiryValueLen:
      typeof body.case_inquiry_attachments === 'string'
        ? body.case_inquiry_attachments.length
        : null,
    hasSettlementKey: 'case_settlement_attachments' in body,
    settlementValueLen:
      typeof body.case_settlement_attachments === 'string'
        ? body.case_settlement_attachments.length
        : null,
  })
  const res = await api.post<ApiEnvelope<Case>>('/case-list/', body)
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
    case_personal_register_completed?: string | null
    case_business_register_completed?: string | null
    case_e_filing_completed?: string | null
    case_paper_based_filing_completed?: string | null
    case_epd?: string | null
    case_spd?: string | null
    case_incharge?: string | null
    case_memo_name?: string | null
    case_memo_address?: string | null
    case_inquiry_attachments?: CaseMemoAttachment[] | string | null
    case_settlement_attachments?: CaseMemoAttachment[] | string | null
    case_remark?: string | null
    case_rank?: string | null
  }
): Promise<Case> {
  const body: any = { ...payload }
  ;(
    ['case_inquiry_attachments', 'case_settlement_attachments'] as const
  ).forEach((key) => {
    if (key in body) {
      const raw = body[key]
      if (typeof raw === 'string') {
        body[key] = raw || null
      } else {
        body[key] = stringifyAttachments(
          raw as CaseMemoAttachment[] | null | undefined
        )
      }
    }
  })
  console.log('[DEBUG updateCase caseId=' + caseId + ' body]', {
    hasInquiryKey: 'case_inquiry_attachments' in body,
    inquiryValueLen:
      typeof body.case_inquiry_attachments === 'string'
        ? body.case_inquiry_attachments.length
        : null,
    hasSettlementKey: 'case_settlement_attachments' in body,
    settlementValueLen:
      typeof body.case_settlement_attachments === 'string'
        ? body.case_settlement_attachments.length
        : null,
  })
  const res = await api.put<ApiEnvelope<Case>>(`/case-list/${caseId}`, body)
  console.log('[DEBUG updateCase caseId=' + caseId + ' response]', {
    hasInquiryKey:
      res &&
      res.data &&
      res.data.data &&
      typeof res.data.data === 'object' &&
      'case_inquiry_attachments' in (res.data.data as object),
    inquiryValue: (res?.data?.data as any)?.case_inquiry_attachments ?? null,
    hasSettlementKey:
      res &&
      res.data &&
      res.data.data &&
      typeof res.data.data === 'object' &&
      'case_settlement_attachments' in (res.data.data as object),
    settlementValue:
      (res?.data?.data as any)?.case_settlement_attachments ?? null,
  })
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
  data?: string
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

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
const TEXT_EXTS = ['txt', 'csv', 'md']
const PDF_EXT = 'pdf'
const OFFICE_EXTS = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'ods',
  'odp',
  'odt',
  'rtf',
  'wps',
  'et',
  'dps',
  'vsd',
  'vss',
  'vst',
  'pub',
  'mpp',
]

export function getAttachmentExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}
export function isImageAttachment(name: string): boolean {
  return IMAGE_EXTS.includes(getAttachmentExt(name))
}
export function isTextAttachment(name: string): boolean {
  return TEXT_EXTS.includes(getAttachmentExt(name))
}
export function isPdfAttachment(name: string): boolean {
  return getAttachmentExt(name) === PDF_EXT
}
export function isOfficeAttachment(name: string): boolean {
  return OFFICE_EXTS.includes(getAttachmentExt(name))
}
export function isPreviewableAttachment(name: string): boolean {
  return (
    isImageAttachment(name) ||
    isTextAttachment(name) ||
    isPdfAttachment(name) ||
    isOfficeAttachment(name)
  )
}
export function getMsOfficeViewerUrl(url: string): string {
  const absUrl = normalizeAttachmentUrl(url)
  if (!absUrl) return ''
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
    absUrl
  )}`
}
export function getAttachmentPreviewUrl(
  att: CaseMemoAttachment | undefined | null
): string {
  if (!att?.data) return ''
  const normSrc = normalizeAttachmentUrl(att.data)
  if (isOfficeAttachment(att.name)) return getMsOfficeViewerUrl(normSrc)
  return normSrc
}

export function formatAttachmentSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isCosUrl(data: string | undefined | null): boolean {
  if (!data) return false
  return /^https?:\/\//i.test(data)
}

const COS_PUBLIC_DOMAIN = 'www.jvecloud.com'
const COS_ORIGINAL_DOMAIN_RE =
  /^https?:\/\/store-barrel-1387238226\.cos\.[^/]+\.myqcloud\.com\//i

export function normalizeAttachmentUrl(
  data: string | undefined | null
): string {
  if (!data) return ''
  if (!isCosUrl(data)) return data
  try {
    const u = new URL(data)
    let key = u.pathname.replace(/^\//, '')
    if (COS_ORIGINAL_DOMAIN_RE.test(data)) {
      const m = data.match(COS_ORIGINAL_DOMAIN_RE)
      if (m) {
        key = data.slice(m[0].length)
      }
    }
    return `http://${COS_PUBLIC_DOMAIN}/${key}`
  } catch {
    return data
  }
}

function getAttachmentAccessUrl(
  att: CaseMemoAttachment | undefined | null
): string {
  return normalizeAttachmentUrl(att?.data ?? '')
}

async function fetchTextFromUrl(url: string): Promise<string> {
  const res = await fetch(normalizeAttachmentUrl(url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    s += String.fromCharCode.apply(null, Array.from(sub) as any)
  }
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
}

export async function readAttachmentTextContent(
  att: CaseMemoAttachment
): Promise<string> {
  if (!att.data) return ''
  if (isCosUrl(att.data)) {
    return await fetchTextFromUrl(att.data)
  }
  const base64 = att.data.split(',')[1] ?? ''
  if (!base64) return ''
  try {
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return ''
  }
}

export function triggerAttachmentDownload(att: CaseMemoAttachment): void {
  const url = getAttachmentAccessUrl(att)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = att.name
  if (isCosUrl(url)) {
    a.target = '_blank'
    a.rel = 'noopener,noreferrer'
  }
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function openAttachmentInNewTab(att: CaseMemoAttachment): void {
  const url = getAttachmentAccessUrl(att)
  if (!url) return
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) w.focus()
}

export function handleAttachmentQuickAction(att: CaseMemoAttachment): void {
  if (!att.data) return
  if (isPreviewableAttachment(att.name)) {
    openAttachmentInNewTab(att)
  } else {
    triggerAttachmentDownload(att)
  }
}

export function stringifyAttachments(
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

export interface CosUploadInquiryAttachmentResult {
  url: string
  key: string
  name: string
}

export async function uploadInquiryAttachmentToCos(params: {
  file: File
  vesselName?: string | null
  inquiryKeyword?: string | null
  inquiryDate?: string | null
}): Promise<CosUploadInquiryAttachmentResult> {
  const formData = new FormData()
  formData.append('file', params.file)
  if (params.vesselName) formData.append('vessel_name', params.vesselName)
  if (params.inquiryKeyword)
    formData.append('inquiry_keyword', params.inquiryKeyword)
  if (params.inquiryDate) formData.append('inquiry_date', params.inquiryDate)
  const res = await api.post<ApiEnvelope<CosUploadInquiryAttachmentResult>>(
    '/cos/upload-inquiry-attachment',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    }
  )
  return res.data.data
}

export interface CosUploadSettlementAttachmentResult {
  url: string
  key: string
  name: string
}

export async function uploadSettlementAttachmentToCos(params: {
  file: File
  vesselName?: string | null
  inquiryKeyword?: string | null
  inquiryDate?: string | null
}): Promise<CosUploadSettlementAttachmentResult> {
  const formData = new FormData()
  formData.append('file', params.file)
  if (params.vesselName) formData.append('vessel_name', params.vesselName)
  if (params.inquiryKeyword)
    formData.append('inquiry_keyword', params.inquiryKeyword)
  if (params.inquiryDate) formData.append('inquiry_date', params.inquiryDate)
  const res = await api.post<ApiEnvelope<CosUploadSettlementAttachmentResult>>(
    '/cos/upload-settlement-attachment',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    }
  )
  return res.data.data
}
