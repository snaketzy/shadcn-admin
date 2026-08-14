import { query, execute, listTables, describeTable, type ExecuteValues } from './db'

export interface CaseMemoRow {
  memo_id: number
  case_id: number
  case_memo_date: string | null
  case_memo_content: string | null
  case_memo_remark: string | null
  case_memo_attachement: string | null
  case_memo_timestamp: string | null
}

let _ensureCaseMemoTablePromise: Promise<void> | null = null

export async function ensureCaseMemoTable(): Promise<void> {
  if (_ensureCaseMemoTablePromise) return _ensureCaseMemoTablePromise
  _ensureCaseMemoTablePromise = (async () => {
    const TABLE_NAME = 'case_memo'
    try {
      const tables = await listTables()
      const hasTable = tables.some((t) => t === TABLE_NAME)
      if (!hasTable) {
        await execute(
          `CREATE TABLE \`${TABLE_NAME}\` (
            \`memo_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
            \`case_id\` BIGINT UNSIGNED NOT NULL COMMENT '关联案件ID（case_list.case_id）',
            \`case_memo_date\` DATETIME NULL COMMENT '备忘录日期（精确到分钟）',
            \`case_memo_content\` TEXT NULL COMMENT '备忘录内容',
            \`case_memo_remark\` VARCHAR(1024) NULL COMMENT '备忘录备注',
            \`case_memo_attachement\` MEDIUMTEXT NULL COMMENT '备忘录附件（JSON数组字符串，每项含name/size/type/data[base64]）',
            \`case_memo_timestamp\` DATETIME NULL COMMENT '保存时的当前时间戳',
            PRIMARY KEY (\`memo_id\`),
            KEY \`idx_case_memo_case_id\` (\`case_id\`),
            KEY \`idx_case_memo_date\` (\`case_memo_date\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='案件备忘录表（一条案件多条备注）'`
        )
      } else {
        const info = await describeTable(TABLE_NAME)
        const existingCols = new Set(info.columns.map((c) => c.field))
        const needCols: Array<{ name: string; def: string }> = [
          { name: 'memo_id', def: 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT \'主键\'' },
          { name: 'case_id', def: 'BIGINT UNSIGNED NOT NULL COMMENT \'关联案件ID\' AFTER \`memo_id\'' },
          { name: 'case_memo_date', def: 'DATETIME NULL COMMENT \'备忘录日期（精确到分钟）\' AFTER \`case_id\'' },
          { name: 'case_memo_content', def: 'TEXT NULL COMMENT \'备忘录内容\' AFTER \`case_memo_date\'' },
          { name: 'case_memo_remark', def: 'VARCHAR(1024) NULL COMMENT \'备忘录备注\' AFTER \`case_memo_content\'' },
          { name: 'case_memo_attachement', def: 'MEDIUMTEXT NULL COMMENT \'备忘录附件（JSON数组）\' AFTER \`case_memo_remark\'' },
          { name: 'case_memo_timestamp', def: 'DATETIME NULL COMMENT \'保存时间戳\' AFTER \`case_memo_attachement\'' },
        ]
        for (const col of needCols) {
          if (!existingCols.has(col.name)) {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${col.name}\` ${col.def}`
            )
          }
        }
        if (!info.indexes.some((i) => i.name === 'idx_case_memo_case_id')) {
          try {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD INDEX \`idx_case_memo_case_id\` (\`case_id\`)`
            )
          } catch (_e) {
            // ignore index already exists
          }
        }
      }
    } catch (e) {
      _ensureCaseMemoTablePromise = null
      throw e
    }
  })()
  return _ensureCaseMemoTablePromise
}

