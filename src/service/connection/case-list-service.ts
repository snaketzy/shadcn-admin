import { getCaseDictByKeyPrefix, type CaseDictRow } from './case-dict-service'
import {
  query,
  execute,
  type ExecuteValues,
  describeTable,
  listTables,
} from './db'
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
  case_progress: string | null
  case_urgent: string | null
  case_inquiry_type: string | null
  case_inquiry_date: string | null
  case_follow_date: string | null
  case_uptodate_date: string | null
  case_should_handle_today: string | null
  owner_following: string | null
  owner_following_id: number | null
  shipyard_business: string | null
  case_agent: string | null
  case_superintendent: string | null
  case_superintendent_id: number | null
  case_surveyor: string | null
  case_delivery_or_service_incharge: string | null
  case_delivery_or_service_incharge_id: string | null
  case_delivery_or_service_deadline: string | null
  case_eta_cargo_ready_date: string | null
  case_etb_cargo_departure_date: string | null
  case_etd_cargo_delivery_date: string | null
  vessel_position: string | null
  case_settlement_done: string | null
  case_personal_register_completed: string | null
  case_business_register_completed: string | null
  case_e_filing_completed: string | null
  case_paper_based_filing_completed: string | null
  case_epd: string | null
  case_spd: string | null
  case_incharge: string | null
  case_memo_name: string | null
  case_memo_address: string | null
  case_inquiry_attachments: string | null
  case_settlement_attachments: string | null
  case_remark: string | null
  case_rank: string | null
}

