export const CASE_LIST_FROM = {
  case_list: '/case_list',
  case_today_list: '/case_today_list',
  case_deal_list: '/case_deal_list',
} as const

export type CaseListFromKey = keyof typeof CASE_LIST_FROM
export type CaseListFromPath = (typeof CASE_LIST_FROM)[CaseListFromKey]

export const CASE_LIST_TO_LABEL: Record<CaseListFromPath, string> = {
  '/case_list': '案件列表',
  '/case_today_list': '今日待办',
  '/case_deal_list': '我处理的',
}

export type BaseCasesSearch = Record<string, unknown>

const SEARCH_FROM_KEY = '__from'
const SEARCH_LIST_SEARCH_KEY = '__listSearch'

const IS_NODE =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null

function toBase64Url(str: string): string {
  if (IS_NODE) {
    return Buffer.from(str, 'utf-8').toString('base64url')
  }
  let binary = ''
  const bytes = new TextEncoder().encode(str)
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(safe: string): string | null {
  try {
    if (IS_NODE) {
      return Buffer.from(safe, 'base64url').toString('utf-8')
    }
    const b64 = safe.replace(/-/g, '+').replace(/_/g, '/')
    const pad = 4 - (b64.length % 4)
    const padded = pad === 4 ? b64 : b64 + '='.repeat(pad)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function buildCaseNavSearch(params: {
  fromPath: CaseListFromPath
  listSearch: BaseCasesSearch
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const cleaned: BaseCasesSearch = {}
  for (const key of Object.keys(params.listSearch)) {
    if (key === SEARCH_FROM_KEY || key === SEARCH_LIST_SEARCH_KEY) continue
    const v = params.listSearch[key]
    if (v === undefined || v === null) continue
    cleaned[key] = v
  }
  payload[SEARCH_FROM_KEY] = params.fromPath
  try {
    const json = JSON.stringify(cleaned)
    payload[SEARCH_LIST_SEARCH_KEY] = toBase64Url(json)
  } catch {
    payload[SEARCH_LIST_SEARCH_KEY] = toBase64Url('{}')
  }
  return payload
}

export type ResolvedCaseNav = {
  fromPath: CaseListFromPath
  fromLabel: string
  listSearch: BaseCasesSearch
}

const VALID_FROM_PATHS: CaseListFromPath[] = [
  '/case_list',
  '/case_today_list',
  '/case_deal_list',
]

export function resolveCaseNavFromSearch(
  raw: Record<string, unknown>,
  fallback: CaseListFromPath = '/case_list'
): ResolvedCaseNav {
  const rawFrom = raw[SEARCH_FROM_KEY]
  const fromPath =
    typeof rawFrom === 'string' &&
    VALID_FROM_PATHS.includes(rawFrom as CaseListFromPath)
      ? (rawFrom as CaseListFromPath)
      : fallback

  let listSearch: BaseCasesSearch = {}
  const rawListSearch = raw[SEARCH_LIST_SEARCH_KEY]
  if (typeof rawListSearch === 'string' && rawListSearch.length > 0) {
    const json = fromBase64Url(rawListSearch)
    if (json) {
      try {
        const parsed = JSON.parse(json)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          listSearch = parsed as BaseCasesSearch
        }
      } catch {
        listSearch = {}
      }
    }
  }

  return {
    fromPath,
    fromLabel: CASE_LIST_TO_LABEL[fromPath] ?? '案件列表',
    listSearch,
  }
}
