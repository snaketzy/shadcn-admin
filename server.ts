import 'dotenv/config'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import {
  handleCaseDictApi,
  handleVesselListApi,
  handleOwnerListApi,
  handleSupplierListApi,
  handleCollaborationListApi,
  handleContactListApi,
  handleCaseListApi,
  handleCaseInquiryListApi,
  handleCaseMemoListApi,
  handleCosApi,
} from './vite-plugin-api'

const PORT = Number(process.env.SERVER_PORT ?? 3001)
const HOST = process.env.SERVER_HOST ?? '127.0.0.1'

function sendCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

async function requestHandler(req: IncomingMessage, res: ServerResponse) {
  sendCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = req.url ?? '/'

  try {
    if (url.startsWith('/api/case-dict')) {
      const handled = await handleCaseDictApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/vessel-list')) {
      const handled = await handleVesselListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/owner-list')) {
      const handled = await handleOwnerListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/supplier-list')) {
      const handled = await handleSupplierListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/collaboration-list')) {
      const handled = await handleCollaborationListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/contact-list')) {
      const handled = await handleContactListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/case-list')) {
      const handled = await handleCaseListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/case-inquiry-list')) {
      const handled = await handleCaseInquiryListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/case-memo-list')) {
      const handled = await handleCaseMemoListApi(req, res)
      if (handled) return
    }
    if (url.startsWith('/api/cos')) {
      const handled = await handleCosApi(req, res)
      if (handled) return
    }

    if (url === '/health' || url === '/api/health') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
      return
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ success: false, message: 'Not Found' }))
  } catch (err) {
    console.error('[Server Error]', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      })
    )
  }
}

const server = http.createServer(requestHandler)

server.listen(PORT, HOST, () => {
  console.log(`[Server] API server running on http://${HOST}:${PORT}`)
  console.log(`[Server] Health check: http://${HOST}:${PORT}/health`)
  console.log(`[Server] NODE_ENV = ${process.env.NODE_ENV ?? 'development'}`)
})

function shutdown(signal: string) {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`)
  server.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason)
})