const SELECT_COLS = `
  case_id, vessel_name, invoice_number, order_number,
  case_inquiry_keyword, case_progress, case_urgent, case_inquiry_type,
  case_inquiry_date, case_follow_date, case_uptodate_date, case_should_handle_today,
  owner_following, owner_following_id, shipyard_business, case_agent, case_superintendent, case_superintendent_id,
  case_surveyor, case_delivery_or_service_incharge, case_delivery_or_service_incharge_id, case_delivery_or_service_deadline,
  case_eta_cargo_ready_date, case_etb_cargo_departure_date, case_etd_cargo_delivery_date,
  vessel_position, case_settlement_done,
  case_personal_register_completed, case_business_register_completed, case_e_filing_completed, case_paper_based_filing_completed,
  case_epd, case_spd, case_incharge, case_memo_name, case_memo_address, case_inquiry_attachments, case_settlement_attachments, case_remark, case_rank
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

export async function checkDuplicateInquiryKeyword(params: {
  keyword: string
  excludeCaseId?: number
}): Promise<{
  exists: boolean
  matchedCaseId?: number
  matchedKeyword?: string
}> {
  const rawKeyword = String(params.keyword ?? '')
  const normalizedKeyword = rawKeyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return { exists: false }
  }
  const whereClauses: string[] = [
    'TRIM(LOWER(CAST(case_inquiry_keyword AS CHAR))) = ?',
  ]
  const whereParams: ExecuteValues[] = [normalizedKeyword]
  if (
    params.excludeCaseId != null &&
    !Number.isNaN(Number(params.excludeCaseId))
  ) {
    whereClauses.push('case_id <> ?')
    whereParams.push(Number(params.excludeCaseId))
  }
  const whereSql = whereClauses.join(' AND ')
  const rows = await query<
    { case_id: number; case_inquiry_keyword: string | null }[]
  >(
    `SELECT case_id, case_inquiry_keyword FROM \`case_list\` WHERE ${whereSql} ORDER BY case_id DESC LIMIT 1`,
    whereParams as ExecuteValues[]
  )
  const hit = rows[0]
  if (!hit) return { exists: false }
  return {
    exists: true,
    matchedCaseId: Number(hit.case_id),
    matchedKeyword: hit.case_inquiry_keyword
      ? String(hit.case_inquiry_keyword)
      : undefined,
  }
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
    caseInquiryTypes: flattenUnique(
      caseInquiryTypes.map((r) => r.case_inquiry_type)
    ),
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
  orderNumberHasValue?: boolean
  serviceProjectActive?: boolean
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
  awardSupplierIds?: number[] | string[]
}): Promise<{
  rows: CaseListRow[]
  total: number
  page: number
  pageSize: number
}> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.vesselName && params.vesselName.trim() !== '') {
    whereClauses.push('vessel_name LIKE ?')
    whereParams.push(`%${params.vesselName}%`)
  }
  if (params.orderNumberHasValue) {
    whereClauses.push("order_number IS NOT NULL AND TRIM(order_number) <> ''")
  }
  if (params.serviceProjectActive) {
    whereClauses.push(
      "case_etd_cargo_delivery_date IS NOT NULL AND TRIM(case_etd_cargo_delivery_date) <> '' AND DATE(case_etd_cargo_delivery_date) >= CURDATE()"
    )
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
        ors.push(`(UPPER(CONCAT(',', REPLACE(${col}, ', ', ','), ',')) LIKE ?)`)
        whereParams.push(`%,${String(val).toUpperCase()},%`)
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

  if (
    params.awardSupplierIds &&
    Array.isArray(params.awardSupplierIds) &&
    params.awardSupplierIds.length > 0
  ) {
    const ids = params.awardSupplierIds
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ')
      whereClauses.push(
        `EXISTS (
          SELECT 1 FROM case_inquiry_list i
          LEFT JOIN case_dict d
            ON TRIM(UPPER(COALESCE(d.dict_key, ''))) = TRIM(UPPER(COALESCE(i.case_inquiry_type, '')))
          WHERE i.case_id = case_list.case_id
            AND i.case_inquiry_division_id IN (${placeholders})
            AND (
              UPPER(COALESCE(d.dict_value, '')) REGEXP '中标|WIN|AWARD'
              OR UPPER(COALESCE(d.dict_value_remark, '')) REGEXP '中标|WIN|AWARD'
              OR UPPER(COALESCE(i.case_inquiry_type, '')) REGEXP '中标|WIN|AWARD'
            )
        )`
      )
      for (const id of ids) whereParams.push(id)
    }
  }

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
  owner_following_id?: number | string | null
  shipyard_business?: string | null
  case_agent?: string | null
  case_superintendent?: string | null
  case_superintendent_id?: number | string | null
  case_surveyor?: string | null
  case_delivery_or_service_incharge?: string | null
  case_delivery_or_service_incharge_id?: string | null
  case_delivery_or_service_deadline?: string | null
  case_eta_cargo_ready_date?: string | null
  case_etb_cargo_departure_date?: string | null
  case_etd_cargo_delivery_date?: string | null
  vessel_position?: string | null
  case_settlement_done?: string | null
  case_personal_register_completed?: string | null
  case_business_register_completed?: string | null
  case_e_filing_completed?: string | null
  case_paper_based_filing_completed?: string | null
  case_epd?: string | null
  case_spd?: string | null
  case_incharge?: string | null
  case_memo_name?: string | null
  case_memo_address?: string | null
  case_inquiry_attachments?: string | null
  case_settlement_attachments?: string | null
  case_remark?: string | null
  case_rank?: string | null
}): Promise<CaseListRow> {
  const result = await execute(
    `INSERT INTO \`case_list\`
      (vessel_name, invoice_number, order_number, case_inquiry_keyword,
       case_progress, case_urgent, case_inquiry_type, case_inquiry_date,
       case_follow_date, case_uptodate_date, case_should_handle_today,
       owner_following, owner_following_id, shipyard_business, case_agent, case_superintendent, case_superintendent_id,
       case_surveyor, case_delivery_or_service_incharge, case_delivery_or_service_incharge_id, case_delivery_or_service_deadline,
       case_eta_cargo_ready_date, case_etb_cargo_departure_date, case_etd_cargo_delivery_date,
       vessel_position, case_settlement_done,
       case_personal_register_completed, case_business_register_completed, case_e_filing_completed, case_paper_based_filing_completed,
       case_epd, case_spd, case_incharge, case_memo_name, case_memo_address, case_inquiry_attachments, case_settlement_attachments, case_remark, case_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.owner_following_id != null &&
      data.owner_following_id !== '' &&
      !Number.isNaN(Number(data.owner_following_id))
        ? Number(data.owner_following_id)
        : null,
      data.shipyard_business ?? null,
      data.case_agent ?? null,
      data.case_superintendent ?? null,
      data.case_superintendent_id != null &&
      data.case_superintendent_id !== '' &&
      !Number.isNaN(Number(data.case_superintendent_id))
        ? Number(data.case_superintendent_id)
        : null,
      data.case_surveyor ?? null,
      data.case_delivery_or_service_incharge ?? null,
      data.case_delivery_or_service_incharge_id != null &&
      String(data.case_delivery_or_service_incharge_id).trim().length > 0
        ? String(data.case_delivery_or_service_incharge_id)
        : null,
      data.case_delivery_or_service_deadline ?? null,
      data.case_eta_cargo_ready_date ?? null,
      data.case_etb_cargo_departure_date ?? null,
      data.case_etd_cargo_delivery_date ?? null,
      data.vessel_position ?? null,
      data.case_settlement_done ?? null,
      data.case_personal_register_completed ?? null,
      data.case_business_register_completed ?? null,
      data.case_e_filing_completed ?? null,
      data.case_paper_based_filing_completed ?? null,
      data.case_epd ?? null,
      data.case_spd ?? null,
      data.case_incharge ?? null,
      data.case_memo_name ?? null,
      data.case_memo_address ?? null,
      data.case_inquiry_attachments ?? null,
      data.case_settlement_attachments ?? null,
      data.case_remark ?? null,
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
    owner_following_id?: number | string | null
    shipyard_business?: string | null
    case_agent?: string | null
    case_superintendent?: string | null
    case_superintendent_id?: number | string | null
    case_surveyor?: string | null
    case_delivery_or_service_incharge?: string | null
    case_delivery_or_service_incharge_id?: string | number | null
    case_delivery_or_service_deadline?: string | null
    case_eta_cargo_ready_date?: string | null
    case_etb_cargo_departure_date?: string | null
    case_etd_cargo_delivery_date?: string | null
    vessel_position?: string | null
    case_settlement_done?: string | null
    case_personal_register_completed?: string | null
    case_business_register_completed?: string | null
    case_e_filing_completed?: string | null
    case_paper_based_filing_completed?: string | null
    case_epd?: string | null
    case_spd?: string | null
    case_incharge?: string | null
    case_memo_name?: string | null
    case_memo_address?: string | null
    case_inquiry_attachments?: string | null
    case_settlement_attachments?: string | null
    case_remark?: string | null
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
    'owner_following_id',
    'shipyard_business',
    'case_agent',
    'case_superintendent',
    'case_superintendent_id',
    'case_surveyor',
    'case_delivery_or_service_incharge',
    'case_delivery_or_service_incharge_id',
    'case_delivery_or_service_deadline',
    'case_eta_cargo_ready_date',
    'case_etb_cargo_departure_date',
    'case_etd_cargo_delivery_date',
    'vessel_position',
    'case_settlement_done',
    'case_personal_register_completed',
    'case_business_register_completed',
    'case_e_filing_completed',
    'case_paper_based_filing_completed',
    'case_epd',
    'case_spd',
    'case_incharge',
    'case_memo_name',
    'case_memo_address',
    'case_inquiry_attachments',
    'case_settlement_attachments',
    'case_remark',
    'case_rank',
  ]
  for (const key of keys) {
    if (key in data) {
      sets.push(`\`${key}\` = ?`)
      const v = (data as any)[key]
      if (key === 'owner_following_id' || key === 'case_superintendent_id') {
        if (v == null || v === '' || Number.isNaN(Number(v))) {
          params.push(null)
        } else {
          params.push(Number(v))
        }
        continue
      }
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
  const result = await execute('DELETE FROM `case_list` WHERE case_id = ?', [
    caseId,
  ])
  const success = result.affectedRows > 0
  if (success && row) {
    await auditDelete('case_list', row, {
      excludeFields: ['case_id'],
      primaryKeyField: 'case_id',
    })
  }
  return success
}

