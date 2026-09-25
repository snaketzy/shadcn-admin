/// <reference types="node" />
import 'dotenv/config'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import { dispatchApiRequest, sendJson } from './vite-plugin-api'
import { ensureCaseListSchema } from './src/service/connection/case-list-service'
import { ensureCaseMemoTable } from './src/service/connection/case-memo-list-service'
import { closePool } from './src/service/connection/db'

const HOST = process.env.API_HOST ?? '127.0.0.1'
const PORT = Number(process.env.API_PORT ?? 3001)

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  res.setHeader('Access-Control-Max-Age', '86400')
}

async function ensureSchema() {
  try {
    await ensureCaseListSchema()
    await ensureCaseMemoTable()
    console.log('[server] schema ensured')
  } catch (err) {
    console.warn('[server] schema ensure skipped:', err instanceof Error ? err.message : String(err))
  }
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = req.url ?? '/'

  if (url === '/health' || url === '/api/health') {
    sendJson(res, 200, { success: true, status: 'ok', uptime: process.uptime() })
    return
  }

  try {
    const handled = await dispatchApiRequest(req, res)
    if (handled) return
  } catch (err) {
    console.error('[server] unhandled API error:', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return
  }

  sendJson(res, 404, { success: false, message: `Route not found: ${req.method} ${url}` })
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res)
})

async function bootstrap() {
  await ensureSchema()
  server.listen(PORT, HOST, () => {
    console.log(`[server] shadcn-admin-api listening on http://${HOST}:${PORT}`)
    console.log(`[server] health check: http://${HOST}:${PORT}/health`)
    console.log(`[server] DB_NAME: ${process.env.DB_NAME ?? '(unset)'}`)
  })
}

function gracefulShutdown(signal: string) {
  console.log(`[server] received ${signal}, shutting down...`)
  server.close(async () => {
    try {
      await closePool()
    } catch {
      /* noop */
    }
    console.log('[server] closed')
    process.exit(0)
  })
  const forceTimer = setTimeout(() => {
    console.error('[server] force exit after 10s')
    process.exit(1)
  }, 10000)
  forceTimer.unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason)
})

void bootstrap()
