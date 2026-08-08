import { query, execute, type ExecuteValues } from './db'
import { getCaseDictByKeyPrefix } from './case-dict-service'

export interface CollaborationDictEntry {
  dict_key: string
  dict_value: string
}

export interface CollaborationListRow {
  collaboration_id: number
  collaboration_name: string
  collaboration_shortname: string | null
  collaboration_address: string | null
  collaboration_field: string | null
  collaboration_contact_id: number | null
  collaboration_remark: string | null
}

const SELECT_COLS = `
  collaboration_id, collaboration_name, collaboration_shortname, collaboration_address,
  collaboration_field, collaboration_contact_id, collaboration_remark
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

function flattenUnique(values: (string | null)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (v == null) continue
    const parts = String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const p of parts) {
      if (seen.has(p)) continue
      seen.add(p)
      out.push(p)
    }
  }
  return out
}

export async function getCollaborationListGroups(): Promise<{
  shortnames: string[]
  names: string[]
  fields: string[]
  fieldDict: CollaborationDictEntry[]
}> {
  const [shortnames, names, fields, fieldRows] = await Promise.all([
    query<{ collaboration_shortname: string | null }[]>(
      'SELECT DISTINCT collaboration_shortname FROM `collaboration_list` WHERE collaboration_shortname IS NOT NULL AND collaboration_shortname <> \'\' ORDER BY collaboration_shortname'
    ),
    query<{ collaboration_name: string | null }[]>(
      'SELECT DISTINCT collaboration_name FROM `collaboration_list` WHERE collaboration_name IS NOT NULL AND collaboration_name <> \'\' ORDER BY collaboration_name'
    ),
    query<{ collaboration_field: string | null }[]>(
      'SELECT DISTINCT collaboration_field FROM `collaboration_list` WHERE collaboration_field IS NOT NULL AND collaboration_field <> \'\' ORDER BY collaboration_field'
    ),
    getCaseDictByKeyPrefix('L'),
  ])
  return {
    shortnames: shortnames.map((r) => r.collaboration_shortname!).filter(Boolean),
    names: names.map((r) => r.collaboration_name!).filter(Boolean),
    fields: flattenUnique(fields.map((r) => r.collaboration_field)),
    fieldDict: fieldRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
  }
}

export async function getCollaborationListPaginated(params: {
  page?: number
  pageSize?: number
  collaborationName?: string
  collaborationShortname?: string
  collaborationField?: string
  contactId?: number
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
  if (params.collaborationField && params.collaborationField.trim() !== '') {
    whereClauses.push('collaboration_field LIKE ?')
    whereParams.push(`%${params.collaborationField}%`)
  }
  if (params.contactId != null && !isNaN(params.contactId)) {
    whereClauses.push('collaboration_contact_id = ?')
    whereParams.push(params.contactId)
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
  collaboration_field?: string | null
  collaboration_contact_id?: number | null
  collaboration_remark?: string | null
}): Promise<CollaborationListRow> {
  const result = await execute(
    `INSERT INTO \`collaboration_list\`
      (collaboration_name, collaboration_shortname, collaboration_address,
       collaboration_field, collaboration_contact_id, collaboration_remark)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.collaboration_name,
      data.collaboration_shortname ?? null,
      data.collaboration_address ?? null,
      data.collaboration_field ?? null,
      data.collaboration_contact_id ?? null,
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
    collaboration_field?: string | null
    collaboration_contact_id?: number | null
    collaboration_remark?: string | null
  }
): Promise<CollaborationListRow> {
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'collaboration_name',
    'collaboration_shortname',
    'collaboration_address',
    'collaboration_field',
    'collaboration_contact_id',
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
    collaboration_field: row.collaboration_field ? String(row.collaboration_field) : null,
    collaboration_contact_id: row.collaboration_contact_id != null && !isNaN(Number(row.collaboration_contact_id))
      ? Number(row.collaboration_contact_id)
      : null,
    collaboration_remark: row.collaboration_remark ? String(row.collaboration_remark) : null,
  }
}
