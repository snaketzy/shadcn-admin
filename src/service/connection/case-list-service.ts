import { query, execute, type ExecuteValues } from './db'
import {
  auditInsert,
  auditUpdate,
  auditDelete,
  auditBulkDelete,
} from './log-list-service'

export interface CaseListRow {
  case_id: number
  vessel_name: string | null
  invoice_number: string | null
  order_number: string | null
  case_inquiry_keyword: string | null
  case_priority: string | null
  case_inquiry_type: string | null
  case_inquiry_date: string | null
  case_follow_date: string | null
  case_uptodate_date: string | null
  case_should_handle_today: number | null
  owner_following: string | null
  supplier_inquired: number | null
  supplier_quoted: number | null
  owner_received: number | null
  supplier_inquired_date: string | null
  supplier_quoted_date: string | null
  owner_received_date: string | null
  owner_confrmed: number | null
  owner_confrmed_date: string | null
  shipyard_business: string | null
  case_agent: string | null
  case_superintendent: string | null
  case_surveyor: string | null
  case_delivery_or_service_incharge: string | null
  case_delivery_or_service_deadline: string | null
  case_eta_cargo_ready_date: string | null
  case_etb_cargo_departure_date: string | null
  case_etd_cargo_delivery_date: string | null
  vessel_position: string | null
  case_settlement_done: number | null
  case_epd: string | null
  case_spd: string | null
  case_incharge: string | null
  case_memo: string | null
  case_memo_address: string | null
  'case rank': string | null
}

const SELECT_COLS = `
  case_id, vessel_name, invoice_number, order_number, case_inquiry_keyword,
  case_priority, case_inquiry_type, case_inquiry_date, case_follow_date,
  case_uptodate_date, case_should_handle_today, owner_following, supplier_inquired,
  supplier_quoted, owner_received, supplier_inquired_date, supplier_quoted_date,
  owner_received_date, owner_confrmed, owner_confrmed_date, shipyard_business,
  case_agent, case_superintendent, case_surveyor, case_delivery_or_service_incharge,
  case_delivery_or_service_deadline, case_eta_cargo_ready_date, case_etb_cargo_departure_date,
  case_etd_cargo_delivery_date, vessel_position, case_settlement_done, case_epd,
  case_spd, case_incharge, case_memo, case_memo_address, \`case rank\`
`

const TABLE_NAME = 'case_list'

function normalizeRow(row: any): CaseListRow {
  return {
    case_id: Number(row.case_id),
    vessel_name: row.vessel_name ? String(row.vessel_name) : null,
    invoice_number: row.invoice_number ? String(row.invoice_number) : null,
    order_number: row.order_number ? String(row.order_number) : null,
    case_inquiry_keyword: row.case_inquiry_keyword ? String(row.case_inquiry_keyword) : null,
    case_priority: row.case_priority ? String(row.case_priority) : null,
    case_inquiry_type: row.case_inquiry_type ? String(row.case_inquiry_type) : null,
    case_inquiry_date: row.case_inquiry_date ? String(row.case_inquiry_date) : null,
    case_follow_date: row.case_follow_date ? String(row.case_follow_date) : null,
    case_uptodate_date: row.case_uptodate_date ? String(row.case_uptodate_date) : null,
    case_should_handle_today: row.case_should_handle_today != null ? Number(row.case_should_handle_today) : null,
    owner_following: row.owner_following ? String(row.owner_following) : null,
    supplier_inquired: row.supplier_inquired != null ? Number(row.supplier_inquired) : null,
    supplier_quoted: row.supplier_quoted != null ? Number(row.supplier_quoted) : null,
    owner_received: row.owner_received != null ? Number(row.owner_received) : null,
    supplier_inquired_date: row.supplier_inquired_date ? String(row.supplier_inquired_date) : null,
    supplier_quoted_date: row.supplier_quoted_date ? String(row.supplier_quoted_date) : null,
    owner_received_date: row.owner_received_date ? String(row.owner_received_date) : null,
    owner_confrmed: row.owner_confrmed != null ? Number(row.owner_confrmed) : null,
    owner_confrmed_date: row.owner_confrmed_date ? String(row.owner_confrmed_date) : null,
    shipyard_business: row.shipyard_business ? String(row.shipyard_business) : null,
    case_agent: row.case_agent ? String(row.case_agent) : null,
    case_superintendent: row.case_superintendent ? String(row.case_superintendent) : null,
    case_surveyor: row.case_surveyor ? String(row.case_surveyor) : null,
    case_delivery_or_service_incharge: row.case_delivery_or_service_incharge ? String(row.case_delivery_or_service_incharge) : null,
    case_delivery_or_service_deadline: row.case_delivery_or_service_deadline ? String(row.case_delivery_or_service_deadline) : null,
    case_eta_cargo_ready_date: row.case_eta_cargo_ready_date ? String(row.case_eta_cargo_ready_date) : null,
    case_etb_cargo_departure_date: row.case_etb_cargo_departure_date ? String(row.case_etb_cargo_departure_date) : null,
    case_etd_cargo_delivery_date: row.case_etd_cargo_delivery_date ? String(row.case_etd_cargo_delivery_date) : null,
    vessel_position: row.vessel_position ? String(row.vessel_position) : null,
    case_settlement_done: row.case_settlement_done != null ? Number(row.case_settlement_done) : null,
    case_epd: row.case_epd ? String(row.case_epd) : null,
    case_spd: row.case_spd ? String(row.case_spd) : null,
    case_incharge: row.case_incharge ? String(row.case_incharge) : null,
    case_memo: row.case_memo ? String(row.case_memo) : null,
    case_memo_address: row.case_memo_address ? String(row.case_memo_address) : null,
    'case rank': row['case rank'] ? String(row['case rank']) : null,
  }
}

