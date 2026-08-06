/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'

const TABLE_NAME = 'agent_list'

async function main() {
  const info = await describeTable(TABLE_NAME)
  console.log(`现有 ${TABLE_NAME} 结构 (${info.columnCount} 列):`)
  for (const col of info.columns) {
    console.log(
      `  - ${col.field.padEnd(26)} ${col.type.padEnd(24)} ${col.null ? 'NULL' : 'NOT NULL'} ${col.key || ''} ${col.default ?? ''} ${col.extra}`
    )
  }

  // 找第 6 行的数据（索引 5），看看每列的实际最大长度
  const xlsxPath = path.resolve(process.cwd(), 'assets/database_structure/agent_list.xlsx')
  const buffer = fs.readFileSync(xlsxPath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })

  console.log(`\nExcel 共 ${rows.length} 行，各字符串列最大长度:`)
  const cols = [
    'agent_company_name',
    'agent_company_shortname',
    'agent_incharge_name',
    'agent_company_address',
    'agent_incharge_phone',
    'agent_incharge_email',
  ]
  for (const c of cols) {
    let maxLen = 0
    let maxRow = -1
    let maxValue = ''
    rows.forEach((r, i) => {
      const v = r[c]
      const s = v === null || v === undefined ? '' : String(v)
      if (s.length > maxLen) {
        maxLen = s.length
        maxRow = i + 1
        maxValue = s
      }
    })
    console.log(`  ${c.padEnd(26)} 最大长度=${String(maxLen).padStart(4)} (第 ${maxRow} 行: ${JSON.stringify(maxValue.length > 60 ? maxValue.slice(0, 60) + '…' : maxValue)})`)
  }

  // 还看一下第 6 行 (索引 5)
  console.log('\n第 6 行原始值:')
  const r6 = rows[5]
  for (const [k, v] of Object.entries(r6 ?? {})) {
    console.log(`  ${k}: ${JSON.stringify(v)}`)
  }
}

main().finally(async () => await closePool())
