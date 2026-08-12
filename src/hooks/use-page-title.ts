import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { fetchCaseDictByKeyPrefix } from '@/features/dictionaries/api/client'

const BASE_TITLE = '杰弘业务管理系统'
const DEFAULT_MODULE = '首页'

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '') return '/'
  const withoutTrailing =
    pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  return withoutTrailing
}

function matchModuleTitle(
  pathname: string,
  titleMap: Map<string, string>
): string {
  const normalized = normalizePath(pathname)

  if (titleMap.has(normalized)) {
    return titleMap.get(normalized)!
  }

  const segments = normalized.split('/').filter(Boolean)
  while (segments.length > 0) {
    segments.pop()
    const candidate = '/' + segments.join('/')
    if (titleMap.has(candidate)) {
      return titleMap.get(candidate)!
    }
  }

  return DEFAULT_MODULE
}

export function usePageTitle() {
  const location = useLocation()

  const { data: menuDict = [] } = useQuery({
    queryKey: ['case-dict-menu-prefix'],
    queryFn: () => fetchCaseDictByKeyPrefix('P'),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })

  useEffect(() => {
    const titleMap = new Map<string, string>()
    for (const entry of menuDict) {
      const path = entry.dict_value
      const label = entry.dict_value_remark
      if (path && label) {
        titleMap.set(normalizePath(path), label)
      }
    }

    const moduleName = matchModuleTitle(location.pathname, titleMap)
    document.title = `${BASE_TITLE}-${moduleName}`
  }, [location.pathname, menuDict])
}