export async function deleteCaseListBulk(caseIds: number[]): Promise<number> {
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
    case_inquiry_keyword: row.case_inquiry_keyword
      ? String(row.case_inquiry_keyword)
      : null,
    case_progress: row.case_progress ? String(row.case_progress) : null,
    case_urgent: row.case_urgent ? String(row.case_urgent) : null,
    case_inquiry_type: row.case_inquiry_type
      ? String(row.case_inquiry_type)
      : null,
    case_inquiry_date: row.case_inquiry_date
      ? String(row.case_inquiry_date)
      : null,
    case_follow_date: row.case_follow_date
      ? String(row.case_follow_date)
      : null,
    case_uptodate_date: row.case_uptodate_date
      ? String(row.case_uptodate_date)
      : null,
    case_should_handle_today: row.case_should_handle_today
      ? String(row.case_should_handle_today)
      : null,
    owner_following: row.owner_following ? String(row.owner_following) : null,
    owner_following_id:
      row.owner_following_id != null &&
      row.owner_following_id !== '' &&
      !Number.isNaN(Number(row.owner_following_id))
        ? Number(row.owner_following_id)
        : null,
    shipyard_business: row.shipyard_business
      ? String(row.shipyard_business)
      : null,
    case_agent: row.case_agent ? String(row.case_agent) : null,
    case_superintendent: row.case_superintendent
      ? String(row.case_superintendent)
      : null,
    case_superintendent_id:
      row.case_superintendent_id != null &&
      row.case_superintendent_id !== '' &&
      !Number.isNaN(Number(row.case_superintendent_id))
        ? Number(row.case_superintendent_id)
        : null,
    case_surveyor: row.case_surveyor ? String(row.case_surveyor) : null,
    case_delivery_or_service_incharge: row.case_delivery_or_service_incharge
      ? String(row.case_delivery_or_service_incharge)
      : null,
    case_delivery_or_service_incharge_id:
      row.case_delivery_or_service_incharge_id
        ? String(row.case_delivery_or_service_incharge_id)
        : null,
    case_delivery_or_service_deadline: row.case_delivery_or_service_deadline
      ? String(row.case_delivery_or_service_deadline)
      : null,
    case_eta_cargo_ready_date: row.case_eta_cargo_ready_date
      ? String(row.case_eta_cargo_ready_date)
      : null,
    case_etb_cargo_departure_date: row.case_etb_cargo_departure_date
      ? String(row.case_etb_cargo_departure_date)
      : null,
    case_etd_cargo_delivery_date: row.case_etd_cargo_delivery_date
      ? String(row.case_etd_cargo_delivery_date)
      : null,
    vessel_position: row.vessel_position ? String(row.vessel_position) : null,
    case_settlement_done: row.case_settlement_done
      ? String(row.case_settlement_done)
      : null,
    case_personal_register_completed: row.case_personal_register_completed
      ? String(row.case_personal_register_completed)
      : null,
    case_business_register_completed: row.case_business_register_completed
      ? String(row.case_business_register_completed)
      : null,
    case_e_filing_completed: row.case_e_filing_completed
      ? String(row.case_e_filing_completed)
      : null,
    case_paper_based_filing_completed: row.case_paper_based_filing_completed
      ? String(row.case_paper_based_filing_completed)
      : null,
    case_epd: row.case_epd ? String(row.case_epd) : null,
    case_spd: row.case_spd ? String(row.case_spd) : null,
    case_incharge: row.case_incharge ? String(row.case_incharge) : null,
    case_memo_name: row.case_memo_name ? String(row.case_memo_name) : null,
    case_memo_address: row.case_memo_address
      ? String(row.case_memo_address)
      : null,
    case_inquiry_attachments: row.case_inquiry_attachments
      ? String(row.case_inquiry_attachments)
      : null,
    case_settlement_attachments: row.case_settlement_attachments
      ? String(row.case_settlement_attachments)
      : null,
    case_remark: row.case_remark ? String(row.case_remark) : null,
    case_rank: row.case_rank ? String(row.case_rank) : null,
  }
}

