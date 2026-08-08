/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'contact_list'

type DistRow = { value: string | null; cnt: number }
type ContactRow = {
  contact_id: number
  contact_name: string | null
  contact_mobile: string | null
  contact_email: string | null
  contact_type: string | null
  contact_rank: string | null
  contact_division_type: string | null
  contact_division_id: number | null
  contact_remark: string | null
}

async function main() {
  console.log(`=== ${TABLE_NAME} 表结构验证 ===\n`)
  const info = await describeTable(TABLE_NAME)
  console.log(`字段数: ${info.columnCount}`)
  console.log(`主键:   ${info.primaryKeys.join(', ')}`)
  console.log('\n字段明细:')
  for (const col of info.columns) {
    const flags = [
      col.key === 'PRI' ? 'PK' : '',
      col.key === 'UNI' ? 'UK' : '',
      col.key === 'MUL' ? 'KEY' : '',
      col.null ? 'NULL' : 'NOT NULL',
      col.default !== null && col.default !== undefined
        ? `DEFAULT ${col.default}`
        : '',
      col.extra,
    ]
      .filter(Boolean)
      .join(' / ')
    console.log(`  - ${col.field.padEnd(24)} ${col.type.padEnd(20)} ${flags}`)
  }

  console.log(`\n=== 数据分布 ===`)
  const total = (
    await query<[{ total: number }]>(`SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``)
  )[0]?.total ?? 0
  console.log(`总条数: ${total}`)

  for (const [label, col] of [
    ['联系人类别', 'contact_type'],
    ['联系人职级', 'contact_rank'],
    ['关联单位类别', 'contact_division_type'],
    ['关联单位ID', 'contact_division_id'],
  ] as const) {
    const rows = await query<DistRow[]>(
      `SELECT COALESCE(CAST(\`${col}\` AS CHAR), '(NULL)') AS value, COUNT(*) AS cnt FROM \`${TABLE_NAME}\` GROUP BY \`${col}\` ORDER BY cnt DESC, value`
    )
    console.log(`\n按 ${label} (${col}):`)
    for (const r of rows) {
      console.log(`  ${String(r.value).padEnd(16)} ${r.cnt} 条`)
    }
  }

  const mobileCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE contact_mobile IS NOT NULL AND TRIM(contact_mobile) <> ''`
    )
  )[0].c
  const emailCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE contact_email IS NOT NULL AND TRIM(contact_email) <> ''`
    )
  )[0].c
  const remarkCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE contact_remark IS NOT NULL AND TRIM(contact_remark) <> ''`
    )
  )[0].c
  console.log(`\n手机非空: ${mobileCnt} 条；邮箱非空: ${emailCnt} 条；备注非空: ${remarkCnt} 条`)

  console.log('\n=== 抽样 10 条 ===')
  const rows = await query<ContactRow[]>(
    `SELECT contact_id, contact_name, contact_mobile, contact_email, contact_type,
            contact_rank, contact_division_type, contact_division_id, contact_remark
     FROM \`${TABLE_NAME}\` ORDER BY contact_id LIMIT 10`
  )
  for (const r of rows) {
    console.log(
      `#${String(r.contact_id).padStart(2)} ${String(r.contact_name ?? '').padEnd(28)} T:${(r.contact_type ?? '-').padEnd(4)} R:${(r.contact_rank ?? '-').padEnd(4)} M:${(r.contact_mobile ?? '-').padEnd(16)} E:${(r.contact_email ?? '-').padEnd(30)} DT:${(r.contact_division_type ?? '-').padEnd(4)} DID:${String(r.contact_division_id ?? '-').padEnd(4)} RMK:${r.contact_remark ?? '-'}`
    )
  }
  console.log()
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
