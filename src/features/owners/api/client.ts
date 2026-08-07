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

export interface Owner {
  owner_id: number
  owner_name: string
  owner_email: string | null
  owner_phone: string | null
  owner_team: string | null
  owner_department: string | null
  owner_department_email: string | null
  owner_rank: string | null
}

export interface OwnerGroupsResponse {
  teams: string[]
  departments: string[]
  ranks: string[]
}

export interface PaginatedResponse {
  rows: Owner[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchOwnerAll(): Promise<Owner[]> {
  const res = await api.get<ApiEnvelope<Owner[]>>('/owner-list/all')
  return res.data.data ?? []
}

export async function fetchOwnerPaginated(params: {
  page?: number
  pageSize?: number
  ownerName?: string
  ownerTeam?: string
  ownerDepartment?: string
  ownerRank?: string
  ownerEmail?: string
  ownerPhone?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/owner-list/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 }
  )
}

export async function fetchOwnerGroups(): Promise<OwnerGroupsResponse> {
  const res = await api.get<ApiEnvelope<OwnerGroupsResponse>>('/owner-list/groups')
  return res.data.data ?? { teams: [], departments: [], ranks: [] }
}

export async function createOwner(payload: {
  owner_name: string
  owner_email?: string | null
  owner_phone?: string | null
  owner_team?: string | null
  owner_department?: string | null
  owner_department_email?: string | null
  owner_rank?: string | null
}): Promise<Owner> {
  const res = await api.post<ApiEnvelope<Owner>>('/owner-list/', payload)
  return res.data.data
}

export async function updateOwner(
  ownerId: number,
  payload: {
    owner_name?: string
    owner_email?: string | null
    owner_phone?: string | null
    owner_team?: string | null
    owner_department?: string | null
    owner_department_email?: string | null
    owner_rank?: string | null
  }
): Promise<Owner> {
  const res = await api.put<ApiEnvelope<Owner>>(`/owner-list/${ownerId}`, payload)
  return res.data.data
}

export async function deleteOwner(ownerId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/owner-list/${ownerId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteOwnerBulk(ownerIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/owner-list/bulk-delete',
    { ids: ownerIds }
  )
  return res.data.data.deleted
}