export async function getAllCaseList(): Promise<CaseListRow[]> {
  const rows = await query<CaseListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`case_list\` ORDER BY case_id DESC`
  )
  return rows.map(normalizeRow)
}

export async function getCaseListById(caseId: number): Promise<CaseListRow | null> {
  const rows = await query<CaseListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`case_list\` WHERE case_id = ? LIMIT 1`,
    [caseId]
  )
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function getCaseListPaginated(params: {
  page?: number
  pageSize?: number
  vesselName?: string
  invoiceNumber?: string
  orderNumber?: string
  caseInquiryKeyword?: string
  ownerFollowing?: string
  caseIncharge?: string
}): Promise<{ rows: CaseListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.vesselName && params.vesselName.trim() !== '') {
    whereClauses.push('vessel_name LIKE ?')
    whereParams.push(`%${params.vesselName}%`)
  }
  if (params.invoiceNumber && params.invoiceNumber.trim() !== '') {
    whereClauses.push('invoice_number LIKE ?')
    whereParams.push(`%${params.invoiceNumber}%`)
  }
  if (params.orderNumber && params.orderNumber.trim() !== '') {
    whereClauses.push('order_number LIKE ?')
    whereParams.push(`%${params.orderNumber}%`)
  }
  if (params.caseInquiryKeyword && params.caseInquiryKeyword.trim() !== '') {
    whereClauses.push('case_inquiry_keyword LIKE ?')
    whereParams.push(`%${params.caseInquiryKeyword}%`)
  }
  if (params.ownerFollowing && params.ownerFollowing.trim() !== '') {
    whereClauses.push('owner_following LIKE ?')
    whereParams.push(`%${params.ownerFollowing}%`)
  }
  if (params.caseIncharge && params.caseIncharge.trim() !== '') {
    whereClauses.push('case_incharge LIKE ?')
    whereParams.push(`%${params.caseIncharge}%`)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`case_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`case_list\` ${whereSql} ORDER BY case_id DESC LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<CaseListRow[]>(dataSql, [...whereParams, pageSize, offset] as ExecuteValues),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

const CREATE_FIELDS = `
  vessel_name, invoice_number, order_number, case_inquiry_keyword, case_priority,
  case_inquiry_type, case_inquiry_date, case_follow_date, case_uptodate_date,
  case_should_handle_today, owner_following, supplier_inquired, supplier_quoted,
  owner_received, supplier_inquired_date, supplier_quoted_date, owner_received_date,
  owner_confrmed, owner_confrmed_date, shipyard_business, case_agent,
  case_superintendent, case_surveyor, case_delivery_or_service_incharge,
  case_delivery_or_service_deadline, case_eta_cargo_ready_date, case_etb_cargo_departure_date,
  case_etd_cargo_delivery_date, vessel_position, case_settlement_done, case_epd,
  case_spd, case_incharge, case_memo, case_memo_address, \`case rank\`
`

const CREATE_PLACEHOLDERS = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'

type CaseListCreateData = {
  vessel_name?: string | null
  invoice_number?: string | null
  order_number?: string | null
  case_inquiry_keyword?: string | null
  case_priority?: string | null
  case_inquiry_type?: string | null
  case_inquiry_date?: string | null
  case_follow_date?: string | null
  case_uptodate_date?: string | null
  case_should_handle_today?: number | null
  owner_following?: string | null
  supplier_inquired?: number | null
  supplier_quoted?: number | null
  owner_received?: number | null
  supplier_inquired_date?: string | null
  supplier_quoted_date?: string | null
  owner_received_date?: string | null
  owner_confrmed?: number | null
  owner_confrmed_date?: string | null
  shipyard_business?: string | null
  case_agent?: string | null
  case_superintendent?: string | null
  case_surveyor?: string | null
  case_delivery_or_service_incharge?: string | null
  case_delivery_or_service_deadline?: string | null
  case_eta_cargo_ready_date?: string | null
  case_etb_cargo_departure_date?: string | null
  case_etd_cargo_delivery_date?: string | null
  vessel_position?: string | null
  case_settlement_done?: number | null
  case_epd?: string | null
  case_spd?: string | null
  case_incharge?: string | null
  case_memo?: string | null
  case_memo_address?: string | null
  'case rank'?: string | null
}

export async function createCaseList(data: CaseListCreateData): Promise<CaseListRow> {
  const values = [
    data.vessel_name ?? null,
    data.invoice_number ?? null,
    data.order_number ?? null,
    data.case_inquiry_keyword ?? null,
    data.case_priority ?? null,
    data.case_inquiry_type ?? null,
    data.case_inquiry_date ?? null,
    data.case_follow_date ?? null,
    data.case_uptodate_date ?? null,
    data.case_should_handle_today ?? null,
    data.owner_following ?? null,
    data.supplier_inquired ?? null,
    data.supplier_quoted ?? null,
    data.owner_received ?? null,
    data.supplier_inquired_date ?? null,
    data.supplier_quoted_date ?? null,
    data.owner_received_date ?? null,
    data.owner_confrmed ?? null,
    data.owner_confrmed_date ?? null,
    data.shipyard_business ?? null,
    data.case_agent ?? null,
    data.case_superintendent ?? null,
    data.case_surveyor ?? null,
    data.case_delivery_or_service_incharge ?? null,
    data.case_delivery_or_service_deadline ?? null,
    data.case_eta_cargo_ready_date ?? null,
    data.case_etb_cargo_departure_date ?? null,
    data.case_etd_cargo_delivery_date ?? null,
    data.vessel_position ?? null,
    data.case_settlement_done ?? null,
    data.case_epd ?? null,
    data.case_spd ?? null,
    data.case_incharge ?? null,
    data.case_memo ?? null,
    data.case_memo_address ?? null,
    data['case rank'] ?? null,
  ]

  const result = await execute(
    `INSERT INTO \`case_list\` (${CREATE_FIELDS}) VALUES (${CREATE_PLACEHOLDERS})`,
    values as ExecuteValues
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create case_list row')
  const created = await getCaseListById(newId)
  if (!created) throw new Error('Failed to create case_list row')
  await auditInsert(TABLE_NAME, created, { excludeFields: ['case_id'], primaryKeyField: 'case_id' })
  return created
}

const UPDATE_KEYS: Array<keyof CaseListCreateData> = [
  'vessel_name',
  'invoice_number',
  'order_number',
  'case_inquiry_keyword',
  'case_priority',
  'case_inquiry_type',
  'case_inquiry_date',
  'case_follow_date',
  'case_uptodate_date',
  'case_should_handle_today',
  'owner_following',
  'supplier_inquired',
  'supplier_quoted',
  'owner_received',
  'supplier_inquired_date',
  'supplier_quoted_date',
  'owner_received_date',
  'owner_confrmed',
  'owner_confrmed_date',
  'shipyard_business',
  'case_agent',
  'case_superintendent',
  'case_surveyor',
  'case_delivery_or_service_incharge',
  'case_delivery_or_service_deadline',
  'case_eta_cargo_ready_date',
  'case_etb_cargo_departure_date',
  'case_etd_cargo_delivery_date',
  'vessel_position',
  'case_settlement_done',
  'case_epd',
  'case_spd',
  'case_incharge',
  'case_memo',
  'case_memo_address',
  'case rank',
]

export async function updateCaseList(
  caseId: number,
  data: CaseListCreateData
): Promise<CaseListRow> {
  const oldRow = await getCaseListById(caseId)
  if (!oldRow) throw new Error('Case not found')

  const sets: string[] = []
  const params: (string | number | null)[] = []
  for (const key of UPDATE_KEYS) {
    if (key in data) {
      sets.push(`\`${key}\` = ?`)
      const v = (data as any)[key]
      if (typeof v === 'string' && v.trim() === '') params.push(null)
      else if (v === undefined) params.push(null)
      else params.push(v)
    }
  }
  if (sets.length === 0) {
    return oldRow
  }
  params.push(caseId)
  await execute(
    `UPDATE \`case_list\` SET ${sets.join(', ')} WHERE case_id = ?`,
    params as ExecuteValues
  )
  const updated = await getCaseListById(caseId)
  if (!updated) throw new Error('Failed to update case_list row')
  await auditUpdate(TABLE_NAME, oldRow, updated, data, { excludeFields: ['case_id'], primaryKeyField: 'case_id' })
  return updated
}

export async function deleteCaseList(caseId: number): Promise<boolean> {
  const oldRow = await getCaseListById(caseId)
  if (!oldRow) return false
  const result = await execute('DELETE FROM `case_list` WHERE case_id = ?', [caseId])
  if (result.affectedRows > 0) {
    await auditDelete(TABLE_NAME, oldRow, { excludeFields: ['case_id'], primaryKeyField: 'case_id' })
  }
  return result.affectedRows > 0
}

export async function deleteCaseListBulk(caseIds: number[]): Promise<number> {
  if (caseIds.length === 0) return 0
  const whereParams: CaseListRow[] = []
  for (const id of caseIds) {
    const r = await getCaseListById(id)
    if (r) whereParams.push(r)
  }
  const placeholders = caseIds.map(() => '?').join(', ')
  const result = await execute(
    `DELETE FROM \`case_list\` WHERE case_id IN (${placeholders})`,
    caseIds as ExecuteValues
  )
  const deletedCount = Number(result.affectedRows)
  if (deletedCount > 0) {
    await auditBulkDelete(TABLE_NAME, whereParams, { excludeFields: ['case_id'], primaryKeyField: 'case_id' })
  }
  return deletedCount
}
