import { query, execute, type ExecuteValues } from './db'

export interface CollaborationListRow {
  collaboration_id: number
  collaboration_name: string
  collaboration_shortname: string | null
  collaboration_address: string | null
  collaboration_contact_name: string | null
  collaboration_contact_phone: string | null
  collaboration_contact_email: string | null
  collaboration_remark: string | null
}

const SELECT_COLS = `
  collaboration_id, collaboration_name, collaboration_shortname, collaboration_address,
  collaboration_contact_name, collaboration_contact_phone,
  collaboration_contact_email, collaboration_remark
`

export async function getAllCollaborationList(): Promise<CollaborationListRow[]> {
  const rows = await query<CollaborationListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`collaboration_list\` ORDER BY collaboration_name`
  )
  return rows.map(normalizeRow)
}

export async function getCollaborationListById(collaborationId: number): Promise<CollaborationListRow | null> {
  const rows = await query<CollaborationListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`collaboration_list\` WHERE collaboration_id = ? LIMIT 1`,
    [collaborationId]
  )
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function getCollaborationListGroups(): Promise<{
  shortnames: string[]
  names: string[]
}> {
  const [shortnames, names] = await Promise.all([
    query<{ collaboration_shortname: string | null }[]>(
      'SELECT DISTINCT collaboration_shortname FROM `collaboration_list` WHERE collaboration_shortname IS NOT NULL AND collaboration_shortname <> \'\' ORDER BY collaboration_shortname'
    ),
    query<{ collaboration_name: string | null }[]>(
      'SELECT DISTINCT collaboration_name FROM `collaboration_list` WHERE collaboration_name IS NOT NULL AND collaboration_name <> \'\' ORDER BY collaboration_name'
    ),
  ])
  return {
    shortnames: shortnames.map((r) => r.collaboration_shortname!).filter(Boolean),
    names: names.map((r) => r.collaboration_name!).filter(Boolean),
  }
}

export async function getCollaborationListPaginated(params: {
  page?: number
  pageSize?: number
  collaborationName?: string
  collaborationShortname?: string
  contactSearch?: string
}): Promise<{ rows: CollaborationListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.collaborationName && params.collaborationName.trim() !== '') {
    whereClauses.push('collaboration_name LIKE ?')
    whereParams.push(`%${params.collaborationName}%`)
  }
  if (params.collaborationShortname && params.collaborationShortname.trim() !== '') {
    whereClauses.push('collaboration_shortname LIKE ?')
    whereParams.push(`%${params.collaborationShortname}%`)
  }
  if (params.contactSearch && params.contactSearch.trim() !== '') {
    const q = `%${params.contactSearch}%`
    whereClauses.push('(collaboration_contact_name LIKE ? OR collaboration_contact_phone LIKE ? OR collaboration_contact_email LIKE ?)')
    whereParams.push(q, q, q)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`collaboration_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`collaboration_list\` ${whereSql} ORDER BY collaboration_name LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<CollaborationListRow[]>(dataSql, [...whereParams, pageSize, offset] as ExecuteValues),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createCollaborationList(data: {
  collaboration_name: string
  collaboration_shortname?: string | null
  collaboration_address?: string | null
  collaboration_contact_name?: string | null
  collaboration_contact_phone?: string | null
  collaboration_contact_email?: string | null
  collaboration_remark?: string | null
}): Promise<CollaborationListRow> {
  const result = await execute(
    `INSERT INTO \`collaboration_list\`
      (collaboration_name, collaboration_shortname, collaboration_address,
       collaboration_contact_name, collaboration_contact_phone,
       collaboration_contact_email, collaboration_remark)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.collaboration_name,
      data.collaboration_shortname ?? null,
      data.collaboration_address ?? null,
      data.collaboration_contact_name ?? null,
      data.collaboration_contact_phone ?? null,
      data.collaboration_contact_email ?? null,
      data.collaboration_remark ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create collaboration_list row')
  const created = await getCollaborationListById(newId)
  if (!created) throw new Error('Failed to create collaboration_list row')
  return created
}

export async function updateCollaborationList(
  collaborationId: number,
  data: {
    collaboration_name?: string
    collaboration_shortname?: string | null
    collaboration_address?: string | null
    collaboration_contact_name?: string | null
    collaboration_contact_phone?: string | null
    collaboration_contact_email?: string | null
    collaboration_remark?: string | null
  }
): Promise<CollaborationListRow> {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'collaboration_name',
    'collaboration_shortname',
    'collaboration_address',
    'collaboration_contact_name',
    'collaboration_contact_phone',
    'collaboration_contact_email',
    'collaboration_remark',
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
    const curr = await getCollaborationListById(collaborationId)
    if (!curr) throw new Error('Collaboration not found')
    return curr
  }
  params.push(collaborationId)
  await execute(
    `UPDATE \`collaboration_list\` SET ${sets.join(', ')} WHERE collaboration_id = ?`,
    params as ExecuteValues
  )
  const updated = await getCollaborationListById(collaborationId)
  if (!updated) throw new Error('Failed to update collaboration_list row')
  return updated
}

export async function deleteCollaborationList(collaborationId: number): Promise<boolean> {
  const result = await execute('DELETE FROM `collaboration_list` WHERE collaboration_id = ?', [collaborationId])
  return result.affectedRows > 0
}

export async function deleteCollaborationListBulk(collaborationIds: number[]): Promise<number> {
  if (collaborationIds.length === 0) return 0
  const placeholders = collaborationIds.map(() => '?').join(', ')
  const result = await execute(
    `DELETE FROM \`collaboration_list\` WHERE collaboration_id IN (${placeholders})`,
    collaborationIds
  )
  return Number(result.affectedRows)
}

function normalizeRow(row: any): CollaborationListRow {
  return {
    collaboration_id: Number(row.collaboration_id),
    collaboration_name: String(row.collaboration_name ?? ''),
    collaboration_shortname: row.collaboration_shortname ? String(row.collaboration_shortname) : null,
    collaboration_address: row.collaboration_address ? String(row.collaboration_address) : null,
    collaboration_contact_name: row.collaboration_contact_name ? String(row.collaboration_contact_name) : null,
    collaboration_contact_phone: row.collaboration_contact_phone ? String(row.collaboration_contact_phone) : null,
    collaboration_contact_email: row.collaboration_contact_email ? String(row.collaboration_contact_email) : null,
    collaboration_remark: row.collaboration_remark ? String(row.collaboration_remark) : null,
  }
}
