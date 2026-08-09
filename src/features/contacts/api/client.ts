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

export interface Contact {
  contact_id: number
  contact_name: string
  contact_mobile: string | null
  contact_email: string | null
  contact_type: string | null
  contact_rank: string | null
  contact_division_type: string | null
  contact_division_id: string | null
  contact_remark: string | null
}

export interface ContactGroupsResponse {
  names: string[]
  types: string[]
  ranks: string[]
  divisionTypes: string[]
  typeDict: ContactDictEntry[]
  divisionDict: ContactDictEntry[]
}

export interface ContactDictEntry {
  dict_key: string
  dict_value: string
}

export interface DivisionSupplierRow {
  supplier_id: number
  supplier_name: string
  supplier_shortname: string | null
  supplier_field: string | null
  supplier_advantage: string | null
  supplier_contact_name: string | null
}

export interface DivisionCollaborationRow {
  collaboration_id: number
  collaboration_name: string
  collaboration_shortname: string | null
}

export interface PaginatedResponse {
  rows: Contact[]
  total: number
  page: number
  pageSize: number
}

export interface ContactGroupsResponse {
  names: string[]
  types: string[]
  ranks: string[]
  divisionTypes: string[]
  typeDict: ContactDictEntry[]
  divisionDict: ContactDictEntry[]
  supplierFieldDict: ContactDictEntry[]
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export async function fetchContactAll(): Promise<Contact[]> {
  const res = await api.get<ApiEnvelope<Contact[]>>('/contact-list/all')
  return res.data.data ?? []
}

export async function fetchContactPaginated(params: {
  page?: number
  pageSize?: number
  contactName?: string
  contactType?: string
  contactSearch?: string
}): Promise<PaginatedResponse> {
  const res = await api.get<ApiEnvelope<PaginatedResponse>>('/contact-list/', {
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

export async function fetchContactGroups(): Promise<ContactGroupsResponse> {
  const res = await api.get<ApiEnvelope<ContactGroupsResponse>>(
    '/contact-list/groups'
  )
  return (
    res.data.data ?? {
      names: [],
      types: [],
      ranks: [],
      divisionTypes: [],
      typeDict: [],
      divisionDict: [],
      supplierFieldDict: [],
    }
  )
}

export async function createContact(payload: {
  contact_name: string
  contact_mobile?: string | null
  contact_email?: string | null
  contact_type?: string | null
  contact_rank?: string | null
  contact_division_type?: string | null
  contact_division_id?: string | null
  contact_remark?: string | null
}): Promise<Contact> {
  const res = await api.post<ApiEnvelope<Contact>>('/contact-list/', payload)
  return res.data.data
}

export async function updateContact(
  contactId: number,
  payload: {
    contact_name?: string
    contact_mobile?: string | null
    contact_email?: string | null
    contact_type?: string | null
    contact_rank?: string | null
    contact_division_type?: string | null
    contact_division_id?: string | null
    contact_remark?: string | null
  }
): Promise<Contact> {
  const res = await api.put<ApiEnvelope<Contact>>(
    `/contact-list/${contactId}`,
    payload
  )
  return res.data.data
}

export async function deleteContact(contactId: number): Promise<boolean> {
  const res = await api.delete<ApiEnvelope<{ deleted: number }>>(
    `/contact-list/${contactId}`
  )
  return res.data.success && res.data.data.deleted > 0
}

export async function deleteContactBulk(contactIds: number[]): Promise<number> {
  const res = await api.post<ApiEnvelope<{ deleted: number }>>(
    '/contact-list/bulk-delete',
    { ids: contactIds }
  )
  return res.data.data.deleted
}

export async function fetchDivisionSuppliers(): Promise<DivisionSupplierRow[]> {
  const res =
    await api.get<ApiEnvelope<DivisionSupplierRow[]>>('/supplier-list/all')
  return res.data.data ?? []
}

export async function fetchDivisionCollaborations(): Promise<
  DivisionCollaborationRow[]
> {
  const res = await api.get<ApiEnvelope<DivisionCollaborationRow[]>>(
    '/collaboration-list/all'
  )
  return res.data.data ?? []
}
