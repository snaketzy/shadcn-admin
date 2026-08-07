import { query, execute, type ExecuteValues } from './db'

export interface OwnerListRow {
  owner_id: number
  owner_name: string
  owner_email: string | null
  owner_phone: string | null
  owner_team: string | null
  owner_department: string | null
  owner_department_email: string | null
  owner_rank: string | null
}

export interface OwnerDictEntry {
  dict_key: string
  dict_value: string
}

const SELECT_COLS = `
  owner_id, owner_name, owner_email, owner_phone,
  owner_team, owner_department, owner_department_email, owner_rank
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
  teams: string[]
  departments: string[]
  ranks: string[]
}> {
  const [teams, departments, ranks] = await Promise.all([
    query<{ owner_team: string | null }[]>(
      'SELECT DISTINCT owner_team FROM `owner_list` WHERE owner_team IS NOT NULL AND owner_team <> \'\' ORDER BY owner_team'
    ),
    query<{ owner_department: string | null }[]>(
      'SELECT DISTINCT owner_department FROM `owner_list` WHERE owner_department IS NOT NULL AND owner_department <> \'\' ORDER BY owner_department'
    ),
    query<{ owner_rank: string | null }[]>(
      'SELECT DISTINCT owner_rank FROM `owner_list` WHERE owner_rank IS NOT NULL AND owner_rank <> \'\' ORDER BY owner_rank'
    ),
  ])
  return {
    teams: teams.map((r) => r.owner_team!).filter(Boolean),
    departments: departments.map((r) => r.owner_department!).filter(Boolean),
    ranks: ranks.map((r) => r.owner_rank!).filter(Boolean),
  }
}

export async function getOwnerListPaginated(params: {
  page?: number
  pageSize?: number
  ownerName?: string
  ownerTeam?: string
  ownerDepartment?: string
  ownerRank?: string
  ownerEmail?: string
  ownerPhone?: string
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
  if (params.ownerTeam && params.ownerTeam.trim() !== '') {
    whereClauses.push('owner_team = ?')
    whereParams.push(params.ownerTeam)
  }
  if (params.ownerDepartment && params.ownerDepartment.trim() !== '') {
    whereClauses.push('owner_department = ?')
    whereParams.push(params.ownerDepartment)
  }
  if (params.ownerRank && params.ownerRank.trim() !== '') {
    whereClauses.push('owner_rank = ?')
    whereParams.push(params.ownerRank)
  }
  if (params.ownerEmail && params.ownerEmail.trim() !== '') {
    whereClauses.push('owner_email LIKE ?')
    whereParams.push(`%${params.ownerEmail}%`)
  }
  if (params.ownerPhone && params.ownerPhone.trim() !== '') {
    whereClauses.push('owner_phone LIKE ?')
    whereParams.push(`%${params.ownerPhone}%`)
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
  owner_email?: string | null
  owner_phone?: string | null
  owner_team?: string | null
  owner_department?: string | null
  owner_department_email?: string | null
  owner_rank?: string | null
}): Promise<OwnerListRow> {
  const result = await execute(
    `INSERT INTO \`owner_list\`
      (owner_name, owner_email, owner_phone, owner_team,
       owner_department, owner_department_email, owner_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.owner_name,
      data.owner_email ?? null,
      data.owner_phone ?? null,
      data.owner_team ?? null,
      data.owner_department ?? null,
      data.owner_department_email ?? null,
      data.owner_rank ?? null,
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
    owner_email?: string | null
    owner_phone?: string | null
    owner_team?: string | null
    owner_department?: string | null
    owner_department_email?: string | null
    owner_rank?: string | null
  }
): Promise<OwnerListRow> {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'owner_name',
    'owner_email',
    'owner_phone',
    'owner_team',
    'owner_department',
    'owner_department_email',
    'owner_rank',
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
    owner_email: row.owner_email ? String(row.owner_email) : null,
    owner_phone: row.owner_phone ? String(row.owner_phone) : null,
    owner_team: row.owner_team ? String(row.owner_team) : null,
    owner_department: row.owner_department ? String(row.owner_department) : null,
    owner_department_email: row.owner_department_email ? String(row.owner_department_email) : null,
    owner_rank: row.owner_rank ? String(row.owner_rank) : null,
  }
}
