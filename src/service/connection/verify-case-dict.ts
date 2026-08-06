/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'case_dict'

type CaseDictRow = {
  dict_id: number
  dict_group: string
  dict_value: string
  dict_key: number
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
      col.null ? 'NULL' : 'NOT NULL',
      col.default !== null && col.default !== undefined
        ? `DEFAULT ${col.default}`
        : '',
      col.extra,
    ]
      .filter(Boolean)
      .join(' / ')
    console.log(
      `  - ${col.field.padEnd(12)} ${col.type.padEnd(16)} ${flags}`
    )
  }

  console.log(`\n=== ${TABLE_NAME} 全量数据 ===`)
  const rows = await query<CaseDictRow[]>(
    `SELECT dict_id, dict_group, dict_value, dict_key FROM \`${TABLE_NAME}\` ORDER BY dict_id`
  )
  console.log(`共 ${rows.length} 条:\n`)
  const groupBy = new Map<string, CaseDictRow[]>()
  for (const r of rows) {
    const arr = groupBy.get(r.dict_group) ?? []
    arr.push(r)
    groupBy.set(r.dict_group, arr)
  }
  for (const [group, items] of groupBy) {
    console.log(`【${group}】 共 ${items.length} 条:`)
    for (const r of items) {
      console.log(
        `   dict_id=${r.dict_id.toString().padStart(3)}  dict_key=${r.dict_key.toString().padStart(4)}  dict_value=${r.dict_value}`
      )
    }
    console.log()
  }
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
