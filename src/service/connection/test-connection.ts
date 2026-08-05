/* eslint-disable no-console */
import { closePool, getPool, query } from './db'

type PoolInternal = {
  pool: {
    config: {
      connectionConfig: {
        host: string
        port: number
        user: string
        database: string
      }
      connectionLimit: number
    }
    _allConnections: { length: number }
    _freeConnections: { length: number }
    _waitingCallbacks: { length: number }
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const pool = getPool() as unknown as PoolInternal

  console.log('=== MySQL 连接测试 ===')
  console.log(
    `连接池配置: host=${pool.pool.config.connectionConfig.host}, ` +
      `port=${pool.pool.config.connectionConfig.port}, ` +
      `user=${pool.pool.config.connectionConfig.user}, ` +
      `database=${pool.pool.config.connectionConfig.database}`
  )
  console.log(`连接池大小上限: ${pool.pool.config.connectionLimit}\n`)

  try {
    console.log('[1/4] 测试连接并获取数据库版本...')
    const versionRows = await query<[{ version: string }]>(
      'SELECT VERSION() as version'
    )
    console.log(
      `✅ 连接成功! MySQL 版本: ${versionRows[0]?.version ?? '未知'}\n`
    )

    console.log('[2/4] 测试 ping (SELECT 1)...')
    const pingResult = await query<[{ ok: number }]>('SELECT 1 as ok')
    console.log(`✅ ping 成功, 结果: ${pingResult[0]?.ok}\n`)

    console.log('[3/4] 检查数据库中是否存在 users 表...')
    const tables = await query<Record<string, string>[]>('SHOW TABLES')
    const tableNameKey = Object.keys(tables[0] ?? {})[0] ?? ''
    const tableList = tables.map((row) => row[tableNameKey])
    if (tableList.includes('users')) {
      console.log('✅ 检测到 users 表，尝试查询记录数量...')
      const count = await query<[{ total: number }]>(
        'SELECT COUNT(*) as total FROM users'
      )
      console.log(`   users 表现有 ${count[0]?.total ?? 0} 条记录\n`)
    } else {
      console.log(
        `ℹ️  暂未检测到 users 表 (当前库中表: ${tableList.join(', ') || '无'})\n`
      )
    }

    console.log('[4/4] 展示连接池实时状态...')
    await sleep(50)
    const stats = {
      allConnections: pool.pool._allConnections?.length ?? 0,
      freeConnections: pool.pool._freeConnections?.length ?? 0,
      waitingClients: pool.pool._waitingCallbacks?.length ?? 0,
    }
    console.log(
      `   已建立连接: ${stats.allConnections}, ` +
        `空闲连接: ${stats.freeConnections}, ` +
        `等待请求: ${stats.waitingClients}`
    )
    console.log('✅ 连接池状态正常\n')
  } catch (err) {
    console.error('❌ 连接测试失败:')
    if (err instanceof Error) {
      console.error(`   错误信息: ${err.message}`)
      if (err.stack) {
        console.error(
          `   调用栈:\n${err.stack
            .split('\n')
            .slice(1, 5)
            .map((l) => `   ${l}`)
            .join('\n')}`
        )
      }
    } else {
      console.error('  ', err)
    }
    process.exitCode = 1
  } finally {
    console.log('=== 关闭连接池 ===')
    try {
      await closePool()
      console.log('✅ 连接池已关闭')
    } catch (err) {
      console.error('❌ 关闭连接池时出错:', err)
      process.exitCode = 1
    }
  }
}

void main()
