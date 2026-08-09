import { query, execute } from './db'

export interface LogListRow {
  log_id: number
  log_table_name: string | null
  log_table_primary_key: string | null
  log_table_primary_key_value: string | null
  log_field_name: string | null
  log_filed_old_value: string | null
  log_field_new_value: string | null
}

export type LogOp = 'INSERT' | 'UPDATE' | 'DELETE'

function valueToStr(v: unknown, maxLen = 500): string | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    const s = String(v)
    return s.length > maxLen ? s.slice(0, maxLen) : s
  }
  try {
    const s = JSON.stringify(v)
    return s.length > maxLen ? s.slice(0, maxLen) : s
  } catch {
    const s = String(v)
    return s.length > maxLen ? s.slice(0, maxLen) : s
  }
}

export async function writeAuditLogs(records: {
  log_table_name: string
  log_table_primary_key?: string | null
  log_table_primary_key_value?: string | number | null
  log_field_name: string
  log_filed_old_value?: unknown
  log_field_new_value?: unknown
}[]): Promise<void> {
  if (!records || records.length === 0) return
  const placeholders = records.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
  const params: (string | null)[] = []
  for (const r of records) {
    params.push(
      r.log_table_name ?? null,
      valueToStr(r.log_table_primary_key, 45),
      valueToStr(r.log_table_primary_key_value, 45),
      r.log_field_name ?? null,
      valueToStr(r.log_filed_old_value, 500),
      valueToStr(r.log_field_new_value, 500)
    )
  }
  await execute(
    `INSERT INTO \`log_list\`
       (log_table_name, log_table_primary_key, log_table_primary_key_value,
        log_field_name, log_filed_old_value, log_field_new_value)
     VALUES ${placeholders}`,
    params as any
  )
}

function pickPrimaryKeyValue<Row extends Record<string, any>>(
  row: Row | null | undefined,
  primaryKeyField: string | null,
  explicitValue: string | number | null | undefined
): string | number | null {
  if (explicitValue !== undefined && explicitValue !== null) return explicitValue
  if (!row || !primaryKeyField) return null
  const v = (row as any)[primaryKeyField]
  if (v === undefined || v === null) return null
  return v
}

export async function auditInsert<Row extends Record<string, any>>(
  tableName: string,
  newRow: Row,
  opts: {
    excludeFields?: string[]
    primaryKeyField?: string
    primaryKeyValue?: string | number | null
  } = {}
): Promise<void> {
  if (!newRow) return
  const exclude = new Set(opts.excludeFields ?? [])
  const pkField = opts.primaryKeyField ?? null
  const pkValue = pickPrimaryKeyValue(newRow, pkField, opts.primaryKeyValue)
  const records = Object.keys(newRow)
    .filter((k) => !exclude.has(k))
    .map((k) => ({
      log_table_name: tableName,
      log_table_primary_key: pkField,
      log_table_primary_key_value: pkValue,
      log_field_name: k,
      log_filed_old_value: null,
      log_field_new_value: (newRow as any)[k],
    }))
  await writeAuditLogs(records)
}

export async function auditDelete<Row extends Record<string, any>>(
  tableName: string,
  oldRow: Row,
  opts: {
    excludeFields?: string[]
    primaryKeyField?: string
    primaryKeyValue?: string | number | null
  } = {}
): Promise<void> {
  if (!oldRow) return
  const exclude = new Set(opts.excludeFields ?? [])
  const pkField = opts.primaryKeyField ?? null
  const pkValue = pickPrimaryKeyValue(oldRow, pkField, opts.primaryKeyValue)
  const records = Object.keys(oldRow)
    .filter((k) => !exclude.has(k))
    .map((k) => ({
      log_table_name: tableName,
      log_table_primary_key: pkField,
      log_table_primary_key_value: pkValue,
      log_field_name: k,
      log_filed_old_value: (oldRow as any)[k],
      log_field_new_value: null,
    }))
  await writeAuditLogs(records)
}

export async function auditBulkDelete<Row extends Record<string, any>>(
  tableName: string,
  oldRows: Row[],
  opts: {
    excludeFields?: string[]
    primaryKeyField?: string
  } = {}
): Promise<void> {
  if (!oldRows || oldRows.length === 0) return
  for (const r of oldRows) await auditDelete(tableName, r, opts)
}

export async function auditUpdate<
  OldRow extends Record<string, any>,
  Data extends Record<string, any>
>(
  tableName: string,
  oldRow: OldRow,
  newRow: OldRow,
  _data: Data,
  opts: {
    excludeFields?: string[]
    primaryKeyField?: string
    primaryKeyValue?: string | number | null
  } = {}
): Promise<void> {
  if (!oldRow || !newRow) return
  const exclude = new Set(opts.excludeFields ?? [])
  const pkField = opts.primaryKeyField ?? null
  const pkValue =
    opts.primaryKeyValue !== undefined && opts.primaryKeyValue !== null
      ? opts.primaryKeyValue
      : oldRow && pkField
        ? (oldRow as any)[pkField] ?? (newRow as any)[pkField] ?? null
        : newRow && pkField
          ? (newRow as any)[pkField] ?? null
          : null
  const allKeys = new Set<string>([
    ...Object.keys(oldRow),
    ...Object.keys(newRow),
  ])
  const records: {
    log_table_name: string
    log_table_primary_key: string | null
    log_table_primary_key_value: string | number | null
    log_field_name: string
    log_filed_old_value: unknown
    log_field_new_value: unknown
  }[] = []
  for (const k of allKeys) {
    if (exclude.has(k)) continue
    const ov = (oldRow as any)[k]
    const nv = (newRow as any)[k]
    const ovStr = valueToStr(ov, 500)
    const nvStr = valueToStr(nv, 500)
    if (ovStr === nvStr) continue
    records.push({
      log_table_name: tableName,
      log_table_primary_key: pkField,
      log_table_primary_key_value: pkValue,
      log_field_name: k,
      log_filed_old_value: ov,
      log_field_new_value: nv,
    })
  }
  await writeAuditLogs(records)
}

export async function getLogListPaginated(params: {
  page?: number
  pageSize?: number
}): Promise<{ rows: LogListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize
  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(
      'SELECT COUNT(*) AS total FROM `log_list`'
    ),
    query<LogListRow[]>(
      `SELECT log_id, log_table_name, log_table_primary_key,
              log_table_primary_key_value,
              log_field_name, log_filed_old_value, log_field_new_value
         FROM \`log_list\`
        ORDER BY log_id DESC
        LIMIT ? OFFSET ?`,
      [pageSize, offset]
    ),
  ])
  return {
    rows: dataRows,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}
