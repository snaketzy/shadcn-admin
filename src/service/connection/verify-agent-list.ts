/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'agent_list'

type AgentListRow = {
  agent_id: number
  agent_company_name: string
  agent_company_shortname: string
  agent_incharge_name: string
  agent_company_address: string | null
  agent_incharge_phone: string | null
  agent_incharge_email: string | null
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
      `  - ${col.field.padEnd(26)} ${col.type.padEnd(20)} ${flags}`
    )
  }

  console.log(`\n=== ${TABLE_NAME} 全量数据 ===`)
  const rows = await query<AgentListRow[]>(
    `SELECT agent_id, agent_company_name, agent_company_shortname,
            agent_incharge_name, agent_company_address,
            agent_incharge_phone, agent_incharge_email
     FROM \`${TABLE_NAME}\` ORDER BY agent_id`
  )
  console.log(`共 ${rows.length} 条:\n`)
  for (const r of rows) {
    console.log(
      `#${r.agent_id.toString().padStart(2)}  ${r.agent_company_shortname.padEnd(18)} ${r.agent_incharge_name.padEnd(20)} ${(r.agent_incharge_phone ?? '-').padEnd(18)} ${r.agent_incharge_email ?? '-'}`
    )
  }
  console.log()
  const maxName = rows.reduce(
    (m, r) => Math.max(m, r.agent_company_name.length),
    0
  )
  console.log(
    `ℹ️  全公司名字段最长 ${maxName} 字符（表列 VARCHAR(255)，安全余量: ${255 - maxName}）`
  )
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
