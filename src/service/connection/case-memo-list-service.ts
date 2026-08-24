import { query, execute, describeTable, type ExecuteValues } from './db'

export interface CaseMemoListRow {
  case_memo_id: number
  case_id: number
  case_memo_date: string | null
  case_memo_content: string | null
  case_memo_remark: string | null
  case_memo_attachment: string | null
  created_at: string | null
  updated_at: string | null
}

const MEMO_SELECT_COLS = `
  case_memo_id, case_id, case_memo_date, case_memo_content, case_memo_remark, case_memo_attachment,
  created_at, updated_at
`

function normalizeMemoDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).trim()
  if (!s) return null
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  }
  return s.length >= 16 ? s.slice(0, 16) : s
}

export function toValidMemoDateOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  let s = String(raw).trim()
  if (!s) return null
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const n = new Date()
    const y = n.getFullYear()
    const m = String(n.getMonth() + 1).padStart(2, '0')
    const d = String(n.getDate()).padStart(2, '0')
    s = `${y}-${m}-${d} ${s.slice(0, 5)}`
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  }
  return null
}

function normalizeTs(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const d = new Date(String(raw))
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
  }
  return String(raw)
}

function normalizeMemoRow(row: any): CaseMemoListRow {
  return {
    case_memo_id: Number(row.case_memo_id),
    case_id: Number(row.case_id),
    case_memo_date: normalizeMemoDate(row.case_memo_date),
    case_memo_content:
      row.case_memo_content == null || row.case_memo_content === ''
        ? null
        : String(row.case_memo_content),
    case_memo_remark:
      row.case_memo_remark == null || row.case_memo_remark === ''
        ? null
        : String(row.case_memo_remark),
    case_memo_attachment:
      row.case_memo_attachment == null || row.case_memo_attachment === ''
        ? null
        : String(row.case_memo_attachment),
    created_at: normalizeTs(row.created_at),
    updated_at: normalizeTs(row.updated_at),
  }
}

const TABLE_NAME = 'case_memo_list'

let _ensureCaseMemoTablePromise: Promise<void> | null = null

