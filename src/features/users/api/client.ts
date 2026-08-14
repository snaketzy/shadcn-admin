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
  vessel_fleet_manager: string | null
}

export interface VesselDictEntry {
  dict_key: string
  dict_value: string
}

export interface VesselGroupsResponse {
  teams: string[]
  flags: string[]
  classes: string[]
  inchargeDict: VesselDictEntry[]
  fleetManagerDict: VesselDictEntry[]
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
  vesselFleetManager?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/vessel-list/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 50 }
  )
}

export async function fetchVesselGroups(): Promise<VesselGroupsResponse> {
  const res = await api.get<ApiEnvelope<VesselGroupsResponse>>('/vessel-list/groups')
  return res.data.data ?? { teams: [], flags: [], classes: [], inchargeDict: [], fleetManagerDict: [] }
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
  vessel_fleet_manager?: string | null
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
    vessel_fleet_manager?: string | null
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
