import { getCaseDictByKeyPrefix } from './case-dict-service'
import { query, execute, type ExecuteValues } from './db'
import {
  auditInsert,
  auditUpdate,
  auditDelete,
  auditBulkDelete,
} from './log-list-service'

export interface SupplierDictEntry {
  dict_key: string
  dict_value: string
}

export interface SupplierListRow {
  supplier_id: number
  supplier_name: string
  supplier_shortname: string | null
  supplier_address: string | null
  supplier_field: string | null
  supplier_advantage: string | null
  supplier_remark: string | null
  supplier_contact_id: number | null
}

const SELECT_COLS = `
  supplier_id, supplier_name, supplier_shortname, supplier_address,
  supplier_field, supplier_advantage, supplier_remark, supplier_contact_id
`

export async function getAllSupplierList(): Promise<SupplierListRow[]> {
  const rows = await query<SupplierListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`supplier_list\` ORDER BY supplier_name`
  )
  return rows.map(normalizeRow)
}

export async function getSupplierListById(
  supplierId: number
): Promise<SupplierListRow | null> {
  const rows = await query<SupplierListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`supplier_list\` WHERE supplier_id = ? LIMIT 1`,
    [supplierId]
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

export async function getSupplierListGroups(): Promise<{
  shortnames: string[]
  fields: string[]
  advantages: string[]
  fieldDict: SupplierDictEntry[]
}> {
  const [shortnames, fields, advantages, fieldRows] = await Promise.all([
    query<{ supplier_shortname: string | null }[]>(
      "SELECT DISTINCT supplier_shortname FROM `supplier_list` WHERE supplier_shortname IS NOT NULL AND supplier_shortname <> '' ORDER BY supplier_shortname"
    ),
    query<{ supplier_field: string | null }[]>(
      "SELECT DISTINCT supplier_field FROM `supplier_list` WHERE supplier_field IS NOT NULL AND supplier_field <> '' ORDER BY supplier_field"
    ),
    query<{ supplier_advantage: string | null }[]>(
      "SELECT DISTINCT supplier_advantage FROM `supplier_list` WHERE supplier_advantage IS NOT NULL AND supplier_advantage <> '' ORDER BY supplier_advantage"
    ),
    getCaseDictByKeyPrefix('I'),
  ])
  return {
    shortnames: shortnames.map((r) => r.supplier_shortname!).filter(Boolean),
    fields: flattenUnique(fields.map((r) => r.supplier_field)),
    advantages: advantages.map((r) => r.supplier_advantage!).filter(Boolean),
    fieldDict: fieldRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
  }
}

export async function getSupplierListPaginated(params: {
  page?: number
  pageSize?: number
  supplierName?: string
  supplierShortname?: string
  supplierField?: string
  supplierAdvantage?: string
}): Promise<{
  rows: SupplierListRow[]
  total: number
  page: number
  pageSize: number
}> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.supplierName && params.supplierName.trim() !== '') {
    whereClauses.push('supplier_name LIKE ?')
    whereParams.push(`%${params.supplierName}%`)
  }
  if (params.supplierShortname && params.supplierShortname.trim() !== '') {
    whereClauses.push('supplier_shortname LIKE ?')
    whereParams.push(`%${params.supplierShortname}%`)
  }
  if (params.supplierField && params.supplierField.trim() !== '') {
    whereClauses.push('supplier_field LIKE ?')
    whereParams.push(`%${params.supplierField}%`)
  }
  if (params.supplierAdvantage && params.supplierAdvantage.trim() !== '') {
    whereClauses.push('supplier_advantage LIKE ?')
    whereParams.push(`%${params.supplierAdvantage}%`)
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`supplier_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`supplier_list\` ${whereSql} ORDER BY supplier_name LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<SupplierListRow[]>(dataSql, [
      ...whereParams,
      pageSize,
      offset,
    ] as ExecuteValues),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createSupplierList(data: {
  supplier_name: string
  supplier_shortname?: string | null
  supplier_address?: string | null
  supplier_field?: string | null
  supplier_advantage?: string | null
  supplier_remark?: string | null
  supplier_contact_id?: number | null
}): Promise<SupplierListRow> {
  const result = await execute(
    `INSERT INTO \`supplier_list\`
      (supplier_name, supplier_shortname, supplier_address, supplier_field,
       supplier_advantage, supplier_remark, supplier_contact_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.supplier_name,
      data.supplier_shortname ?? null,
      data.supplier_address ?? null,
      data.supplier_field ?? null,
      data.supplier_advantage ?? null,
      data.supplier_remark ?? null,
      data.supplier_contact_id ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create supplier_list row')
  const created = await getSupplierListById(newId)
  if (!created) throw new Error('Failed to create supplier_list row')
  await auditInsert('supplier_list', created, {
    excludeFields: ['supplier_id'],
    primaryKeyField: 'supplier_id',
  })
  return created
}

export async function updateSupplierList(
  supplierId: number,
  data: {
    supplier_name?: string
    supplier_shortname?: string | null
    supplier_address?: string | null
    supplier_field?: string | null
    supplier_advantage?: string | null
    supplier_remark?: string | null
    supplier_contact_id?: number | null
  }
): Promise<SupplierListRow> {
  const oldRow = await getSupplierListById(supplierId)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'supplier_name',
    'supplier_shortname',
    'supplier_address',
    'supplier_field',
    'supplier_advantage',
    'supplier_remark',
    'supplier_contact_id',
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
    if (!oldRow) throw new Error('Supplier not found')
    return oldRow
  }
  params.push(supplierId)
  await execute(
    `UPDATE \`supplier_list\` SET ${sets.join(', ')} WHERE supplier_id = ?`,
    params as ExecuteValues
  )
  const newRow = await getSupplierListById(supplierId)
  if (!newRow) throw new Error('Failed to update supplier_list row')
  if (oldRow) {
    await auditUpdate('supplier_list', oldRow, newRow, data, {
      excludeFields: ['supplier_id'],
      primaryKeyField: 'supplier_id',
    })
  }
  return newRow
}

