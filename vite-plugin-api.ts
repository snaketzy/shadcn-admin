import type { Plugin } from 'vite'
import {
  getAllCaseDict,
  getCaseDictById,
  getCaseDictGroups,
  getCaseDictPaginated,
  getCaseDictByKeyPrefix,
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
import {
  getAllSupplierList,
  getSupplierListById,
  getSupplierListGroups,
  getSupplierListPaginated,
  createSupplierList,
  updateSupplierList,
  deleteSupplierList,
  deleteSupplierListBulk,
} from './src/service/connection/supplier-list-service'
import {
  getAllCollaborationList,
  getCollaborationListById,
  getCollaborationListGroups,
  getCollaborationListPaginated,
  createCollaborationList,
  updateCollaborationList,
  deleteCollaborationList,
  deleteCollaborationListBulk,
} from './src/service/connection/collaboration-list-service'
import {
  getAllContactList,
  getContactListById,
  getContactListGroups,
  getContactListPaginated,
  getContactListByDivision,
  createContactList,
  updateContactList,
  deleteContactList,
  deleteContactListBulk,
} from './src/service/connection/contact-list-service'
import {
  getAllCaseList,
  getCaseListById,
  getCaseListGroups,
  getCaseListPaginated,
  createCaseList,
  updateCaseList,
  deleteCaseList,
  deleteCaseListBulk,
  checkDuplicateInquiryKeyword,
  ensureCaseOwnerFollowingIdColumn,
  ensureCaseDeliveryServiceInchargeIdColumn,
  ensureCaseListSchema,
} from './src/service/connection/case-list-service'
import {
  createCaseInquiryListBulk,
  getCaseInquiryListByCaseId,
  replaceCaseInquiryListByCaseId,
} from './src/service/connection/case-inquiry-list-service'
import {
  ensureCaseMemoTable,
  getCaseMemoListByCaseId,
  getCaseMemoListByCaseIds,
  createCaseMemo,
  updateCaseMemo,
  deleteCaseMemo,
  deleteCaseMemoByCaseId,
} from './src/service/connection/case-memo-list-service'
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
          dict_value_remark: body.dict_value_remark == null || body.dict_value_remark === '' ? null : String(body.dict_value_remark),
          dict_key: String(body.dict_key ?? ''),
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

    const byPrefixMatch = subPath.match(/^\/by-prefix\/(.+)$/)
    if (byPrefixMatch) {
      if (method === 'GET') {
        const prefix = decodeURIComponent(byPrefixMatch[1])
        const rows = await getCaseDictByKeyPrefix(prefix)
        sendJson(res, 200, { success: true, data: rows })
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
          dict_value_remark: body.dict_value_remark == null || body.dict_value_remark === '' ? null : String(body.dict_value_remark),
          dict_key: String(body.dict_key ?? ''),
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
          vesselFleetManager: toOptStr(searchParams.get('vesselFleetManager')),
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
          vessel_fleet_manager: toOptStr(body.vessel_fleet_manager as any),
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
          vessel_fleet_manager: toOptStr(body.vessel_fleet_manager as any),
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

async function handleSupplierListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/supplier-list')) {
    return false
  }

  const subPath = pathname.slice('/api/supplier-list'.length) || '/'

  function toOptStr(s: string | null | unknown): string | undefined {
    if (s === null) return undefined
    if (s === undefined) return undefined
    const str = String(s)
    if (str === '') return undefined
    return str
  }

  function toOptNumber(n: unknown): number | undefined {
    if (n === null || n === undefined || n === '') return undefined
    const num = Number(n)
    if (isNaN(num)) return undefined
    return num
  }

  try {
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 1000)
        const result = await getSupplierListPaginated({
          page,
          pageSize,
          supplierName: toOptStr(searchParams.get('supplierName')),
          supplierShortname: toOptStr(searchParams.get('supplierShortname')),
          supplierField: toOptStr(searchParams.get('supplierField')),
          supplierAdvantage: toOptStr(searchParams.get('supplierAdvantage')),
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
        const created = await createSupplierList({
          supplier_name: String(body.supplier_name ?? ''),
          supplier_shortname: toOptStr(body.supplier_shortname),
          supplier_address: toOptStr(body.supplier_address),
          supplier_field: toOptStr(body.supplier_field),
          supplier_advantage: toOptStr(body.supplier_advantage),
          supplier_contact_id: toOptNumber(body.supplier_contact_id),
          supplier_remark: toOptStr(body.supplier_remark),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllSupplierList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getSupplierListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteSupplierListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const supplierId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getSupplierListById(supplierId)
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
        const updated = await updateSupplierList(supplierId, {
          supplier_name: body.supplier_name == null ? undefined : String(body.supplier_name),
          supplier_shortname: toOptStr(body.supplier_shortname),
          supplier_address: toOptStr(body.supplier_address),
          supplier_field: toOptStr(body.supplier_field),
          supplier_advantage: toOptStr(body.supplier_advantage),
          supplier_contact_id: toOptNumber(body.supplier_contact_id),
          supplier_remark: toOptStr(body.supplier_remark),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteSupplierList(supplierId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[supplier-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleCollaborationListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/collaboration-list')) {
    return false
  }

  const subPath = pathname.slice('/api/collaboration-list'.length) || '/'

  function toOptStr(s: string | null | unknown): string | undefined {
    if (s === null) return undefined
    if (s === undefined) return undefined
    const str = String(s)
    if (str === '') return undefined
    return str
  }

  function toOptNumber(n: unknown): number | undefined {
    if (n === null || n === undefined || n === '') return undefined
    const num = Number(n)
    if (isNaN(num)) return undefined
    return num
  }

  try {
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 1000)
        const result = await getCollaborationListPaginated({
          page,
          pageSize,
          collaborationName: toOptStr(searchParams.get('collaborationName')),
          collaborationShortname: toOptStr(searchParams.get('collaborationShortname')),
          collaborationField: toOptStr(searchParams.get('collaborationField')),
          contactId: toOptNumber(searchParams.get('contactId')),
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
        const created = await createCollaborationList({
          collaboration_name: String(body.collaboration_name ?? ''),
          collaboration_shortname: toOptStr(body.collaboration_shortname),
          collaboration_address: toOptStr(body.collaboration_address),
          collaboration_field: toOptStr(body.collaboration_field),
          collaboration_contact_id: toOptNumber(body.collaboration_contact_id),
          collaboration_remark: toOptStr(body.collaboration_remark),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllCollaborationList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getCollaborationListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteCollaborationListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const collaborationId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getCollaborationListById(collaborationId)
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
        const updated = await updateCollaborationList(collaborationId, {
          collaboration_name: body.collaboration_name == null ? undefined : String(body.collaboration_name),
          collaboration_shortname: toOptStr(body.collaboration_shortname),
          collaboration_address: toOptStr(body.collaboration_address),
          collaboration_field: toOptStr(body.collaboration_field),
          collaboration_contact_id: toOptNumber(body.collaboration_contact_id),
          collaboration_remark: toOptStr(body.collaboration_remark),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteCollaborationList(collaborationId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[collaboration-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleContactListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/contact-list')) {
    return false
  }

  const subPath = pathname.slice('/api/contact-list'.length) || '/'

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
        const result = await getContactListPaginated({
          page,
          pageSize,
          contactName: toOptStr(searchParams.get('contactName')),
          contactType: toOptStr(searchParams.get('contactType')),
          contactSearch: toOptStr(searchParams.get('contactSearch')),
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
        const created = await createContactList({
          contact_name: String(body.contact_name ?? ''),
          contact_mobile: toOptStr(body.contact_mobile),
          contact_email: toOptStr(body.contact_email),
          contact_type: toOptStr(body.contact_type),
          contact_rank: toOptStr(body.contact_rank),
          contact_division_type: toOptStr(body.contact_division_type),
          contact_division_id: toOptStr(body.contact_division_id),
          contact_remark: toOptStr(body.contact_remark),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllContactList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/by-division') {
      if (method === 'GET') {
        const type = toOptStr(searchParams.get('type'))
        const id = toOptStr(searchParams.get('id'))
        if (!type || !id) {
          sendJson(res, 400, { success: false, message: 'Missing type or id' })
        } else {
          const rows = await getContactListByDivision(type, id)
          sendJson(res, 200, { success: true, data: rows })
        }
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getContactListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteContactListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const contactId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getContactListById(contactId)
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
        const updated = await updateContactList(contactId, {
          contact_name: body.contact_name == null ? undefined : String(body.contact_name),
          contact_mobile: toOptStr(body.contact_mobile),
          contact_email: toOptStr(body.contact_email),
          contact_type: toOptStr(body.contact_type),
          contact_rank: toOptStr(body.contact_rank),
          contact_division_type: toOptStr(body.contact_division_type),
          contact_division_id: toOptStr(body.contact_division_id),
          contact_remark: toOptStr(body.contact_remark),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteContactList(contactId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[contact-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleCaseListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/case-list')) {
    return false
  }

  const subPath = pathname.slice('/api/case-list'.length) || '/'

  function toOptStr(s: string | null | unknown): string | undefined {
    if (s === null) return undefined
    if (s === undefined) return undefined
    const str = String(s)
    if (str === '') return undefined
    return str
  }

  function toOptNumOrNull(
    v: unknown
  ): number | string | null | undefined {
    if (v === null) return null
    if (v === undefined) return undefined
    if (v === '') return null
    const n = Number(v)
    if (Number.isNaN(n)) return undefined
    return n
  }

  try {
    await ensureCaseListSchema()
    await ensureCaseOwnerFollowingIdColumn()
    await ensureCaseDeliveryServiceInchargeIdColumn()
    await ensureCaseMemoTable()
    if (subPath === '/' || subPath === '') {
      if (method === 'GET') {
        const page = Number(searchParams.get('page') ?? 1)
        const pageSize = Number(searchParams.get('pageSize') ?? 50)
        const toArr = (key: string): string[] | undefined => {
          const raw = searchParams.getAll(key)
          if (raw.length === 0) return undefined
          const list = raw
            .flatMap((v) => String(v ?? '').split(','))
            .map((s) => s.trim())
            .filter(Boolean)
          return list.length > 0 ? list : undefined
        }
        const result = await getCaseListPaginated({
          page,
          pageSize,
          vesselName: toOptStr(searchParams.get('vesselName')),
          invoiceNumber: toOptStr(searchParams.get('invoiceNumber')),
          orderNumber: toOptStr(searchParams.get('orderNumber')),
          orderNumberHasValue:
            searchParams.get('orderNumberHasValue') === 'true'
              ? true
              : undefined,
          caseInquiryKeyword: toOptStr(searchParams.get('caseInquiryKeyword')),
          caseInquiryDateFrom: toOptStr(
            searchParams.get('caseInquiryDateFrom')
          ),
          caseInquiryDateTo: toOptStr(searchParams.get('caseInquiryDateTo')),
          caseProgress: toArr('caseProgress'),
          caseUrgent: toArr('caseUrgent'),
          caseShouldHandleToday: toArr('caseShouldHandleToday'),
          caseInquiryType: toArr('caseInquiryType'),
          caseIncharge: toArr('caseIncharge'),
          caseRank: toArr('caseRank'),
          vesselPosition: toArr('vesselPosition'),
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
        const created = await createCaseList({
          vessel_name: toOptStr(body.vessel_name),
          invoice_number: toOptStr(body.invoice_number),
          order_number: toOptStr(body.order_number),
          case_inquiry_keyword: toOptStr(body.case_inquiry_keyword),
          case_progress: toOptStr(body.case_progress),
          case_urgent: toOptStr(body.case_urgent),
          case_inquiry_type: toOptStr(body.case_inquiry_type),
          case_inquiry_date: toOptStr(body.case_inquiry_date),
          case_follow_date: toOptStr(body.case_follow_date),
          case_uptodate_date: toOptStr(body.case_uptodate_date),
          case_should_handle_today: toOptStr(body.case_should_handle_today),
          owner_following: toOptStr(body.owner_following),
          owner_following_id: toOptNumOrNull(body.owner_following_id),
          shipyard_business: toOptStr(body.shipyard_business),
          case_agent: toOptStr(body.case_agent),
          case_superintendent: toOptStr(body.case_superintendent),
          case_superintendent_id: toOptNumOrNull(body.case_superintendent_id),
          case_surveyor: toOptStr(body.case_surveyor),
          case_delivery_or_service_incharge: toOptStr(body.case_delivery_or_service_incharge),
          case_delivery_or_service_incharge_id: toOptStr(body.case_delivery_or_service_incharge_id),
          case_delivery_or_service_deadline: toOptStr(body.case_delivery_or_service_deadline),
          case_eta_cargo_ready_date: toOptStr(body.case_eta_cargo_ready_date),
          case_etb_cargo_departure_date: toOptStr(body.case_etb_cargo_departure_date),
          case_etd_cargo_delivery_date: toOptStr(body.case_etd_cargo_delivery_date),
          vessel_position: toOptStr(body.vessel_position),
          case_settlement_done: toOptStr(body.case_settlement_done),
          case_epd: toOptStr(body.case_epd),
          case_spd: toOptStr(body.case_spd),
          case_incharge: toOptStr(body.case_incharge),
          case_memo_name: toOptStr(body.case_memo_name),
          case_memo_address: toOptStr(body.case_memo_address),
          case_rank: toOptStr(body.case_rank),
        })
        sendJson(res, 200, { success: true, data: created })
        return true
      }
    }

    if (subPath === '/all') {
      if (method === 'GET') {
        const rows = await getAllCaseList()
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/groups') {
      if (method === 'GET') {
        const groups = await getCaseListGroups()
        sendJson(res, 200, { success: true, data: groups })
        return true
      }
    }

    if (subPath === '/check-keyword') {
      if (method === 'GET') {
        const keyword = toOptStr(searchParams.get('keyword'))
        if (!keyword) {
          sendJson(res, 200, { success: true, data: { exists: false } })
          return true
        }
        const excludeCaseIdRaw = searchParams.get('excludeCaseId')
        const excludeCaseId =
          excludeCaseIdRaw != null && excludeCaseIdRaw !== '' &&
          !Number.isNaN(Number(excludeCaseIdRaw))
            ? Number(excludeCaseIdRaw)
            : undefined
        const result = await checkDuplicateInquiryKeyword({
          keyword,
          excludeCaseId,
        })
        sendJson(res, 200, { success: true, data: result })
        return true
      }
    }

    if (subPath === '/bulk-delete') {
      if (method === 'POST') {
        const body = (await readBody(req)) as { ids?: number[] } | undefined
        const ids = body?.ids ?? []
        const n = await deleteCaseListBulk(ids)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    const idMatch = subPath.match(/^\/(\d+)$/)
    if (idMatch) {
      const caseId = Number(idMatch[1])
      if (method === 'GET') {
        const row = await getCaseListById(caseId)
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
        const updated = await updateCaseList(caseId, {
          vessel_name: toOptStr(body.vessel_name),
          invoice_number: toOptStr(body.invoice_number),
          order_number: toOptStr(body.order_number),
          case_inquiry_keyword: toOptStr(body.case_inquiry_keyword),
          case_progress: toOptStr(body.case_progress),
          case_urgent: toOptStr(body.case_urgent),
          case_inquiry_type: toOptStr(body.case_inquiry_type),
          case_inquiry_date: toOptStr(body.case_inquiry_date),
          case_follow_date: toOptStr(body.case_follow_date),
          case_uptodate_date: toOptStr(body.case_uptodate_date),
          case_should_handle_today: toOptStr(body.case_should_handle_today),
          owner_following: toOptStr(body.owner_following),
          owner_following_id: toOptNumOrNull(body.owner_following_id),
          shipyard_business: toOptStr(body.shipyard_business),
          case_agent: toOptStr(body.case_agent),
          case_superintendent: toOptStr(body.case_superintendent),
          case_superintendent_id: toOptNumOrNull(body.case_superintendent_id),
          case_surveyor: toOptStr(body.case_surveyor),
          case_delivery_or_service_incharge: toOptStr(body.case_delivery_or_service_incharge),
          case_delivery_or_service_incharge_id: toOptStr(body.case_delivery_or_service_incharge_id),
          case_delivery_or_service_deadline: toOptStr(body.case_delivery_or_service_deadline),
          case_eta_cargo_ready_date: toOptStr(body.case_eta_cargo_ready_date),
          case_etb_cargo_departure_date: toOptStr(body.case_etb_cargo_departure_date),
          case_etd_cargo_delivery_date: toOptStr(body.case_etd_cargo_delivery_date),
          vessel_position: toOptStr(body.vessel_position),
          case_settlement_done: toOptStr(body.case_settlement_done),
          case_epd: toOptStr(body.case_epd),
          case_spd: toOptStr(body.case_spd),
          case_incharge: toOptStr(body.case_incharge),
          case_memo_name: toOptStr(body.case_memo_name),
          case_memo_address: toOptStr(body.case_memo_address),
          case_rank: toOptStr(body.case_rank),
        })
        sendJson(res, 200, { success: true, data: updated })
        return true
      }
      if (method === 'DELETE') {
        const ok = await deleteCaseList(caseId)
        sendJson(res, 200, { success: ok, data: { deleted: ok ? 1 : 0 } })
        return true
      }
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[case-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleCaseInquiryListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname } = parseUrl(req)

  if (!pathname.startsWith('/api/case-inquiry-list')) {
    return false
  }

  const subPath =
    pathname.slice('/api/case-inquiry-list'.length) || '/'

  try {
    const byCaseMatch = subPath.match(/^\/by-case\/(\d+)$/)
    if (byCaseMatch) {
      if (method === 'GET') {
        const caseId = Number(byCaseMatch[1])
        const rows = await getCaseInquiryListByCaseId(caseId)
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
    }

    if (subPath === '/bulk-insert' && method === 'POST') {
      const body = (await readBody(req)) as
        | { rows?: Array<Record<string, unknown>> }
        | undefined
      if (!body || !Array.isArray(body.rows)) {
        sendJson(res, 400, {
          success: false,
          message: '参数非法，需要 rows 数组',
        })
        return true
      }
      const rows = body.rows.map((r) => ({
        case_id: Number(r.case_id),
        case_inquiry_division_id:
          r.case_inquiry_division_id == null ||
          r.case_inquiry_division_id === ''
            ? null
            : Number(r.case_inquiry_division_id),
        case_inquiry_type:
          r.case_inquiry_type == null || r.case_inquiry_type === ''
            ? null
            : String(r.case_inquiry_type),
        case_inquired_date:
          r.case_inquired_date == null || r.case_inquired_date === ''
            ? null
            : String(r.case_inquired_date),
        case_inquiry_remark:
          r.remark != null && r.remark !== ''
            ? String(r.remark)
            : r.case_inquiry_remark != null && r.case_inquiry_remark !== ''
              ? String(r.case_inquiry_remark)
              : null,
      }))
      const inserted = await createCaseInquiryListBulk(rows)
      sendJson(res, 200, { success: true, data: { inserted } })
      return true
    }

    if (subPath === '/replace-by-case' && method === 'POST') {
      const body = (await readBody(req)) as
        | { case_id: unknown; rows?: Array<Record<string, unknown>> }
        | undefined
      const caseId = Number(body?.case_id)
      if (!Number.isFinite(caseId) || caseId <= 0) {
        sendJson(res, 400, {
          success: false,
          message: '参数非法，需要 case_id',
        })
        return true
      }
      if (!body || !Array.isArray(body.rows)) {
        sendJson(res, 400, {
          success: false,
          message: '参数非法，需要 rows 数组',
        })
        return true
      }
      const rows = body.rows.map((r) => ({
        case_inquiry_division_id:
          r.case_inquiry_division_id == null ||
          r.case_inquiry_division_id === ''
            ? null
            : Number(r.case_inquiry_division_id),
        case_inquiry_type:
          r.case_inquiry_type == null || r.case_inquiry_type === ''
            ? null
            : String(r.case_inquiry_type),
        case_inquired_date:
          r.case_inquired_date == null || r.case_inquired_date === ''
            ? null
            : String(r.case_inquired_date),
        case_inquiry_remark:
          r.remark != null && r.remark !== ''
            ? String(r.remark)
            : r.case_inquiry_remark != null && r.case_inquiry_remark !== ''
              ? String(r.case_inquiry_remark)
              : null,
      }))
      const result = await replaceCaseInquiryListByCaseId(caseId, rows)
      sendJson(res, 200, { success: true, data: result })
      return true
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[case-inquiry-list API error]', err)
    sendJson(res, 500, {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
    return true
  }
}

async function handleCaseMemoListApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method ?? 'GET'
  const { pathname, searchParams } = parseUrl(req)

  if (!pathname.startsWith('/api/case-memo-list')) {
    return false
  }

  const subPath =
    pathname.slice('/api/case-memo-list'.length) || '/'

  try {
    await ensureCaseMemoTable()

    const byCaseMatch = subPath.match(/^\/by-case\/(\d+)$/)
    if (byCaseMatch) {
      if (method === 'GET') {
        const caseId = Number(byCaseMatch[1])
        const rows = await getCaseMemoListByCaseId(caseId)
        sendJson(res, 200, { success: true, data: rows })
        return true
      }
      if (method === 'DELETE') {
        const caseId = Number(byCaseMatch[1])
        const n = await deleteCaseMemoByCaseId(caseId)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    if (subPath === '/by-case-ids' && method === 'GET') {
      const raw = searchParams.get('ids') ?? ''
      const ids = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0)
      const rows = await getCaseMemoListByCaseIds(ids)
      sendJson(res, 200, { success: true, data: rows })
      return true
    }

    const byIdMatch = subPath.match(/^\/(\d+)$/)
    if (byIdMatch) {
      const memoId = Number(byIdMatch[1])
      if (method === 'PUT') {
        const body = (await readBody(req)) as
          | Record<string, unknown>
          | undefined
        const updated = await updateCaseMemo(memoId, {
          case_memo_date:
            body?.case_memo_date == null || body.case_memo_date === ''
              ? null
              : String(body.case_memo_date),
          case_memo_content:
            body?.case_memo_content == null || body.case_memo_content === ''
              ? null
              : String(body.case_memo_content),
          case_memo_remark:
            body?.case_memo_remark == null || body.case_memo_remark === ''
              ? null
              : String(body.case_memo_remark),
          case_memo_attachment:
            body?.case_memo_attachment == null ||
            body.case_memo_attachment === ''
              ? null
              : String(body.case_memo_attachment),
        })
        if (updated) {
          sendJson(res, 200, { success: true, data: updated })
        } else {
          sendJson(res, 404, { success: false, message: '未找到该备忘' })
        }
        return true
      }
      if (method === 'DELETE') {
        const n = await deleteCaseMemo(memoId)
        sendJson(res, 200, { success: true, data: { deleted: n } })
        return true
      }
    }

    if ((subPath === '/' || subPath === '') && method === 'POST') {
      const body = (await readBody(req)) as
        | Record<string, unknown>
        | undefined
      if (!body || !Number.isFinite(Number(body.case_id))) {
        sendJson(res, 400, {
          success: false,
          message: '参数非法，需要 case_id',
        })
        return true
      }
      const created = await createCaseMemo({
        case_id: Number(body.case_id),
        case_memo_date:
          body.case_memo_date == null || body.case_memo_date === ''
            ? null
            : String(body.case_memo_date),
        case_memo_content:
          body.case_memo_content == null || body.case_memo_content === ''
            ? null
            : String(body.case_memo_content),
        case_memo_remark:
          body.case_memo_remark == null || body.case_memo_remark === ''
            ? null
            : String(body.case_memo_remark),
        case_memo_attachment:
          body.case_memo_attachment == null ||
          body.case_memo_attachment === ''
            ? null
            : String(body.case_memo_attachment),
      })
      sendJson(res, 200, { success: true, data: created })
      return true
    }

    sendJson(res, 404, { success: false, message: 'Route not found' })
    return true
  } catch (err) {
    console.error('[case-memo-list API error]', err)
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
