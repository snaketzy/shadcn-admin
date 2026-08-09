import { query, execute, type ExecuteValues } from './db'
import { getCaseDictByKeyPrefix } from './case-dict-service'

export interface ContactListRow {
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

export interface ContactDictEntry {
  dict_key: string
  dict_value: string
}

const SELECT_COLS = `
  contact_id, contact_name, contact_mobile, contact_email,
  contact_type, contact_rank, contact_division_type,
  contact_division_id, contact_remark
`

export async function getAllContactList(): Promise<ContactListRow[]> {
  const rows = await query<ContactListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`contact_list\` ORDER BY contact_name`
  )
  return rows.map(normalizeRow)
}

export async function getContactListById(contactId: number): Promise<ContactListRow | null> {
  const rows = await query<ContactListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`contact_list\` WHERE contact_id = ? LIMIT 1`,
    [contactId]
  )
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function getContactListGroups(): Promise<{
  names: string[]
  types: string[]
  ranks: string[]
  divisionTypes: string[]
  typeDict: ContactDictEntry[]
  divisionDict: ContactDictEntry[]
  supplierFieldDict: ContactDictEntry[]
}> {
  const [
    names,
    types,
    ranks,
    divisionTypes,
    typeRows,
    divisionRows,
    supplierFieldRows,
  ] = await Promise.all([
    query<{ contact_name: string | null }[]>(
      'SELECT DISTINCT contact_name FROM `contact_list` WHERE contact_name IS NOT NULL AND contact_name <> \'\' ORDER BY contact_name'
    ),
    query<{ contact_type: string | null }[]>(
      'SELECT DISTINCT contact_type FROM `contact_list` WHERE contact_type IS NOT NULL AND contact_type <> \'\' ORDER BY contact_type'
    ),
    query<{ contact_rank: string | null }[]>(
      'SELECT DISTINCT contact_rank FROM `contact_list` WHERE contact_rank IS NOT NULL AND contact_rank <> \'\' ORDER BY contact_rank'
    ),
    query<{ contact_division_type: string | null }[]>(
      'SELECT DISTINCT contact_division_type FROM `contact_list` WHERE contact_division_type IS NOT NULL AND contact_division_type <> \'\' ORDER BY contact_division_type'
    ),
    getCaseDictByKeyPrefix('J'),
    getCaseDictByKeyPrefix('K'),
    getCaseDictByKeyPrefix('I'),
  ])
  return {
    names: names.map((r) => r.contact_name!).filter(Boolean),
    types: types.map((r) => r.contact_type!).filter(Boolean),
    ranks: ranks.map((r) => r.contact_rank!).filter(Boolean),
    divisionTypes: divisionTypes.map((r) => r.contact_division_type!).filter(Boolean),
    typeDict: typeRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
    divisionDict: divisionRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
    supplierFieldDict: supplierFieldRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
  }
}

export async function getContactListPaginated(params: {
  page?: number
  pageSize?: number
  contactName?: string
  contactType?: string
  contactSearch?: string
}): Promise<{ rows: ContactListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.contactName && params.contactName.trim() !== '') {
    whereClauses.push('contact_name LIKE ?')
    whereParams.push(`%${params.contactName}%`)
  }
  if (params.contactType && params.contactType.trim() !== '') {
    whereClauses.push('contact_type LIKE ?')
    whereParams.push(`%${params.contactType}%`)
  }
  if (params.contactSearch && params.contactSearch.trim() !== '') {
    const q = `%${params.contactSearch}%`
    whereClauses.push('(contact_name LIKE ? OR contact_mobile LIKE ? OR contact_email LIKE ? OR contact_type LIKE ? OR contact_rank LIKE ?)')
    whereParams.push(q, q, q, q, q)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`contact_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`contact_list\` ${whereSql} ORDER BY contact_name LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<ContactListRow[]>(dataSql, [...whereParams, pageSize, offset] as ExecuteValues),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createContactList(data: {
  contact_name: string
  contact_mobile?: string | null
  contact_email?: string | null
  contact_type?: string | null
  contact_rank?: string | null
  contact_division_type?: string | null
  contact_division_id?: string | null
  contact_remark?: string | null
}): Promise<ContactListRow> {
  const result = await execute(
    `INSERT INTO \`contact_list\`
      (contact_name, contact_mobile, contact_email, contact_type,
       contact_rank, contact_division_type, contact_division_id, contact_remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.contact_name,
      data.contact_mobile ?? null,
      data.contact_email ?? null,
      data.contact_type ?? null,
      data.contact_rank ?? null,
      data.contact_division_type ?? null,
      data.contact_division_id ?? null,
      data.contact_remark ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create contact_list row')
  const created = await getContactListById(newId)
  if (!created) throw new Error('Failed to create contact_list row')
  return created
}

export async function updateContactList(
  contactId: number,
  data: {
    contact_name?: string
    contact_mobile?: string | null
    contact_email?: string | null
    contact_type?: string | null
    contact_rank?: string | null
    contact_division_type?: string | null
    contact_division_id?: string | null
    contact_remark?: string | null
  }
): Promise<ContactListRow> {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'contact_name',
    'contact_mobile',
    'contact_email',
    'contact_type',
    'contact_rank',
    'contact_division_type',
    'contact_division_id',
    'contact_remark',
  ]
  for (const key of keys) {
    if (key in data) {
      sets.push(`\`${key}\` = ?`)
      const v = (data as any)[key]
      if (typeof v === 'string' && v.trim() === '') params.push(null)
      else if (v === undefined) params.push(null)
      else params.push(v)
    }
  }
  if (sets.length === 0) {
    const curr = await getContactListById(contactId)
    if (!curr) throw new Error('Contact not found')
    return curr
  }
  params.push(contactId)
  await execute(
    `UPDATE \`contact_list\` SET ${sets.join(', ')} WHERE contact_id = ?`,
    params as ExecuteValues
  )
  const updated = await getContactListById(contactId)
  if (!updated) throw new Error('Failed to update contact_list row')
  return updated
}

export async function deleteContactList(contactId: number): Promise<boolean> {
  const result = await execute('DELETE FROM `contact_list` WHERE contact_id = ?', [contactId])
  return result.affectedRows > 0
}

export async function deleteContactListBulk(contactIds: number[]): Promise<number> {
  if (contactIds.length === 0) return 0
  const placeholders = contactIds.map(() => '?').join(', ')
  const result = await execute(
    `DELETE FROM \`contact_list\` WHERE contact_id IN (${placeholders})`,
    contactIds
  )
  return Number(result.affectedRows)
}

function normalizeRow(row: any): ContactListRow {
  return {
    contact_id: Number(row.contact_id),
    contact_name: String(row.contact_name ?? ''),
    contact_mobile: row.contact_mobile ? String(row.contact_mobile) : null,
    contact_email: row.contact_email ? String(row.contact_email) : null,
    contact_type: row.contact_type ? String(row.contact_type) : null,
    contact_rank: row.contact_rank ? String(row.contact_rank) : null,
    contact_division_type: row.contact_division_type ? String(row.contact_division_type) : null,
    contact_division_id: row.contact_division_id ? String(row.contact_division_id) : null,
    contact_remark: row.contact_remark ? String(row.contact_remark) : null,
  }
}
