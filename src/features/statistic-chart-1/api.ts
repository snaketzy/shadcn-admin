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

export interface MonthlyStatisticRow {
  month: number
  progressKey: string
  count: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchMonthlyProgressStatistics(params: {
  year?: number
  ownerTeam?: string
}): Promise<MonthlyStatisticRow[]> {
  const search = new URLSearchParams()
  if (params.year != null) search.set('year', String(params.year))
  if (params.ownerTeam != null && params.ownerTeam !== '')
    search.set('ownerTeam', String(params.ownerTeam))
  const qs = search.toString()
  const res = await api.get<ApiEnvelope<MonthlyStatisticRow[]>>(
    '/case-list/monthly-progress-statistics' + (qs ? `?${qs}` : '')
  )
  return res.data.data ?? []
}
