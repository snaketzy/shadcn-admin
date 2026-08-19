import { query, execute, type ExecuteValues, getPool } from './db'

export interface CaseInquiryListRow {
  case_inquiry_id: number
  case_id: number
  case_inquiry_division_id: number | null
  case_inquiry_type: string | null
  case_inquired_date: string | null
  case_inquiry_remark: string | null
}

const INQUIRY_SELECT_COLS = `
  case_inquiry_id, case_id, case_inquiry_division_id, case_inquiry_type,
  case_inquired_date, case_inquiry_remark
`

function normalizeInquiryRow(row: any): CaseInquiryListRow {
  const rawDate = row.case_inquired_date
  let dateStr: string | null = null
  if (rawDate != null && rawDate !== '') {
    const d = new Date(String(rawDate))
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      dateStr = `${y}-${m}-${day} ${hh}:${mm}`
    } else {
      const s = String(rawDate)
      dateStr = s.length >= 16 ? s.slice(0, 16) : s
    }
  }
  return {
    case_inquiry_id: Number(row.case_inquiry_id),
    case_id: Number(row.case_id),
    case_inquiry_division_id:
      row.case_inquiry_division_id == null || row.case_inquiry_division_id === ''
        ? null
        : Number(row.case_inquiry_division_id),
    case_inquiry_type: row.case_inquiry_type
      ? String(row.case_inquiry_type)
      : null,
    case_inquired_date: dateStr,
    case_inquiry_remark: row.case_inquiry_remark
      ? String(row.case_inquiry_remark)
      : null,
  }
}

export async function getCaseInquiryListByCaseId(
  caseId: number
): Promise<CaseInquiryListRow[]> {
  const rows = await query<any[]>(
    `SELECT ${INQUIRY_SELECT_COLS} FROM \`case_inquiry_list\`
     WHERE case_id = ? ORDER BY case_inquiry_id`,
    [caseId]
  )
  return rows.map(normalizeInquiryRow)
}

export async function getCaseInquiryListByCaseIds(
  caseIds: number[]
): Promise<CaseInquiryListRow[]> {
  if (caseIds.length === 0) return []
  const placeholders = caseIds.map(() => '?').join(', ')
  const rows = await query<any[]>(
    `SELECT ${INQUIRY_SELECT_COLS} FROM \`case_inquiry_list\`
     WHERE case_id IN (${placeholders}) ORDER BY case_id, case_inquiry_id`,
    caseIds.map((n) => Number(n))
  )
  return rows.map(normalizeInquiryRow)
}

export async function createCaseInquiryListBulk(
  rows: Array<{
    case_id: number
    case_inquiry_division_id: number | null
    case_inquiry_type: string | null
    case_inquired_date: string | null
    case_inquiry_remark: string | null
  }>
): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(', ')
  const params: ExecuteValues[] = []
  for (const r of rows) {
    params.push(
      Number(r.case_id),
      r.case_inquiry_division_id == null
        ? null
        : Number(r.case_inquiry_division_id),
      r.case_inquiry_type ?? null,
      r.case_inquired_date ?? null,
      r.case_inquiry_remark ?? null
    )
  }
  const result = await execute(
    `INSERT INTO \`case_inquiry_list\`
      (case_id, case_inquiry_division_id, case_inquiry_type,
       case_inquired_date, case_inquiry_remark)
     VALUES ${placeholders}`,
    params
  )
  return Number(result.affectedRows)
}

export async function deleteCaseInquiryListByCaseId(caseId: number): Promise<number> {
  const result = await execute(
    'DELETE FROM `case_inquiry_list` WHERE case_id = ?',
    [Number(caseId)]
  )
  return Number(result.affectedRows)
}

export async function replaceCaseInquiryListByCaseId(
  caseId: number,
  rows: Array<{
    case_inquiry_division_id: number | null
    case_inquiry_type: string | null
    case_inquired_date: string | null
    case_inquiry_remark: string | null
  }>
): Promise<{ deleted: number; inserted: number }> {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const [delResult] = (await connection.execute(
      'DELETE FROM `case_inquiry_list` WHERE case_id = ?',
      [Number(caseId)]
    )) as any
    const deleted = Number((delResult as any).affectedRows ?? 0)
    let inserted = 0
    if (rows.length > 0) {
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(', ')
      const params: any[] = []
      for (const r of rows) {
        params.push(
          Number(caseId),
          r.case_inquiry_division_id == null
            ? null
            : Number(r.case_inquiry_division_id),
          r.case_inquiry_type ?? null,
          r.case_inquired_date ?? null,
          r.case_inquiry_remark ?? null
        )
      }
      const [insResult] = (await connection.execute(
        `INSERT INTO \`case_inquiry_list\`
         (case_id, case_inquiry_division_id, case_inquiry_type,
          case_inquired_date, case_inquiry_remark)
         VALUES ${placeholders}`,
        params
      )) as any
      inserted = Number((insResult as any).affectedRows ?? 0)
    }
    await connection.commit()
    return { deleted, inserted }
  } catch (e) {
    try {
      await connection.rollback()
    } catch {
      /* ignore rollback error */
    }
    throw e
  } finally {
    connection.release()
  }
}
