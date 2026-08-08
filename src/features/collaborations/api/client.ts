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

export interface CollaborationDictEntry {
  dict_key: string
  dict_value: string
}

export interface Collaboration {
  collaboration_id: number
  collaboration_name: string
  collaboration_shortname: string | null
  collaboration_address: string | null
  collaboration_field: string | null
  collaboration_contact_id: number | null
  collaboration_remark: string | null
}

export interface CollaborationGroupsResponse {
  shortnames: string[]
  names: string[]
  fields: string[]
  fieldDict: CollaborationDictEntry[]
}

export interface PaginatedResponse {
  rows: Collaboration[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchCollaborationAll(): Promise<Collaboration[]> {
  const res = await api.get<ApiEnvelope<Collaboration[]>>('/collaboration-list/all')
  return res.data.data ?? []
}

export async function fetchCollaborationPaginated(params: {
  page?: number
  pageSize?: number
  collaborationName?: string
  collaborationShortname?: string
  collaborationField?: string
  contactId?: number
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/collaboration-list/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 }
  )
}

export async function fetchCollaborationGroups(): Promise<CollaborationGroupsResponse> {
  const res = await api.get<ApiEnvelope<CollaborationGroupsResponse>>('/collaboration-list/groups')
  return res.data.data ?? { shortnames: [], names: [], fields: [], fieldDict: [] }
}

export async function createCollaboration(payload: {
  collaboration_name: string
  collaboration_shortname?: string | null
  collaboration_address?: string | null
  collaboration_field?: string | null
  collaboration_contact_id?: number | null
  collaboration_remark?: string | null
}): Promise<Collaboration> {
  const res = await api.post<ApiEnvelope<Collaboration>>('/collaboration-list/', payload)
  return res.data.data
}

export async function updateCollaboration(
  collaborationId: number,
  payload: {
    collaboration_name?: string
    collaboration_shortname?: string | null
    collaboration_address?: string | null
    collaboration_field?: string | null
    collaboration_contact_id?: number | null
    collaboration_remark?: string | null
  }
): Promise<Collaboration> {
  const res = await api.put<ApiEnvelope<Collaboration>>(`/collaboration-list/${collaborationId}`, payload)
  return res.data.data
}

export async function deleteCollaboration(collaborationId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/collaboration-list/${collaborationId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteCollaborationBulk(collaborationIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/collaboration-list/bulk-delete',
    { ids: collaborationIds }
  )
  return res.data.data.deleted
}
