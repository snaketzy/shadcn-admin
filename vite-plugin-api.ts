import type { Plugin } from 'vite'
import {
  getAllCaseDict,
  getCaseDictById,
  getCaseDictGroups,
  getCaseDictPaginated,
  createCaseDict,
  updateCaseDict,
  deleteCaseDict,
  deleteCaseDictBulk,
} from './src/service/connection/case-dict-service'
import type { IncomingMessage, ServerResponse } from 'http'

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (raw === '') {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function parseUrl(req: IncomingMessage): { pathname: string; searchParams: URLSearchParams } {
  const url = req.url ?? '/'
  const base = `http://${req.headers.host ?? 'localhost'}`
  const u = new URL(url, base)
  return { pathname: u.pathname, searchParams: u.searchParams }
}

async function handleCaseDictApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/case-dict')) {
    return false
  }

  const subPath = pathname.slice('/api/case-dict'.length) || '/'

  try {
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 1000)
        const dictGroup = searchParams.get('dictGroup') ?? ''
        const dictKey = searchParams.get('dictKey') ?? ''
        const dictValue = searchParams.get('dictValue') ?? ''
        const result = await getCaseDictPaginated({
          page,
          pageSize,
          dictGroup,
          dictKey,
          dictValue,
        })
        sendJson(res, 200, { success: true, data: result })
        return true
      }
      if (method === 'POST') {
        const body = (await readBody(req)) as Record<string, unknown> | undefined
        if (!body) {
          sendJson(res, 400, { success: false, message: 'Missing body' })
          return true
        }
        const created = await createCaseDict({
          dict_group: String(body.dict_group ?? ''),
          dict_value: String(body.dict_value ?? ''),
          dict_key: Number(body.dict_key ?? 0),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllCaseDict()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getCaseDictGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteCaseDictBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const dictId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getCaseDictById(dictId)
        if (!row) {
          sendJson(res, 404, { success: false, message: 'Not found' })
        } else {
          sendJson(res, 200, { success: true, data: row })
        }
        return true
      }
      if (method === 'PUT') {
        const body = (await readBody(req)) as Record<string, unknown> | undefined
        if (!body) {
          sendJson(res, 400, { success: false, message: 'Missing body' })
          return true
        }
        const updated = await updateCaseDict(dictId, {
          dict_group: String(body.dict_group ?? ''),
          dict_value: String(body.dict_value ?? ''),
          dict_key: Number(body.dict_key ?? 0),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteCaseDict(dictId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[case-dict API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

export function vitePluginCaseDictApi(): Plugin {
  return {
    name: 'vite-plugin-case-dict-api',
    configureServer(server) {
      const apiMiddleware = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: (err?: unknown) => void
      ) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/case-dict')) {
          next()
          return
        }
        try {
          const handled = await handleCaseDictApi(req, res)
          if (!handled) {
            next()
          }
        } catch (err) {
          next(err)
        }
      }
      ;(server.middlewares.stack as any[]).unshift({
        route: '',
        handle: apiMiddleware,
      })
    },
  }
}

export default vitePluginCaseDictApi
