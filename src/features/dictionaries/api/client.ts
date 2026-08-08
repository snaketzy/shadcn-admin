import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface CaseDict {
  dict_id: number
  dict_group: string
  dict_value: string
  dict_key: string
}

export interface PaginatedResponse {
  rows: CaseDict[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchCaseDictAll(): Promise<CaseDict[]> {
  const res = await api.get<ApiEnvelope<CaseDict[]>>('/case-dict/all')
  return res.data.data ?? []
}

export async function fetchCaseDictPaginated(params: {
  page?: number
  pageSize?: number
  dictGroup?: string
  dictKey?: string
  dictValue?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/case-dict/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 }
  )
}

export async function fetchCaseDictGroups(): Promise<string[]> {
  const res = await api.get<ApiEnvelope<string[]>>('/case-dict/groups')
  return res.data.data ?? []
}

export async function createCaseDict(payload: {
  dict_group: string
  dict_value: string
  dict_key: string
}): Promise<CaseDict> {
  const res = await api.post<ApiEnvelope<CaseDict>>('/case-dict/', payload)
  return res.data.data
}

export async function updateCaseDict(
  dictId: number,
  payload: {
    dict_group: string
    dict_value: string
    dict_key: string
  }
): Promise<CaseDict> {
  const res = await api.put<ApiEnvelope<CaseDict>>(`/case-dict/${dictId}`, payload)
  return res.data.data
}

export async function deleteCaseDict(dictId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/case-dict/${dictId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteCaseDictBulk(dictIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/case-dict/bulk-delete',
    { ids: dictIds }
  )
  return res.data.data.deleted
}
