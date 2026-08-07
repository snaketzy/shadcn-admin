import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Vessel {
  vessel_id: number
  vessel_name: string
  building_year: string | null
  vessel_imo: number | null
  vessel_loa: string | null
  vessel_breadth: string | null
  vessel_gross: number | null
  vessel_dwt: number | null
  vessel_class: string | null
  vessel_flag: string | null
  vessel_team: string | null
  vessel_incharge: string | null
}

export interface VesselGroupsResponse {
  teams: string[]
  flags: string[]
  classes: string[]
}

export interface PaginatedResponse {
  rows: Vessel[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchVesselAll(): Promise<Vessel[]> {
  const res = await api.get<ApiEnvelope<Vessel[]>>('/vessel-list/all')
  return res.data.data ?? []
}

export async function fetchVesselPaginated(params: {
  page?: number
  pageSize?: number
  vesselName?: string
  vesselTeam?: string
  vesselFlag?: string
  vesselClass?: string
  vesselIncharge?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/vessel-list/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 }
  )
}

export async function fetchVesselGroups(): Promise<VesselGroupsResponse> {
  const res = await api.get<ApiEnvelope<VesselGroupsResponse>>('/vessel-list/groups')
  return res.data.data ?? { teams: [], flags: [], classes: [] }
}

export async function createVessel(payload: {
  vessel_name: string
  building_year?: string | null
  vessel_imo?: number | null
  vessel_loa?: string | null
  vessel_breadth?: string | null
  vessel_gross?: number | null
  vessel_dwt?: number | null
  vessel_class?: string | null
  vessel_flag?: string | null
  vessel_team?: string | null
  vessel_incharge?: string | null
}): Promise<Vessel> {
  const res = await api.post<ApiEnvelope<Vessel>>('/vessel-list/', payload)
  return res.data.data
}

export async function updateVessel(
  vesselId: number,
  payload: {
    vessel_name?: string
    building_year?: string | null
    vessel_imo?: number | null
    vessel_loa?: string | null
    vessel_breadth?: string | null
    vessel_gross?: number | null
    vessel_dwt?: number | null
    vessel_class?: string | null
    vessel_flag?: string | null
    vessel_team?: string | null
    vessel_incharge?: string | null
  }
): Promise<Vessel> {
  const res = await api.put<ApiEnvelope<Vessel>>(`/vessel-list/${vesselId}`, payload)
  return res.data.data
}

export async function deleteVessel(vesselId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/vessel-list/${vesselId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteVesselBulk(vesselIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/vessel-list/bulk-delete',
    { ids: vesselIds }
  )
  return res.data.data.deleted
}
