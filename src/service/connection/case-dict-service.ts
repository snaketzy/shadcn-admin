import { query, execute, type ExecuteValues } from './db'
import { auditInsert, auditUpdate, auditDelete, auditBulkDelete } from './log-list-service'

export interface CaseDictRow {
  dict_id: number
  dict_group: string
  dict_value: string
  dict_value_remark: string | null
  dict_key: string
}

export async function getAllCaseDict(): Promise<CaseDictRow[]> {
  const rows = await query<CaseDictRow[]>(
    'SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM `case_dict` ORDER BY dict_group, dict_key'
  )
  return rows
}

export async function getCaseDictById(dictId: number): Promise<CaseDictRow | null> {
  const rows = await query<CaseDictRow[]>(
    'SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM `case_dict` WHERE dict_id = ? LIMIT 1',
    [dictId]
  )
  return rows[0] ?? null
}

export async function getCaseDictGroups(): Promise<string[]> {
  const rows = await query<{ dict_group: string }[]>(
    'SELECT DISTINCT dict_group FROM `case_dict` ORDER BY dict_group'
  )
  return rows.map((r) => r.dict_group).filter(Boolean)
}

export async function getCaseDictByGroup(group: string): Promise<CaseDictRow[]> {
  const rows = await query<CaseDictRow[]>(
    'SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM `case_dict` WHERE dict_group = ? ORDER BY dict_key',
    [group]
  )
  return rows
}

export async function getCaseDictByKeyPrefix(prefix: string): Promise<CaseDictRow[]> {
  if (prefix === '') return []
  const rows = await query<CaseDictRow[]>(
    "SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM `case_dict` WHERE CAST(dict_key AS CHAR) LIKE ? ORDER BY dict_key",
    [`${prefix}%`]
  )
  return rows
}

export async function getCaseDictPaginated(params: {
  page?: number
  pageSize?: number
  dictGroup?: string
  dictKey?: string
  dictValue?: string
}): Promise<{ rows: CaseDictRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.dictGroup && params.dictGroup.trim() !== '') {
    whereClauses.push('dict_group LIKE ?')
    whereParams.push(`%${params.dictGroup}%`)
  }
  if (params.dictKey && params.dictKey.trim() !== '') {
    whereClauses.push('dict_key LIKE ?')
    whereParams.push(`%${params.dictKey}%`)
  }
  if (params.dictValue && params.dictValue.trim() !== '') {
    whereClauses.push('dict_value LIKE ?')
    whereParams.push(`%${params.dictValue}%`)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`case_dict\` ${whereSql}`
  const dataSql = `SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM \`case_dict\` ${whereSql} ORDER BY dict_group, dict_key LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<CaseDictRow[]>(dataSql, [...whereParams, pageSize, offset] as ExecuteValues),
  ])

  return {
    rows: dataRows,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createCaseDict(data: {
  dict_group: string
  dict_value: string
  dict_value_remark?: string | null
  dict_key: string
}): Promise<CaseDictRow> {
  const maxIdRows = await query<[{ max_id: number }]>(
    'SELECT COALESCE(MAX(dict_id), 0) + 1 AS max_id FROM `case_dict`'
  )
  const newDictId = maxIdRows[0]?.max_id ?? 1

  await execute(
    'INSERT INTO `case_dict` (dict_id, dict_group, dict_value, dict_value_remark, dict_key) VALUES (?, ?, ?, ?, ?)',
    [
      newDictId,
      data.dict_group,
      data.dict_value,
      data.dict_value_remark ?? null,
      String(data.dict_key ?? ''),
    ]
  )

  const created = await getCaseDictById(newDictId)
  if (!created) throw new Error('Failed to create case_dict row')
  await auditInsert('case_dict', created, { excludeFields: ['dict_id'], primaryKeyField: 'dict_id' })
  return created
}

export async function updateCaseDict(
  dictId: number,
  data: {
    dict_group: string
    dict_value: string
    dict_value_remark?: string | null
    dict_key: string
  }
): Promise<CaseDictRow> {
  const oldRow = await getCaseDictById(dictId)
  await execute(
    'UPDATE `case_dict` SET dict_group = ?, dict_value = ?, dict_value_remark = ?, dict_key = ? WHERE dict_id = ?',
    [
      data.dict_group,
      data.dict_value,
      data.dict_value_remark ?? null,
      String(data.dict_key ?? ''),
      dictId,
    ]
  )

  const newRow = await getCaseDictById(dictId)
  if (!newRow) throw new Error('Failed to update case_dict row')
  if (oldRow) {
    await auditUpdate('case_dict', oldRow, newRow, data, { excludeFields: ['dict_id'] })
  }
  return newRow
}

export async function deleteCaseDict(dictId: number): Promise<boolean> {
  const row = await getCaseDictById(dictId)
  const result = await execute('DELETE FROM `case_dict` WHERE dict_id = ?', [dictId])
  const success = result.affectedRows > 0
  if (success && row) {
    await auditDelete('case_dict', row, { excludeFields: ['dict_id'], primaryKeyField: 'dict_id' })
  }
  return success
}

export async function deleteCaseDictBulk(dictIds: number[]): Promise<number> {
  if (dictIds.length === 0) return 0
  const placeholders = dictIds.map(() => '?').join(', ')
  const rows = await query<CaseDictRow[]>(
    `SELECT dict_id, dict_group, dict_value, dict_value_remark, dict_key FROM \`case_dict\` WHERE dict_id IN (${placeholders})`,
    dictIds
  )
  const result = await execute(
    `DELETE FROM \`case_dict\` WHERE dict_id IN (${placeholders})`,
    dictIds
  )
  if (rows.length > 0) {
    await auditBulkDelete('case_dict', rows, { excludeFields: ['dict_id'], primaryKeyField: 'dict_id' })
  }
  return Number(result.affectedRows)
}
