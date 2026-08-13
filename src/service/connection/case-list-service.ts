import { query, execute, type ExecuteValues } from './db'
import {
  auditInsert,
  auditUpdate,
  auditDelete,
  auditBulkDelete,
} from './log-list-service'
import { getCaseDictByKeyPrefix, type CaseDictRow } from './case-dict-service'

export interface CaseListRow {
  case_id: number
  vessel_name: string | null
  invoice_number: string | null
  order_number: string | null
  case_inquiry_keyword: string | null
  case_progress: string | null
  case_urgent: string | null
  case_inquiry_type: string | null
  case_inquiry_date: string | null
  case_follow_date: string | null
  case_uptodate_date: string | null
  case_should_handle_today: string | null
  owner_following: string | null
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
  case_settlement_done: string | null
  case_epd: string | null
  case_spd: string | null
  case_incharge: string | null
  case_memo_name: string | null
  case_memo_address: string | null
  case_rank: string | null
}

const SELECT_COLS = `
  case_id, vessel_name, invoice_number, order_number,
  case_inquiry_keyword, case_progress, case_urgent, case_inquiry_type,
  case_inquiry_date, case_follow_date, case_uptodate_date, case_should_handle_today,
  owner_following, shipyard_business, case_agent, case_superintendent,
  case_surveyor, case_delivery_or_service_incharge, case_delivery_or_service_deadline,
  case_eta_cargo_ready_date, case_etb_cargo_departure_date, case_etd_cargo_delivery_date,
  vessel_position, case_settlement_done, case_epd, case_spd,
  case_incharge, case_memo_name, case_memo_address, case_rank
`

export async function getAllCaseList(): Promise<CaseListRow[]> {
  const rows = await query<CaseListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`case_list\` ORDER BY case_inquiry_date DESC, case_id DESC`
  )
  return rows.map(normalizeRow)
}

