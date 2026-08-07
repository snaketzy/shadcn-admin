/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'owner_list'

type DistRow = { value: string | null; cnt: number }
type OwnerRow = {
  owner_id: number
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_team: string | null
  owner_department: string | null
  owner_department_email: string | null
  owner_rank: string | null
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
    ['Team', 'owner_team'],
    ['Dept', 'owner_department'],
    ['Rank', 'owner_rank'],
  ] as const) {
    const rows = await query<DistRow[]>(
      `SELECT COALESCE(\`${col}\`, '(NULL)') AS value, COUNT(*) AS cnt FROM \`${TABLE_NAME}\` GROUP BY \`${col}\` ORDER BY cnt DESC, value`
    )
    console.log(`\n按 ${label} (${col}):`)
    for (const r of rows) {
      console.log(`  ${String(r.value).padEnd(8)} ${r.cnt} 条`)
    }
  }

  const phoneCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE owner_phone IS NOT NULL AND TRIM(owner_phone) <> ''`
    )
  )[0].c
  const emailCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE owner_email IS NOT NULL AND TRIM(owner_email) <> ''`
    )
  )[0].c
  console.log(`\n电话非空: ${phoneCnt} 条；个人邮箱非空: ${emailCnt} 条`)

  console.log('\n=== 抽样 10 条 ===')
  const rows = await query<OwnerRow[]>(
    `SELECT owner_id, owner_name, owner_email, owner_phone, owner_team, owner_department, owner_department_email, owner_rank
     FROM \`${TABLE_NAME}\` ORDER BY owner_id LIMIT 10`
  )
  for (const r of rows) {
    console.log(
      `#${String(r.owner_id).padStart(2)} ${String(r.owner_name ?? '').padEnd(20)} Team:${(r.owner_team ?? '-').padEnd(4)} Dept:${(r.owner_department ?? '-').padEnd(4)} Rank:${(r.owner_rank ?? '-').padEnd(4)} ${r.owner_phone ?? '-'.padEnd(14)} ${r.owner_email ?? '-'}`
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