function normalizeMemoRow(row: any): CaseMemoRow {
  return {
    memo_id: row.memo_id != null ? Number(row.memo_id) : 0,
    case_id: row.case_id != null ? Number(row.case_id) : 0,
    case_memo_date:
      row.case_memo_date != null && row.case_memo_date !== ''
        ? String(row.case_memo_date)
        : null,
    case_memo_content:
      row.case_memo_content != null ? String(row.case_memo_content) : null,
    case_memo_remark:
      row.case_memo_remark != null ? String(row.case_memo_remark) : null,
    case_memo_attachement:
      row.case_memo_attachement != null
        ? String(row.case_memo_attachement)
        : null,
    case_memo_timestamp:
      row.case_memo_timestamp != null && row.case_memo_timestamp !== ''
        ? String(row.case_memo_timestamp)
        : null,
  }
}

export async function getCaseMemosByCaseId(
  caseId: number
): Promise<CaseMemoRow[]> {
  if (!caseId || !Number.isFinite(caseId)) return []
  const rows = await query<any[]>(
    `SELECT memo_id, case_id, case_memo_date, case_memo_content, case_memo_remark, case_memo_attachement, case_memo_timestamp
     FROM \`case_memo\` WHERE case_id = ? ORDER BY case_memo_date DESC, memo_id DESC`,
    [caseId]
  )
  return (rows ?? []).map(normalizeMemoRow)
}

export async function createCaseMemo(data: {
  case_id: number
  case_memo_date?: string | null
  case_memo_content?: string | null
  case_memo_remark?: string | null
  case_memo_attachement?: string | null
  case_memo_timestamp?: string | null
}): Promise<CaseMemoRow> {
  if (!data.case_id || !Number.isFinite(data.case_id)) {
    throw new Error('createCaseMemo: case_id is required')
  }
  const nowIso = new Date()
  const y = nowIso.getFullYear()
  const m = String(nowIso.getMonth() + 1).padStart(2, '0')
  const d = String(nowIso.getDate()).padStart(2, '0')
  const hh = String(nowIso.getHours()).padStart(2, '0')
  const mm = String(nowIso.getMinutes()).padStart(2, '0')
  const ss = String(nowIso.getSeconds()).padStart(2, '0')
  const defaultTimestamp = `${y}-${m}-${d} ${hh}:${mm}:${ss}`

  const memoDateRaw = data.case_memo_date ?? null
  let memoDateDb: string | null = null
  if (memoDateRaw && String(memoDateRaw).trim() !== '') {
    const s = String(memoDateRaw).trim()
    const normalized = s.replace('T', ' ').slice(0, 16)
    memoDateDb = normalized.length === 16 ? `${normalized}:00` : s
  }

  const timestampRaw = data.case_memo_timestamp ?? defaultTimestamp
  const timestampStr =
    timestampRaw && String(timestampRaw).trim() !== ''
      ? String(timestampRaw).trim().replace('T', ' ').slice(0, 19)
      : defaultTimestamp

  const params: ExecuteValues = [
    data.case_id,
    memoDateDb,
    data.case_memo_content != null && String(data.case_memo_content).trim() !== ''
      ? String(data.case_memo_content)
      : null,
    data.case_memo_remark != null && String(data.case_memo_remark).trim() !== ''
      ? String(data.case_memo_remark)
      : null,
    data.case_memo_attachement != null &&
    String(data.case_memo_attachement).trim() !== ''
      ? String(data.case_memo_attachement)
      : null,
    timestampStr,
  ]

  const result = await execute(
    `INSERT INTO \`case_memo\`
      (case_id, case_memo_date, case_memo_content, case_memo_remark, case_memo_attachement, case_memo_timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    params
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create case_memo')
  const rows = await query<any[]>(
    `SELECT memo_id, case_id, case_memo_date, case_memo_content, case_memo_remark, case_memo_attachement, case_memo_timestamp
     FROM \`case_memo\` WHERE memo_id = ? LIMIT 1`,
    [newId]
  )
  const row = rows?.[0]
  if (!row) throw new Error('Failed to read created case_memo')
  return normalizeMemoRow(row)
}