export async function getCaseListById(
  caseId: number
): Promise<CaseListRow | null> {
  const rows = await query<CaseListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`case_list\` WHERE case_id = ? LIMIT 1`,
    [caseId]
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

export async function getCaseListGroups(): Promise<{
  vesselNames: string[]
  invoiceNumbers: string[]
  orderNumbers: string[]
  caseProgresses: string[]
  caseInquiryTypes: string[]
  caseInCharges: string[]
  caseRanks: string[]
  progressDict: CaseDictRow[]
  urgentDict: CaseDictRow[]
  inquiryTypeDict: CaseDictRow[]
  inchargeDict: CaseDictRow[]
  rankDict: CaseDictRow[]
  handleTodayDict: CaseDictRow[]
  vesselPositionDict: CaseDictRow[]
  inqTypeQDict: CaseDictRow[]
}> {
  const [
    vesselNames,
    invoiceNumbers,
    orderNumbers,
    caseProgresses,
    caseInquiryTypes,
    caseInCharges,
    caseRanks,
    progressDict,
    urgentDict,
    inquiryTypeDict,
    inchargeDict,
    rankDict,
    cDict,
    qDict,
  ] = await Promise.all([
    query<{ vessel_name: string | null }[]>(
      "SELECT DISTINCT vessel_name FROM `case_list` WHERE vessel_name IS NOT NULL AND vessel_name <> '' ORDER BY vessel_name"
    ),
    query<{ invoice_number: string | null }[]>(
      "SELECT DISTINCT invoice_number FROM `case_list` WHERE invoice_number IS NOT NULL AND invoice_number <> '' ORDER BY invoice_number"
    ),
    query<{ order_number: string | null }[]>(
      "SELECT DISTINCT order_number FROM `case_list` WHERE order_number IS NOT NULL AND order_number <> '' ORDER BY order_number"
    ),
    query<{ case_progress: string | null }[]>(
      "SELECT DISTINCT case_progress FROM `case_list` WHERE case_progress IS NOT NULL AND case_progress <> '' ORDER BY case_progress"
    ),
    query<{ case_inquiry_type: string | null }[]>(
      "SELECT DISTINCT case_inquiry_type FROM `case_list` WHERE case_inquiry_type IS NOT NULL AND case_inquiry_type <> '' ORDER BY case_inquiry_type"
    ),
    query<{ case_incharge: string | null }[]>(
      "SELECT DISTINCT case_incharge FROM `case_list` WHERE case_incharge IS NOT NULL AND case_incharge <> '' ORDER BY case_incharge"
    ),
    query<{ case_rank: string | null }[]>(
      "SELECT DISTINCT case_rank FROM `case_list` WHERE case_rank IS NOT NULL AND case_rank <> '' ORDER BY case_rank"
    ),
    getCaseDictByKeyPrefix('R'),
    getCaseDictByKeyPrefix('B'),
    getCaseDictByKeyPrefix('A'),
    getCaseDictByKeyPrefix('E'),
    getCaseDictByKeyPrefix('D'),
    getCaseDictByKeyPrefix('C'),
    getCaseDictByKeyPrefix('Q'),
  ])
  return {
    vesselNames: flattenUnique(vesselNames.map((r) => r.vessel_name)),
    invoiceNumbers: flattenUnique(invoiceNumbers.map((r) => r.invoice_number)),
    orderNumbers: flattenUnique(orderNumbers.map((r) => r.order_number)),
    caseProgresses: flattenUnique(caseProgresses.map((r) => r.case_progress)),
    caseInquiryTypes: flattenUnique(caseInquiryTypes.map((r) => r.case_inquiry_type)),
    caseInCharges: flattenUnique(caseInCharges.map((r) => r.case_incharge)),
    caseRanks: flattenUnique(caseRanks.map((r) => r.case_rank)),
    progressDict,
    urgentDict,
    inquiryTypeDict,
    inchargeDict,
    rankDict,
    handleTodayDict: urgentDict,
    vesselPositionDict: cDict ?? [],
    inqTypeQDict: qDict ?? [],
  }
}

export async function getCaseListPaginated(params: {
  page?: number
  pageSize?: number
  vesselName?: string
  invoiceNumber?: string
  orderNumber?: string
  caseInquiryKeyword?: string
  caseInquiryDateFrom?: string
  caseInquiryDateTo?: string
  caseProgress?: string | string[]
  caseUrgent?: string | string[]
  caseShouldHandleToday?: string | string[]
  caseInquiryType?: string | string[]
  caseIncharge?: string | string[]
  caseRank?: string | string[]
  vesselPosition?: string | string[]
}): Promise<{
  rows: CaseListRow[]
  total: number
  page: number
  pageSize: number
}> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.vesselName && params.vesselName.trim() !== '') {
    whereClauses.push('vessel_name LIKE ?')
    whereParams.push(`%${params.vesselName}%`)
  }
  if (params.caseInquiryKeyword && params.caseInquiryKeyword.trim() !== '') {
    const kw = `%${params.caseInquiryKeyword}%`
    whereClauses.push(
      '(case_inquiry_keyword LIKE ? OR invoice_number LIKE ? OR order_number LIKE ?)'
    )
    whereParams.push(kw, kw, kw)
  } else {
    if (params.invoiceNumber && params.invoiceNumber.trim() !== '') {
      whereClauses.push('invoice_number LIKE ?')
      whereParams.push(`%${params.invoiceNumber}%`)
    }
    if (params.orderNumber && params.orderNumber.trim() !== '') {
      whereClauses.push('order_number LIKE ?')
      whereParams.push(`%${params.orderNumber}%`)
    }
  }
  const normDate = (raw: string): string => {
    const s = String(raw).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-')
    if (/^\d{8}$/.test(s))
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    return s
  }
  if (params.caseInquiryDateFrom && params.caseInquiryDateFrom.trim() !== '') {
    whereClauses.push('case_inquiry_date >= ?')
    whereParams.push(normDate(params.caseInquiryDateFrom))
  }
  if (params.caseInquiryDateTo && params.caseInquiryDateTo.trim() !== '') {
    whereClauses.push('case_inquiry_date <= ?')
    whereParams.push(normDate(params.caseInquiryDateTo))
  }
  const pushInClauses = (
    col: string,
    raw: string | string[] | undefined,
    opts?: { splitComma?: boolean }
  ) => {
    if (!raw) return
    const arr = Array.isArray(raw)
      ? raw.map((s) => String(s).trim()).filter(Boolean)
      : [String(raw).trim()].filter(Boolean)
    if (arr.length === 0) return
    if (opts?.splitComma) {
      const ors: string[] = []
      for (const val of arr) {
        ors.push(`(',' || REPLACE(${col}, ', ', ',') || ',' LIKE ?)`)
        whereParams.push(`%,${val},%`)
      }
      whereClauses.push(`(${ors.join(' OR ')})`)
    } else {
      const placeholders = arr.map(() => '?').join(', ')
      whereClauses.push(`${col} IN (${placeholders})`)
      for (const val of arr) whereParams.push(val)
    }
  }
  pushInClauses('case_progress', params.caseProgress)
  pushInClauses('case_urgent', params.caseUrgent)
  pushInClauses('case_should_handle_today', params.caseShouldHandleToday)
  pushInClauses('case_inquiry_type', params.caseInquiryType)
  pushInClauses('case_incharge', params.caseIncharge, { splitComma: true })
  pushInClauses('case_rank', params.caseRank)
  pushInClauses('vessel_position', params.vesselPosition)

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`case_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`case_list\` ${whereSql} ORDER BY case_inquiry_date DESC, case_id DESC LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<CaseListRow[]>(dataSql, [
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

export async function createCaseList(data: {
  vessel_name?: string | null
  invoice_number?: string | null
  order_number?: string | null
  case_inquiry_keyword?: string | null
  case_progress?: string | null
  case_urgent?: string | null
  case_inquiry_type?: string | null
  case_inquiry_date?: string | null
  case_follow_date?: string | null
  case_uptodate_date?: string | null
  case_should_handle_today?: string | null
  owner_following?: string | null
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
  case_settlement_done?: string | null
  case_epd?: string | null
  case_spd?: string | null
  case_incharge?: string | null
  case_memo_name?: string | null
  case_memo_address?: string | null
  case_rank?: string | null
}): Promise<CaseListRow> {
  const result = await execute(
    `INSERT INTO \`case_list\`
      (vessel_name, invoice_number, order_number, case_inquiry_keyword,
       case_progress, case_urgent, case_inquiry_type, case_inquiry_date,
       case_follow_date, case_uptodate_date, case_should_handle_today,
       owner_following, shipyard_business, case_agent, case_superintendent,
       case_surveyor, case_delivery_or_service_incharge, case_delivery_or_service_deadline,
       case_eta_cargo_ready_date, case_etb_cargo_departure_date, case_etd_cargo_delivery_date,
       vessel_position, case_settlement_done, case_epd, case_spd,
       case_incharge, case_memo_name, case_memo_address, case_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.vessel_name ?? null,
      data.invoice_number ?? null,
      data.order_number ?? null,
      data.case_inquiry_keyword ?? null,
      data.case_progress ?? null,
      data.case_urgent ?? null,
      data.case_inquiry_type ?? null,
      data.case_inquiry_date ?? null,
      data.case_follow_date ?? null,
      data.case_uptodate_date ?? null,
      data.case_should_handle_today ?? null,
      data.owner_following ?? null,
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
      data.case_memo_name ?? null,
      data.case_memo_address ?? null,
      data.case_rank ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create case_list row')
  const created = await getCaseListById(newId)
  if (!created) throw new Error('Failed to create case_list row')
  await auditInsert('case_list', created, {
    excludeFields: ['case_id'],
    primaryKeyField: 'case_id',
  })
  return created
}

export async function updateCaseList(
  caseId: number,
  data: {
    vessel_name?: string | null
    invoice_number?: string | null
    order_number?: string | null
    case_inquiry_keyword?: string | null
    case_progress?: string | null
    case_urgent?: string | null
    case_inquiry_type?: string | null
    case_inquiry_date?: string | null
    case_follow_date?: string | null
    case_uptodate_date?: string | null
    case_should_handle_today?: string | null
    owner_following?: string | null
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
    case_settlement_done?: string | null
    case_epd?: string | null
    case_spd?: string | null
    case_incharge?: string | null
    case_memo_name?: string | null
    case_memo_address?: string | null
    case_rank?: string | null
  }
): Promise<CaseListRow> {
  const oldRow = await getCaseListById(caseId)
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const keys: Array<keyof typeof data> = [
    'vessel_name',
    'invoice_number',
    'order_number',
    'case_inquiry_keyword',
    'case_progress',
    'case_urgent',
    'case_inquiry_type',
    'case_inquiry_date',
    'case_follow_date',
    'case_uptodate_date',
    'case_should_handle_today',
    'owner_following',
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
    'case_memo_name',
    'case_memo_address',
    'case_rank',
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
    if (!oldRow) throw new Error('Case not found')
    return oldRow
  }
  params.push(caseId)
  await execute(
    `UPDATE \`case_list\` SET ${sets.join(', ')} WHERE case_id = ?`,
    params as ExecuteValues
  )
  const newRow = await getCaseListById(caseId)
  if (!newRow) throw new Error('Failed to update case_list row')
  if (oldRow) {
    await auditUpdate('case_list', oldRow, newRow, data, {
      excludeFields: ['case_id'],
      primaryKeyField: 'case_id',
    })
  }
  return newRow
}

