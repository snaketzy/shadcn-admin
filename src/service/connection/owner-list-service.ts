import { query, execute, type ExecuteValues } from './db'

export interface OwnerListRow {
  owner_id: number
  owner_name: string
  owner_company: string | null
  owner_contact: string | null
  owner_phone: string | null
  owner_email: string | null
  owner_country: string | null
  owner_fax: string | null
  owner_address: string | null
  owner_remark: string | null
  created_at: string | null
  updated_at: string | null
}

export interface OwnerDictEntry {
  dict_key: string
  dict_value: string
}

const SELECT_COLS = `
  owner_id, owner_name, owner_company, owner_contact, owner_phone,
  owner_email, owner_country, owner_fax, owner_address, owner_remark,
  created_at, updated_at
`

export async function getAllOwnerList(): Promise<OwnerListRow[]> {
  const rows = await query<OwnerListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`owner_list\` ORDER BY owner_name`
  )
  return rows.map(normalizeRow)
}

export async function getOwnerListById(ownerId: number): Promise<OwnerListRow | null> {
  const rows = await query<OwnerListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`owner_list\` WHERE owner_id = ? LIMIT 1`,
    [ownerId]
  )
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function getOwnerListGroups(): Promise<{
  countries: string[]
  companies: string[]
}> {
  const [countries, companies] = await Promise.all([
    query<{ owner_country: string | null }[]>(
      'SELECT DISTINCT owner_country FROM `owner_list` WHERE owner_country IS NOT NULL AND owner_country <> \'\' ORDER BY owner_country'
    ),
    query<{ owner_company: string | null }[]>(
      'SELECT DISTINCT owner_company FROM `owner_list` WHERE owner_company IS NOT NULL AND owner_company <> \'\' ORDER BY owner_company'
    ),
  ])
  return {
    countries: countries.map((r) => r.owner_country!).filter(Boolean),
    companies: companies.map((r) => r.owner_company!).filter(Boolean),
  }
}

export async function getOwnerListPaginated(params: {
  page?: number
  pageSize?: number
  ownerName?: string
  ownerCompany?: string
  ownerCountry?: string
  ownerContact?: string
}): Promise<{ rows: OwnerListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.ownerName && params.ownerName.trim() !== '') {
    whereClauses.push('owner_name LIKE ?')
    whereParams.push(`%${params.ownerName}%`)
  }
  if (params.ownerCompany && params.ownerCompany.trim() !== '') {
    whereClauses.push('owner_company = ?')
    whereParams.push(params.ownerCompany)
  }
  if (params.ownerCountry && params.ownerCountry.trim() !== '') {
    whereClauses.push('owner_country = ?')
    whereParams.push(params.ownerCountry)
  }
  if (params.ownerContact && params.ownerContact.trim() !== '') {
    whereClauses.push('owner_contact LIKE ?')
    whereParams.push(`%${params.ownerContact}%`)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`owner_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`owner_list\` ${whereSql} ORDER BY owner_name LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<OwnerListRow[]>(dataSql, [...whereParams, pageSize, offset] as ExecuteValues),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createOwnerList(data: {
  owner_name: string
  owner_company?: string | null
  owner_contact?: string | null
  owner_phone?: string | null
  owner_email?: string | null
  owner_country?: string | null
  owner_fax?: string | null
  owner_address?: string | null
  owner_remark?: string | null
}): Promise<OwnerListRow> {
  const result = await execute(
    `INSERT INTO \`owner_list\`
      (owner_name, owner_company, owner_contact, owner_phone, owner_email,
       owner_country, owner_fax, owner_address, owner_remark, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.owner_name,
      data.owner_company ?? null,
      data.owner_contact ?? null,
      data.owner_phone ?? null,
      data.owner_email ?? null,
      data.owner_country ?? null,
      data.owner_fax ?? null,
      data.owner_address ?? null,
      data.owner_remark ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create owner_list row')
  const created = await getOwnerListById(newId)
  if (!created) throw new Error('Failed to create owner_list row')
  return created
}

export async function updateOwnerList(
  ownerId: number,
  data: {
    owner_name?: string
    owner_company?: string | null
    owner_contact?: string | null
    owner_phone?: string | null
    owner_email?: string | null
    owner_country?: string | null
    owner_fax?: string | null
    owner_address?: string | null
    owner_remark?: string | null
  }
): Promise<OwnerListRow> {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'owner_name',
    'owner_company',
    'owner_contact',
    'owner_phone',
    'owner_email',
    'owner_country',
    'owner_fax',
    'owner_address',
    'owner_remark',
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
    const curr = await getOwnerListById(ownerId)
    if (!curr) throw new Error('Owner not found')
    return curr
  }
  sets.push('`updated_at` = NOW()')
  params.push(ownerId)
  await execute(
    `UPDATE \`owner_list\` SET ${sets.join(', ')} WHERE owner_id = ?`,
    params as ExecuteValues
  )
  const updated = await getOwnerListById(ownerId)
  if (!updated) throw new Error('Failed to update owner_list row')
  return updated
}

export async function deleteOwnerList(ownerId: number): Promise<boolean> {
  const result = await execute('DELETE FROM `owner_list` WHERE owner_id = ?', [ownerId])
  return result.affectedRows > 0
}

export async function deleteOwnerListBulk(ownerIds: number[]): Promise<number> {
  if (ownerIds.length === 0) return 0
  const placeholders = ownerIds.map(() => '?').join(', ')
  const result = await execute(
    `DELETE FROM \`owner_list\` WHERE owner_id IN (${placeholders})`,
    ownerIds
  )
  return Number(result.affectedRows)
}

function normalizeRow(row: any): OwnerListRow {
  return {
    owner_id: Number(row.owner_id),
    owner_name: String(row.owner_name ?? ''),
    owner_company: row.owner_company ? String(row.owner_company) : null,
    owner_contact: row.owner_contact ? String(row.owner_contact) : null,
    owner_phone: row.owner_phone ? String(row.owner_phone) : null,
    owner_email: row.owner_email ? String(row.owner_email) : null,
    owner_country: row.owner_country ? String(row.owner_country) : null,
    owner_fax: row.owner_fax ? String(row.owner_fax) : null,
    owner_address: row.owner_address ? String(row.owner_address) : null,
    owner_remark: row.owner_remark ? String(row.owner_remark) : null,
    created_at: row.created_at ? formatDateTime(row.created_at) : null,
    updated_at: row.updated_at ? formatDateTime(row.updated_at) : null,
  }
}

function formatDateTime(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    const hh = String(v.getHours()).padStart(2, '0')
    const mm = String(v.getMinutes()).padStart(2, '0')
    const ss = String(v.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
  }
  return String(v ?? '')
}