let _ensureCaseOwnerFollowingIdPromise: Promise<void> | null = null

export async function ensureCaseOwnerFollowingIdColumn(): Promise<void> {
  if (_ensureCaseOwnerFollowingIdPromise)
    return _ensureCaseOwnerFollowingIdPromise
  _ensureCaseOwnerFollowingIdPromise = (async () => {
    const TABLE_NAME = 'case_list'
    const COL_NAME = 'owner_following_id'
    try {
      const info = await describeTable(TABLE_NAME)
      const hasCol = info.columns.some((c) => c.field === COL_NAME)
      if (!hasCol) {
        await execute(
          `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${COL_NAME}\` INT NULL COMMENT '船东联络人ID（对应 owner_list.owner_id）' AFTER \`owner_following\``
        )
      }
      try {
        await execute(
          `UPDATE \`${TABLE_NAME}\` c
           INNER JOIN \`owner_list\` o ON TRIM(COALESCE(c.owner_following, '')) = TRIM(COALESCE(o.owner_name, ''))
           SET c.\`${COL_NAME}\` = o.owner_id
           WHERE c.owner_following IS NOT NULL AND TRIM(c.owner_following) <> '' AND c.\`${COL_NAME}\` IS NULL`
        )
      } catch (e) {
        // ignore backfill errors (e.g. owner_list table missing) — schema change is the critical part
      }
    } catch (e) {
      _ensureCaseOwnerFollowingIdPromise = null
      throw e
    }
  })()
  return _ensureCaseOwnerFollowingIdPromise
}