export async function deleteSupplierList(supplierId: number): Promise<boolean> {
  const row = await getSupplierListById(supplierId)
  const result = await execute(
    'DELETE FROM `supplier_list` WHERE supplier_id = ?',
    [supplierId]
  )
  const success = result.affectedRows > 0
  if (success && row) {
    await auditDelete('supplier_list', row, {
      excludeFields: ['supplier_id'],
      primaryKeyField: 'supplier_id',
    })
  }
  return success
}

export async function deleteSupplierListBulk(
  supplierIds: number[]
): Promise<number> {
  if (supplierIds.length === 0) return 0
  const placeholders = supplierIds.map(() => '?').join(', ')
  const rawRows = await query<SupplierListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`supplier_list\` WHERE supplier_id IN (${placeholders})`,
    supplierIds
  )
  const rows = rawRows.map(normalizeRow)
  const result = await execute(
    `DELETE FROM \`supplier_list\` WHERE supplier_id IN (${placeholders})`,
    supplierIds
  )
  if (rows.length > 0) {
    await auditBulkDelete('supplier_list', rows, {
      excludeFields: ['supplier_id'],
      primaryKeyField: 'supplier_id',
    })
  }
  return Number(result.affectedRows)
}

function normalizeRow(row: any): SupplierListRow {
  return {
    supplier_id: Number(row.supplier_id),
    supplier_name: String(row.supplier_name ?? ''),
    supplier_shortname: row.supplier_shortname
      ? String(row.supplier_shortname)
      : null,
    supplier_address: row.supplier_address
      ? String(row.supplier_address)
      : null,
    supplier_field: row.supplier_field ? String(row.supplier_field) : null,
    supplier_advantage: row.supplier_advantage
      ? String(row.supplier_advantage)
      : null,
    supplier_remark: row.supplier_remark ? String(row.supplier_remark) : null,
    supplier_contact_id:
      row.supplier_contact_id != null && !isNaN(Number(row.supplier_contact_id))
        ? Number(row.supplier_contact_id)
        : null,
  }
}