export async function deleteCaseList(caseId: number): Promise<boolean> {
  const row = await getCaseListById(caseId)
  const result = await execute(
    'DELETE FROM `case_list` WHERE case_id = ?',
    [caseId]
  )
  const success = result.affectedRows > 0
  if (success && row) {
    await auditDelete('case_list', row, {
      excludeFields: ['case_id'],
      primaryKeyField: 'case_id',
    })
  }
  return success
}

export async function deleteCaseListBulk(
  caseIds: number[]
): Promise<number> {
  if (caseIds.length === 0) return 0
  const placeholders = caseIds.map(() => '?').join(', ')
  const rawRows = await query<CaseListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`case_list\` WHERE case_id IN (${placeholders})`,
    caseIds
  )
  const rows = rawRows.map(normalizeRow)
  const result = await execute(
    `DELETE FROM \`case_list\` WHERE case_id IN (${placeholders})`,
    caseIds
  )
  if (rows.length > 0) {
    await auditBulkDelete('case_list', rows, {
      excludeFields: ['case_id'],
      primaryKeyField: 'case_id',
    })
  }
  return Number(result.affectedRows)
}

function normalizeRow(row: any): CaseListRow {
  return {
    case_id: Number(row.case_id),
    vessel_name: row.vessel_name ? String(row.vessel_name) : null,
    invoice_number: row.invoice_number ? String(row.invoice_number) : null,
    order_number: row.order_number ? String(row.order_number) : null,
    case_inquiry_keyword: row.case_inquiry_keyword ? String(row.case_inquiry_keyword) : null,
    case_progress: row.case_progress ? String(row.case_progress) : null,
    case_urgent: row.case_urgent ? String(row.case_urgent) : null,
    case_inquiry_type: row.case_inquiry_type ? String(row.case_inquiry_type) : null,
    case_inquiry_date: row.case_inquiry_date ? String(row.case_inquiry_date) : null,
    case_follow_date: row.case_follow_date ? String(row.case_follow_date) : null,
    case_uptodate_date: row.case_uptodate_date ? String(row.case_uptodate_date) : null,
    case_should_handle_today: row.case_should_handle_today ? String(row.case_should_handle_today) : null,
    owner_following: row.owner_following ? String(row.owner_following) : null,
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
    case_settlement_done: row.case_settlement_done ? String(row.case_settlement_done) : null,
    case_epd: row.case_epd ? String(row.case_epd) : null,
    case_spd: row.case_spd ? String(row.case_spd) : null,
    case_incharge: row.case_incharge ? String(row.case_incharge) : null,
    case_memo_name: row.case_memo_name ? String(row.case_memo_name) : null,
    case_memo_address: row.case_memo_address ? String(row.case_memo_address) : null,
    case_rank: row.case_rank ? String(row.case_rank) : null,
  }
}