export async function ensureCaseMemoTable(): Promise<void> {
  if (_ensureCaseMemoTablePromise) return _ensureCaseMemoTablePromise
  _ensureCaseMemoTablePromise = (async () => {
    try {
      const tables = await query<Record<string, string>[]>(
        `SHOW TABLES LIKE '${TABLE_NAME}'`
      )
      if (tables.length === 0) {
        await execute(`
          CREATE TABLE \`${TABLE_NAME}\` (
            case_memo_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '案件备忘主键ID',
            case_id BIGINT UNSIGNED NOT NULL COMMENT '对应case_list.case_id',
            case_memo_date DATETIME NULL COMMENT '备忘日期时间',
            case_memo_content TEXT NULL COMMENT '备忘内容',
            case_memo_remark VARCHAR(1024) NULL COMMENT '备忘备注',
            case_memo_attachment TEXT NULL COMMENT '备忘附件JSON数组',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            PRIMARY KEY (case_memo_id),
            KEY idx_case_id (case_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='案件备忘列表'
        `)
      } else {
        const info = await describeTable(TABLE_NAME)
        const hasCol = (name: string) =>
          info.columns.some((c) => c.field === name)
        const colType = (name: string) =>
          info.columns.find((c) => c.field === name)?.type ?? ''

        // ===== 1. case_memo_id =====
        if (!hasCol('case_memo_id')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '案件备忘主键ID' FIRST`
          )
        }

        // ===== 2. case_id =====
        if (!hasCol('case_id')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_id BIGINT UNSIGNED NOT NULL COMMENT '对应case_list.case_id' AFTER case_memo_id`
          )
        }
        // 如果 case_id 加了 UNIQUE（只能存一条），改成普通索引
        const caseIdColumn = info.columns.find((c) => c.field === 'case_id')
        if (caseIdColumn && caseIdColumn.key === 'UNI') {
          // 先找这个 unique 索引名字
          const idxRows = await query<
            { INDEX_NAME: string; COLUMN_NAME: string }[]
          >(
            `SHOW INDEX FROM \`${TABLE_NAME}\` WHERE COLUMN_NAME = 'case_id' AND Non_unique = 0`
          )
          const idxNames = Array.from(new Set(idxRows.map((r) => r.INDEX_NAME)))
          for (const idx of idxNames) {
            try {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${idx}\``
              )
            } catch {
              // ignore
            }
          }
        }

        // ===== 3. case_memo_date =====
        if (!hasCol('case_memo_date')) {
          // 旧版本有 case_memo_timestamp 列，值迁移
          if (hasCol('case_memo_timestamp')) {
            try {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` CHANGE COLUMN \`case_memo_timestamp\` case_memo_date DATETIME NULL COMMENT '备忘日期时间'`
              )
            } catch {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_date DATETIME NULL COMMENT '备忘日期时间' AFTER case_id`
              )
            }
          } else {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_date DATETIME NULL COMMENT '备忘日期时间' AFTER case_id`
            )
          }
        }

        // ===== 4. case_memo_content =====
        if (!hasCol('case_memo_content')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_content TEXT NULL COMMENT '备忘内容' AFTER case_memo_date`
          )
        } else if (
          /varchar|char/i.test(colType('case_memo_content')) &&
          !/text/i.test(colType('case_memo_content'))
        ) {
          try {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` MODIFY COLUMN case_memo_content TEXT NULL COMMENT '备忘内容'`
            )
          } catch {
            // ignore
          }
        }

        // ===== 5. case_memo_remark =====
        if (!hasCol('case_memo_remark')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_remark VARCHAR(1024) NULL COMMENT '备忘备注' AFTER case_memo_content`
          )
        } else {
          const t = colType('case_memo_remark')
          const m = /varchar\((\d+)\)/i.exec(t)
          const size = m ? Number(m[1]) : 0
          if (size && size < 1024) {
            try {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` MODIFY COLUMN case_memo_remark VARCHAR(1024) NULL COMMENT '备忘备注'`
              )
            } catch {
              // ignore
            }
          }
        }

        // ===== 6. case_memo_attachment =====
        if (!hasCol('case_memo_attachment')) {
          // 旧版本 memo_attachments
          const hasLegacyMemoAttachments = hasCol('memo_attachments')
          if (hasLegacyMemoAttachments) {
            try {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` CHANGE COLUMN \`memo_attachments\` case_memo_attachment TEXT NULL COMMENT '备忘附件JSON数组'`
              )
            } catch {
              await execute(
                `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_attachment TEXT NULL COMMENT '备忘附件JSON数组' AFTER case_memo_remark`
              )
            }
          } else {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN case_memo_attachment TEXT NULL COMMENT '备忘附件JSON数组' AFTER case_memo_remark`
            )
          }
        } else if (
          /varchar|char/i.test(colType('case_memo_attachment')) &&
          !/text/i.test(colType('case_memo_attachment'))
        ) {
          try {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` MODIFY COLUMN case_memo_attachment TEXT NULL COMMENT '备忘附件JSON数组'`
            )
          } catch {
            // ignore
          }
        }

        // ===== 7. created_at / updated_at =====
        if (!hasCol('created_at')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间' AFTER case_memo_attachment`
          )
        }
        if (!hasCol('updated_at')) {
          await execute(
            `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER created_at`
          )
        }

        // ===== 8. PK & Index =====
        if (!info.primaryKeys.includes('case_memo_id')) {
          try {
            // 先去掉 PK（如果是 case_id / 别的）
            for (const k of info.primaryKeys) {
              if (k !== 'case_memo_id') {
                try {
                  await execute(
                    `ALTER TABLE \`${TABLE_NAME}\` DROP PRIMARY KEY`
                  )
                } catch {
                  // ignore
                }
                break
              }
            }
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD PRIMARY KEY (case_memo_id)`
            )
          } catch {
            // ignore
          }
        }
        // 确保 case_id 上有普通索引
        try {
          const idxRows = await query<{ INDEX_NAME: string }[]>(
            `SHOW INDEX FROM \`${TABLE_NAME}\` WHERE COLUMN_NAME = 'case_id' AND Non_unique = 1`
          )
          if (idxRows.length === 0) {
            await execute(
              `ALTER TABLE \`${TABLE_NAME}\` ADD INDEX idx_case_id (case_id)`
            )
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      _ensureCaseMemoTablePromise = null
      throw e
    }
  })()
  return _ensureCaseMemoTablePromise
}

export async function getCaseMemoListByCaseId(
  caseId: number
): Promise<CaseMemoListRow[]> {
  await ensureCaseMemoTable()
  const rows = await query<any[]>(
    `SELECT ${MEMO_SELECT_COLS} FROM \`${TABLE_NAME}\`
     WHERE case_id = ? ORDER BY case_memo_date DESC, case_memo_id DESC`,
    [Number(caseId)]
  )
  return rows.map(normalizeMemoRow)
}

