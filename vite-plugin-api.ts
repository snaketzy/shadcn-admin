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
import {
  getAllVesselList,
  getVesselListById,
  getVesselListGroups,
  getVesselListPaginated,
  createVesselList,
  updateVesselList,
  deleteVesselList,
  deleteVesselListBulk,
} from './src/service/connection/vessel-list-service'
import {
  getAllOwnerList,
  getOwnerListById,
  getOwnerListGroups,
  getOwnerListPaginated,
  createOwnerList,
  updateOwnerList,
  deleteOwnerList,
  deleteOwnerListBulk,
} from './src/service/connection/owner-list-service'
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

async function handleVesselListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/vessel-list')) {
    return false
  }

  const subPath = pathname.slice('/api/vessel-list'.length) || '/'

  function toOptStr(s: string | null): string | undefined {
    if (s === null) return undefined
    if (s === '') return undefined
    return s
  }
  function toOptNum(s: string | null): number | null | undefined {
    if (s === null) return undefined
    if (s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  try {
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 1000)
        const result = await getVesselListPaginated({
          page,
          pageSize,
          vesselName: toOptStr(searchParams.get('vesselName')),
          vesselTeam: toOptStr(searchParams.get('vesselTeam')),
          vesselFlag: toOptStr(searchParams.get('vesselFlag')),
          vesselClass: toOptStr(searchParams.get('vesselClass')),
          vesselIncharge: toOptStr(searchParams.get('vesselIncharge')),
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
        const created = await createVesselList({
          vessel_name: String(body.vessel_name ?? ''),
          building_year: toOptStr(body.building_year as any),
          vessel_imo: toOptNum(body.vessel_imo as any),
          vessel_loa: toOptStr(body.vessel_loa as any),
          vessel_breadth: toOptStr(body.vessel_breadth as any),
          vessel_gross: toOptNum(body.vessel_gross as any),
          vessel_dwt: toOptNum(body.vessel_dwt as any),
          vessel_class: toOptStr(body.vessel_class as any),
          vessel_flag: toOptStr(body.vessel_flag as any),
          vessel_team: toOptStr(body.vessel_team as any),
          vessel_incharge: toOptStr(body.vessel_incharge as any),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllVesselList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getVesselListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteVesselListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const vesselId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getVesselListById(vesselId)
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
        const updated = await updateVesselList(vesselId, {
          vessel_name: body.vessel_name == null ? undefined : String(body.vessel_name),
          building_year: toOptStr(body.building_year as any),
          vessel_imo: toOptNum(body.vessel_imo as any),
          vessel_loa: toOptStr(body.vessel_loa as any),
          vessel_breadth: toOptStr(body.vessel_breadth as any),
          vessel_gross: toOptNum(body.vessel_gross as any),
          vessel_dwt: toOptNum(body.vessel_dwt as any),
          vessel_class: toOptStr(body.vessel_class as any),
          vessel_flag: toOptStr(body.vessel_flag as any),
          vessel_team: toOptStr(body.vessel_team as any),
          vessel_incharge: toOptStr(body.vessel_incharge as any),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteVesselList(vesselId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[vessel-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleOwnerListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/owner-list')) {
    return false
  }

  const subPath = pathname.slice('/api/owner-list'.length) || '/'

  function toOptStr(s: string | null | unknown): string | undefined {
    if (s === null) return undefined
    if (s === undefined) return undefined
    const str = String(s)
    if (str === '') return undefined
    return str
  }

  try {
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 1000)
        const result = await getOwnerListPaginated({
          page,
          pageSize,
          ownerName: toOptStr(searchParams.get('ownerName')),
          ownerTeam: toOptStr(searchParams.get('ownerTeam')),
          ownerDepartment: toOptStr(searchParams.get('ownerDepartment')),
          ownerRank: toOptStr(searchParams.get('ownerRank')),
          ownerEmail: toOptStr(searchParams.get('ownerEmail')),
          ownerPhone: toOptStr(searchParams.get('ownerPhone')),
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
        const created = await createOwnerList({
          owner_name: String(body.owner_name ?? ''),
          owner_email: toOptStr(body.owner_email),
          owner_phone: toOptStr(body.owner_phone),
          owner_team: toOptStr(body.owner_team),
          owner_department: toOptStr(body.owner_department),
          owner_department_email: toOptStr(body.owner_department_email),
          owner_rank: toOptStr(body.owner_rank),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllOwnerList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getOwnerListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteOwnerListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const ownerId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getOwnerListById(ownerId)
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
        const updated = await updateOwnerList(ownerId, {
          owner_name: body.owner_name == null ? undefined : String(body.owner_name),
          owner_email: toOptStr(body.owner_email),
          owner_phone: toOptStr(body.owner_phone),
          owner_team: toOptStr(body.owner_team),
          owner_department: toOptStr(body.owner_department),
          owner_department_email: toOptStr(body.owner_department_email),
          owner_rank: toOptStr(body.owner_rank),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteOwnerList(ownerId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[owner-list API error]', err)
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
          next()
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