let _ensureCaseDeliveryServiceInchargeIdPromise: Promise<void> | null = null

export async function ensureCaseDeliveryServiceInchargeIdColumn(): Promise<void> {
  if (_ensureCaseDeliveryServiceInchargeIdPromise)
    return _ensureCaseDeliveryServiceInchargeIdPromise
  _ensureCaseDeliveryServiceInchargeIdPromise = (async () => {
    const TABLE_NAME = 'case_list'
    const COL_NAME = 'case_delivery_or_service_incharge_id'
    try {
      const info = await describeTable(TABLE_NAME)
      const hasCol = info.columns.some((c) => c.field === COL_NAME)
      if (!hasCol) {
        await execute(
          `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${COL_NAME}\` VARCHAR(512) NULL COMMENT '服务负责人多选ID列表，逗号分隔（对应 contact_list.contact_id）' AFTER \`case_delivery_or_service_incharge\``
        )
      }
    } catch (e) {
      _ensureCaseDeliveryServiceInchargeIdPromise = null
      throw e
    }
  })()
  return _ensureCaseDeliveryServiceInchargeIdPromise
}

let _ensureCaseListSchemaPromise: Promise<void> | null = null

export async function ensureCaseListSchema(): Promise<void> {
  if (_ensureCaseListSchemaPromise) return _ensureCaseListSchemaPromise
  _ensureCaseListSchemaPromise = (async () => {
    const TABLE_NAME = 'case_list'
    try {
      const tables = await listTables()
      if (!tables.includes(TABLE_NAME)) {
        await execute(`
          CREATE TABLE \`${TABLE_NAME}\` (
            \`case_id\` INT NOT NULL AUTO_INCREMENT COMMENT '案件ID',
            \`vessel_name\` VARCHAR(128) NULL COMMENT '船名',
            \`invoice_number\` VARCHAR(64) NULL COMMENT '发票号',
            \`order_number\` VARCHAR(64) NULL COMMENT '订单编号',
            \`case_inquiry_keyword\` VARCHAR(512) NULL COMMENT '需求编号/名称',
            \`case_progress\` VARCHAR(16) NULL COMMENT '案件进度',
            \`case_urgent\` VARCHAR(16) NULL COMMENT '紧急程度',
            \`case_inquiry_type\` VARCHAR(16) NULL COMMENT '询价类型',
            \`case_inquiry_date\` DATE NULL COMMENT '询价日期',
            \`case_follow_date\` DATE NULL COMMENT '开始日期',
            \`case_uptodate_date\` DATE NULL COMMENT '跟进日期',
            \`case_should_handle_today\` VARCHAR(16) NULL COMMENT '今日是否应处理',
            \`owner_following\` VARCHAR(128) NULL COMMENT '船东联系人',
            \`owner_following_id\` INT NULL COMMENT '船东联系人ID（对应 owner_list.owner_id）',
            \`shipyard_business\` VARCHAR(128) NULL COMMENT '船厂经营',
            \`case_agent\` VARCHAR(128) NULL COMMENT '代理',
            \`case_superintendent\` VARCHAR(128) NULL COMMENT '机务主管',
            \`case_superintendent_id\` INT NULL COMMENT '机务主管ID（对应 owner_list.owner_id）',
            \`case_surveyor\` VARCHAR(128) NULL COMMENT '验船师',
            \`case_delivery_or_service_incharge\` VARCHAR(512) NULL COMMENT '服务负责人（姓名多选逗号分隔）',
            \`case_delivery_or_service_incharge_id\` VARCHAR(512) NULL COMMENT '服务负责人多选ID列表（对应 contact_list.contact_id）',
            \`case_delivery_or_service_deadline\` DATE NULL COMMENT '交付/服务截止日期',
            \`case_eta_cargo_ready_date\` DATE NULL COMMENT 'ETA货物准备日期',
            \`case_etb_cargo_departure_date\` DATE NULL COMMENT 'ETB货物离港日期',
            \`case_etd_cargo_delivery_date\` DATE NULL COMMENT 'ETD货物交付日期',
            \`vessel_position\` VARCHAR(16) NULL COMMENT '船舶位置',
            \`case_settlement_done\` VARCHAR(16) NULL COMMENT '结算是否完成',
            \`case_personal_register_completed\` VARCHAR(16) NULL COMMENT '已完成个人表登记',
            \`case_business_register_completed\` VARCHAR(16) NULL COMMENT '完成经营表登记',
            \`case_e_filing_completed\` VARCHAR(16) NULL COMMENT '已完成电子归档',
            \`case_paper_based_filing_completed\` VARCHAR(16) NULL COMMENT '已完成纸质归档',
            \`case_epd\` VARCHAR(32) NULL COMMENT 'EPD',
            \`case_spd\` VARCHAR(32) NULL COMMENT 'SPD',
            \`case_incharge\` VARCHAR(16) NULL COMMENT '案件负责人代码',
            \`case_memo_name\` VARCHAR(1024) NULL COMMENT '案件备忘名称',
            \`case_memo_address\` VARCHAR(1024) NULL COMMENT '案件备忘地址',
            \`case_inquiry_attachments\` MEDIUMTEXT NULL COMMENT '案件需求文档附件(JSON array)',
            \`case_settlement_attachments\` MEDIUMTEXT NULL COMMENT '案件结算文档附件(JSON array)',
            \`case_remark\` TEXT NULL COMMENT '案件备注',
            \`case_rank\` VARCHAR(16) NULL COMMENT '案件等级',
            PRIMARY KEY (\`case_id\`),
            KEY \`idx_case_inquiry_date\` (\`case_inquiry_date\`),
            KEY \`idx_vessel_name\` (\`vessel_name\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='案件列表'
        `)
        return
      }
      const info = await describeTable(TABLE_NAME)
      const byName = new Map(info.columns.map((c) => [c.field, c]))
      const spec: Array<{ col: string; def: string; after: string }> = [
        {
          col: 'case_id',
          def: "INT NOT NULL AUTO_INCREMENT COMMENT '案件ID'",
          after: 'FIRST',
        },
        {
          col: 'vessel_name',
          def: "VARCHAR(128) NULL COMMENT '船名'",
          after: 'AFTER case_id',
        },
        {
          col: 'invoice_number',
          def: "VARCHAR(64) NULL COMMENT '发票号'",
          after: 'AFTER vessel_name',
        },
        {
          col: 'order_number',
          def: "VARCHAR(64) NULL COMMENT '订单编号'",
          after: 'AFTER invoice_number',
        },
        {
          col: 'case_inquiry_keyword',
          def: "VARCHAR(512) NULL COMMENT '需求编号/名称'",
          after: 'AFTER order_number',
        },
        {
          col: 'case_progress',
          def: "VARCHAR(16) NULL COMMENT '案件进度'",
          after: 'AFTER case_inquiry_keyword',
        },
        {
          col: 'case_urgent',
          def: "VARCHAR(16) NULL COMMENT '紧急程度'",
          after: 'AFTER case_progress',
        },
        {
          col: 'case_inquiry_type',
          def: "VARCHAR(16) NULL COMMENT '询价类型'",
          after: 'AFTER case_urgent',
        },
        {
          col: 'case_inquiry_date',
          def: "DATE NULL COMMENT '询价日期'",
          after: 'AFTER case_inquiry_type',
        },
        {
          col: 'case_follow_date',
          def: "DATE NULL COMMENT '开始日期'",
          after: 'AFTER case_inquiry_date',
        },
        {
          col: 'case_uptodate_date',
          def: "DATE NULL COMMENT '跟进日期'",
          after: 'AFTER case_follow_date',
        },
        {
          col: 'case_should_handle_today',
          def: "VARCHAR(16) NULL COMMENT '今日是否应处理'",
          after: 'AFTER case_uptodate_date',
        },
        {
          col: 'owner_following',
          def: "VARCHAR(128) NULL COMMENT '船东联系人'",
          after: 'AFTER case_should_handle_today',
        },
        {
          col: 'owner_following_id',
          def: "INT NULL COMMENT '船东联系人ID（对应 owner_list.owner_id）'",
          after: 'AFTER owner_following',
        },
        {
          col: 'shipyard_business',
          def: "VARCHAR(128) NULL COMMENT '船厂经营'",
          after: 'AFTER owner_following_id',
        },
        {
          col: 'case_agent',
          def: "VARCHAR(128) NULL COMMENT '代理'",
          after: 'AFTER shipyard_business',
        },
        {
          col: 'case_superintendent',
          def: "VARCHAR(128) NULL COMMENT '机务主管'",
          after: 'AFTER case_agent',
        },
        {
          col: 'case_superintendent_id',
          def: "INT NULL COMMENT '机务主管ID（对应 owner_list.owner_id）'",
          after: 'AFTER case_superintendent',
        },
        {
          col: 'case_surveyor',
          def: "VARCHAR(128) NULL COMMENT '验船师'",
          after: 'AFTER case_superintendent_id',
        },
        {
          col: 'case_delivery_or_service_incharge',
          def: "VARCHAR(512) NULL COMMENT '服务负责人（姓名多选逗号分隔）'",
          after: 'AFTER case_surveyor',
        },
        {
          col: 'case_delivery_or_service_incharge_id',
          def: "VARCHAR(512) NULL COMMENT '服务负责人多选ID列表（对应 contact_list.contact_id）'",
          after: 'AFTER case_delivery_or_service_incharge',
        },
        {
          col: 'case_delivery_or_service_deadline',
          def: "DATE NULL COMMENT '交付/服务截止日期'",
          after: 'AFTER case_delivery_or_service_incharge_id',
        },
        {
          col: 'case_eta_cargo_ready_date',
          def: "DATE NULL COMMENT 'ETA货物准备日期'",
          after: 'AFTER case_delivery_or_service_deadline',
        },
        {
          col: 'case_etb_cargo_departure_date',
          def: "DATE NULL COMMENT 'ETB货物离港日期'",
          after: 'AFTER case_eta_cargo_ready_date',
        },
        {
          col: 'case_etd_cargo_delivery_date',
          def: "DATE NULL COMMENT 'ETD货物交付日期'",
          after: 'AFTER case_etb_cargo_departure_date',
        },
        {
          col: 'vessel_position',
          def: "VARCHAR(16) NULL COMMENT '船舶位置'",
          after: 'AFTER case_etd_cargo_delivery_date',
        },
        {
          col: 'case_settlement_done',
          def: "VARCHAR(16) NULL COMMENT '结算是否完成'",
          after: 'AFTER vessel_position',
        },
        {
          col: 'case_personal_register_completed',
          def: "VARCHAR(16) NULL COMMENT '已完成个人表登记'",
          after: 'AFTER case_settlement_done',
        },
        {
          col: 'case_business_register_completed',
          def: "VARCHAR(16) NULL COMMENT '完成经营表登记'",
          after: 'AFTER case_personal_register_completed',
        },
        {
          col: 'case_e_filing_completed',
          def: "VARCHAR(16) NULL COMMENT '已完成电子归档'",
          after: 'AFTER case_business_register_completed',
        },
        {
          col: 'case_paper_based_filing_completed',
          def: "VARCHAR(16) NULL COMMENT '已完成纸质归档'",
          after: 'AFTER case_e_filing_completed',
        },
        {
          col: 'case_epd',
          def: "VARCHAR(32) NULL COMMENT 'EPD'",
          after: 'AFTER case_paper_based_filing_completed',
        },
        {
          col: 'case_spd',
          def: "VARCHAR(32) NULL COMMENT 'SPD'",
          after: 'AFTER case_epd',
        },
        {
          col: 'case_incharge',
          def: "VARCHAR(16) NULL COMMENT '案件负责人代码'",
          after: 'AFTER case_spd',
        },
        {
          col: 'case_memo_name',
          def: "VARCHAR(1024) NULL COMMENT '案件备忘名称'",
          after: 'AFTER case_incharge',
        },
        {
          col: 'case_memo_address',
          def: "VARCHAR(1024) NULL COMMENT '案件备忘地址'",
          after: 'AFTER case_memo_name',
        },
        {
          col: 'case_inquiry_attachments',
          def: "MEDIUMTEXT NULL COMMENT '案件需求文档附件(JSON array)'",
          after: 'AFTER case_memo_address',
        },
        {
          col: 'case_settlement_attachments',
          def: "MEDIUMTEXT NULL COMMENT '案件结算文档附件(JSON array)'",
          after: 'AFTER case_inquiry_attachments',
        },
        {
          col: 'case_remark',
          def: "TEXT NULL COMMENT '案件备注'",
          after: 'AFTER case_settlement_attachments',
        },
        {
          col: 'case_rank',
          def: "VARCHAR(16) NULL COMMENT '案件等级'",
          after: 'AFTER case_remark',
        },
      ]
      for (const { col, def, after } of spec) {
        const existing = byName.get(col)
        if (!existing) {
          try {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${col}\` ${def} ${after}`
            )
          } catch (err) {
            if (col === 'case_id') continue
            throw err
          }
        }
      }
    } catch (e) {
      _ensureCaseListSchemaPromise = null
      throw e
    }
  })()
  return _ensureCaseListSchemaPromise
}
