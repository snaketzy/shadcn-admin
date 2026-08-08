/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'supplier_list'

type DistRow = { value: string | null; cnt: number }
type SupplierRow = {
  supplier_id: number
  supplier_name: string | null
  supplier_shortname: string | null
  supplier_address: string | null
  supplier_field: string | null
  supplier_advantage: string | null
  supplier_contact_name: string | null
  supplier_contact_phone: string | null
  supplier_contact_email: string | null
  supplier_remark: string | null
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
    console.log(`  - ${col.field.padEnd(26)} ${col.type.padEnd(20)} ${flags}`)
  }

  console.log(`\n=== 数据分布 ===`)
  const total = (
    await query<[{ total: number }]>(`SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``)
  )[0]?.total ?? 0
  console.log(`总条数: ${total}`)

  for (const [label, col] of [
    ['业务字段', 'supplier_field'],
    ['优势业务', 'supplier_advantage'],
  ] as const) {
    const rows = await query<DistRow[]>(
      `SELECT COALESCE(\`${col}\`, '(NULL)') AS value, COUNT(*) AS cnt FROM \`${TABLE_NAME}\` GROUP BY \`${col}\` ORDER BY cnt DESC, value`
    )
    console.log(`\n按 ${label} (${col}):`)
    for (const r of rows) {
      console.log(`  ${String(r.value).padEnd(20)} ${r.cnt} 条`)
    }
  }

  const contactNameCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE supplier_contact_name IS NOT NULL AND TRIM(supplier_contact_name) <> ''`
    )
  )[0].c
  const emailCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE supplier_contact_email IS NOT NULL AND TRIM(supplier_contact_email) <> ''`
    )
  )[0].c
  const phoneCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE supplier_contact_phone IS NOT NULL AND TRIM(supplier_contact_phone) <> ''`
    )
  )[0].c
  const addrCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE supplier_address IS NOT NULL AND TRIM(supplier_address) <> ''`
    )
  )[0].c
  const remarkCnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE supplier_remark IS NOT NULL AND TRIM(supplier_remark) <> ''`
    )
  )[0].c
  console.log(`\n联系人非空: ${contactNameCnt} 条；邮箱非空: ${emailCnt} 条；电话非空: ${phoneCnt} 条`)
  console.log(`地址非空: ${addrCnt} 条；备注非空: ${remarkCnt} 条`)

  console.log('\n=== 抽样 10 条 ===')
  const rows = await query<SupplierRow[]>(
    `SELECT supplier_id, supplier_name, supplier_shortname, supplier_address, supplier_field,
            supplier_advantage, supplier_contact_name, supplier_contact_phone, supplier_contact_email, supplier_remark
     FROM \`${TABLE_NAME}\` ORDER BY supplier_id LIMIT 10`
  )
  for (const r of rows) {
    console.log(
      `#${String(r.supplier_id).padStart(2)} ${String(r.supplier_name ?? '').padEnd(20)} ${(r.supplier_shortname ?? '-').padEnd(16)} F:${(r.supplier_field ?? '-').padEnd(12)} A:${(r.supplier_advantage ?? '-').padEnd(10)} N:${(r.supplier_contact_name ?? '-').padEnd(16)} E:${(r.supplier_contact_email ?? '-').padEnd(30)} T:${r.supplier_contact_phone ?? '-'} R:${r.supplier_remark ?? '-'}`
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