export async function getCaseMemoListByCaseIds(
  caseIds: number[]
): Promise<CaseMemoListRow[]> {
  await ensureCaseMemoTable()
  const ids = Array.isArray(caseIds)
    ? caseIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    : []
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = await query<any[]>(
    `SELECT ${MEMO_SELECT_COLS} FROM \`${TABLE_NAME}\`
     WHERE case_id IN (${placeholders}) ORDER BY case_memo_date DESC, case_memo_id DESC`,
    ids as ExecuteValues[]
  )
  return rows.map(normalizeMemoRow)
}

export async function createCaseMemo(data: {
  case_id: number
  case_memo_date?: string | null
  case_memo_content?: string | null
  case_memo_remark?: string | null
  case_memo_attachment?: string | null
}): Promise<CaseMemoListRow> {
  await ensureCaseMemoTable()
  const safeMemoDate = toValidMemoDateOrNull(data.case_memo_date)
  const result = await execute(
    `INSERT INTO \`${TABLE_NAME}\`
       (case_id, case_memo_date, case_memo_content, case_memo_remark, case_memo_attachment)
     VALUES (?, ?, ?, ?, ?)`,
    [
      Number(data.case_id),
      safeMemoDate,
      data.case_memo_content == null || data.case_memo_content === ''
        ? null
        : String(data.case_memo_content),
      data.case_memo_remark == null || data.case_memo_remark === ''
        ? null
        : String(data.case_memo_remark),
      data.case_memo_attachment == null || data.case_memo_attachment === ''
        ? null
        : String(data.case_memo_attachment),
    ] as ExecuteValues[]
  )
  const id = Number(result.insertId)
  if (id > 0) {
    const rows = await query<any[]>(
      `SELECT ${MEMO_SELECT_COLS} FROM \`${TABLE_NAME}\` WHERE case_memo_id = ? LIMIT 1`,
      [id]
    )
    if (rows[0]) return normalizeMemoRow(rows[0])
  }
  return {
    case_memo_id: id,
    case_id: Number(data.case_id),
    case_memo_date: safeMemoDate,
    case_memo_content: data.case_memo_content
      ? String(data.case_memo_content)
      : null,
    case_memo_remark: data.case_memo_remark
      ? String(data.case_memo_remark)
      : null,
    case_memo_attachment: data.case_memo_attachment
      ? String(data.case_memo_attachment)
      : null,
    created_at: null,
    updated_at: null,
  }
}

export async function updateCaseMemo(
  memoId: number,
  data: {
    case_memo_date?: string | null
    case_memo_content?: string | null
    case_memo_remark?: string | null
    case_memo_attachment?: string | null
  }
): Promise<CaseMemoListRow | null> {
  await ensureCaseMemoTable()
  const safeMemoDate =
    data.case_memo_date === undefined ? undefined : toValidMemoDateOrNull(data.case_memo_date)
  const result = await execute(
    `UPDATE \`${TABLE_NAME}\` SET
       case_memo_date = ?,
       case_memo_content = ?,
       case_memo_remark = ?,
       case_memo_attachment = ?
     WHERE case_memo_id = ?`,
    [
      safeMemoDate,
      data.case_memo_content === undefined
        ? undefined
        : data.case_memo_content === ''
          ? null
          : String(data.case_memo_content),
      data.case_memo_remark === undefined
        ? undefined
        : data.case_memo_remark === ''
          ? null
          : String(data.case_memo_remark),
      data.case_memo_attachment === undefined
        ? undefined
        : data.case_memo_attachment === ''
          ? null
          : String(data.case_memo_attachment),
      Number(memoId),
    ] as ExecuteValues[]
  )
  if (result.affectedRows === 0) return null
  const rows = await query<any[]>(
    `SELECT ${MEMO_SELECT_COLS} FROM \`${TABLE_NAME}\` WHERE case_memo_id = ? LIMIT 1`,
    [Number(memoId)]
  )
  return rows[0] ? normalizeMemoRow(rows[0]) : null
}

export async function deleteCaseMemo(memoId: number): Promise<number> {
  await ensureCaseMemoTable()
  const result = await execute(
    `DELETE FROM \`${TABLE_NAME}\` WHERE case_memo_id = ?`,
    [Number(memoId)]
  )
  return Number(result.affectedRows)
}

export async function deleteCaseMemoByCaseId(caseId: number): Promise<number> {
  await ensureCaseMemoTable()
  const result = await execute(
    `DELETE FROM \`${TABLE_NAME}\` WHERE case_id = ?`,
    [Number(caseId)]
  )
  return Number(result.affectedRows)
}
