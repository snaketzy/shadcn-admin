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

export interface Supplier {
  supplier_id: number
  supplier_name: string
  supplier_shortname: string | null
  supplier_address: string | null
  supplier_field: string | null
  supplier_advantage: string | null
  supplier_contact_name: string | null
  supplier_contact_phone: string | null
  supplier_contact_email: string | null
  supplier_remark: string | null
}

export interface SupplierDictEntry {
  dict_key: string
  dict_value: string
}

export interface SupplierGroupsResponse {
  shortnames: string[]
  fields: string[]
  advantages: string[]
  fieldDict: SupplierDictEntry[]
}

export interface PaginatedResponse {
  rows: Supplier[]
  total: number
  page: number
  pageSize: number
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchSupplierAll(): Promise<Supplier[]> {
  const res = await api.get<ApiEnvelope<Supplier[]>>('/supplier-list/all')
  return res.data.data ?? []
}

export async function fetchSupplierPaginated(params: {
  page?: number
  pageSize?: number
  supplierName?: string
  supplierShortname?: string
  supplierField?: string
  supplierAdvantage?: string
  contactSearch?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/supplier-list/', {
    params,
  })
  return (
    res.data.data ?? { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 }
  )
}

export async function fetchSupplierGroups(): Promise<SupplierGroupsResponse> {
  const res = await api.get<ApiEnvelope<SupplierGroupsResponse>>('/supplier-list/groups')
  return res.data.data ?? { shortnames: [], fields: [], advantages: [], fieldDict: [] }
}

export async function createSupplier(payload: {
  supplier_name: string
  supplier_shortname?: string | null
  supplier_address?: string | null
  supplier_field?: string | null
  supplier_advantage?: string | null
  supplier_contact_name?: string | null
  supplier_contact_phone?: string | null
  supplier_contact_email?: string | null
  supplier_remark?: string | null
}): Promise<Supplier> {
  const res = await api.post<ApiEnvelope<Supplier>>('/supplier-list/', payload)
  return res.data.data
}

export async function updateSupplier(
  supplierId: number,
  payload: {
    supplier_name?: string
    supplier_shortname?: string | null
    supplier_address?: string | null
    supplier_field?: string | null
    supplier_advantage?: string | null
    supplier_contact_name?: string | null
    supplier_contact_phone?: string | null
    supplier_contact_email?: string | null
    supplier_remark?: string | null
  }
): Promise<Supplier> {
  const res = await api.put<ApiEnvelope<Supplier>>(`/supplier-list/${supplierId}`, payload)
  return res.data.data
}

export async function deleteSupplier(supplierId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/supplier-list/${supplierId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteSupplierBulk(supplierIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/supplier-list/bulk-delete',
    { ids: supplierIds }
  )
  return res.data.data.deleted
}
