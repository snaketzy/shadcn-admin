import { closePool, query } from './db'
import { ensureCaseMemoTable } from './case-memo-list-service'

async function main() {
  try {
    await ensureCaseMemoTable()
    const rows = await query<any[]>('DESCRIBE case_memo_list')
    console.log('=== case_memo_list 表结构 ===')
    console.log(
      rows
        .map(
          (r: any) =>
            `- ${r.Field}: ${r.Type}  [${r.Null}]  [${r.Key}]  [${r.Default}]  [${r.Extra}]`
        )
        .join('\n')
    )
    const reqFields = [
      'case_memo_id',
      'case_memo_content',
      'case_memo_date',
      'case_memo_attachment',
      'case_memo_remark',
      'case_id',
    ]
    const got = rows.map((r: any) => r.Field)
    console.log('\n=== 必需字段检查 ===')
    for (const f of reqFields) {
      if (got.includes(f)) {
        console.log(`✅ ${f} 存在`)
      } else {
        console.log(`❌ ${f} 缺失`)
      }
    }
  } finally {
    void closePool()
  }
}

void main()
