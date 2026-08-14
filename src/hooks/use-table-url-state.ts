import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
} from '@tanstack/react-table'

type SearchRecord = Record<string, unknown>

export type NavigateFn = (opts: {
  search:
    | true
    | SearchRecord
    | ((prev: SearchRecord) => Partial<SearchRecord> | SearchRecord)
  replace?: boolean
}) => void

type UseTableUrlStateParams = {
  search: SearchRecord
  navigate: NavigateFn
  pagination?: {
    pageKey?: string
    pageSizeKey?: string
    defaultPage?: number
    defaultPageSize?: number
  }
  globalFilter?: {
    enabled?: boolean
    key?: string
    trim?: boolean
  }
  columnFilters?: Array<
    | {
        columnId: string
        searchKey: string
        type?: 'string'
        // Optional transformers for custom types
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
    | {
        columnId: string
        searchKey: string
        type: 'array'
        serialize?: (value: unknown) => unknown
        deserialize?: (value: unknown) => unknown
      }
  >
}

type UseTableUrlStateReturn = {
  // Global filter
  globalFilter?: string
  onGlobalFilterChange?: OnChangeFn<string>
  // Column filters
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>
  // Pagination
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  // Helpers
  ensurePageInRange: (
    pageCount: number,
    opts?: { resetTo?: 'first' | 'last' }
  ) => void
}

export function useTableUrlState(
  params: UseTableUrlStateParams
): UseTableUrlStateReturn {
  const {
    search,
    navigate,
    pagination: paginationCfg,
    globalFilter: globalFilterCfg,
    columnFilters: columnFiltersCfg = [],
  } = params

  const pageKey = paginationCfg?.pageKey ?? ('page' as string)
  const pageSizeKey = paginationCfg?.pageSizeKey ?? ('pageSize' as string)
  const defaultPage = paginationCfg?.defaultPage ?? 1
  const defaultPageSize = paginationCfg?.defaultPageSize ?? 50

  const globalFilterKey = globalFilterCfg?.key ?? ('filter' as string)
  const globalFilterEnabled = globalFilterCfg?.enabled ?? true
  const trimGlobal = globalFilterCfg?.trim ?? true

  // Build initial column filters from the current search params
  const initialColumnFilters: ColumnFiltersState = useMemo(() => {
    const collected: ColumnFiltersState = []
    for (const cfg of columnFiltersCfg) {
      const raw = (search as SearchRecord)[cfg.searchKey]
      const deserialize = cfg.deserialize ?? ((v: unknown) => v)
      if (cfg.type === 'string') {
        const value = (deserialize(raw) as string) ?? ''
        if (typeof value === 'string' && value.trim() !== '') {
          collected.push({ id: cfg.columnId, value })
        }
      } else {
        // default to array type
        const value = (deserialize(raw) as unknown[]) ?? []
        if (Array.isArray(value) && value.length > 0) {
          collected.push({ id: cfg.columnId, value })
        }
      }
    }
    return collected
  }, [columnFiltersCfg, search])

  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialColumnFilters)

  useEffect(() => {
    setColumnFilters((current) => {
      let changed = current.length !== initialColumnFilters.length
      if (!changed) {
        const mapCurr = new Map(current.map((f) => [f.id, f.value]))
        for (const next of initialColumnFilters) {
          const v1 = mapCurr.get(next.id)
          const v2 = next.value
          if (JSON.stringify(v1) !== JSON.stringify(v2)) {
            changed = true
            break
          }
        }
      }
      return changed ? initialColumnFilters : current
    })
  }, [initialColumnFilters])

  const pagination: PaginationState = useMemo(() => {
    const rawPage = (search as SearchRecord)[pageKey]
    const rawPageSize = (search as SearchRecord)[pageSizeKey]
    const parsePositiveInt = (
      v: unknown,
      fallback: number
    ): number => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        return Math.max(1, Math.floor(v))
      }
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return Math.max(1, Math.floor(n))
      }
      return fallback
    }
    const pageNum = parsePositiveInt(rawPage, defaultPage)
    const pageSizeNum = parsePositiveInt(rawPageSize, defaultPageSize)
    return { pageIndex: Math.max(0, pageNum - 1), pageSize: pageSizeNum }
  }, [search, pageKey, pageSizeKey, defaultPage, defaultPageSize])

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      const nextPage = next.pageIndex + 1
      const nextPageSize = next.pageSize
      const nextPageSearch = nextPage <= defaultPage ? undefined : nextPage
      const nextPageSizeSearch =
        nextPageSize === defaultPageSize ? undefined : nextPageSize
      const currentPage = (search as SearchRecord)[pageKey]
      const currentPageSize = (search as SearchRecord)[pageSizeKey]
      const samePage =
        (nextPageSearch === undefined && currentPage === undefined) ||
        nextPageSearch === currentPage
      const samePageSize =
        (nextPageSizeSearch === undefined && currentPageSize === undefined) ||
        nextPageSizeSearch === currentPageSize
      if (samePage && samePageSize) return
      navigate({
        search: (prev) => ({
          ...(prev as SearchRecord),
          [pageKey]: nextPageSearch,
          [pageSizeKey]: nextPageSizeSearch,
        }),
      })
    },
    [navigate, pagination, search, pageKey, defaultPage, pageSizeKey, defaultPageSize]
  )

  const [globalFilter, setGlobalFilter] = useState<string | undefined>(() => {
    if (!globalFilterEnabled) return undefined
    const raw = (search as SearchRecord)[globalFilterKey]
    return typeof raw === 'string' ? raw : ''
  })

  const onGlobalFilterChange: OnChangeFn<string> | undefined =
    globalFilterEnabled
      ? useCallback(
          (updater) => {
            const next =
              typeof updater === 'function'
                ? updater(globalFilter ?? '')
                : updater
            const value = trimGlobal ? next.trim() : next
            setGlobalFilter(value)
            navigate({
              search: (prev) => ({
                ...(prev as SearchRecord),
                [pageKey]: undefined,
                [globalFilterKey]: value ? value : undefined,
              }),
            })
          },
          [navigate, globalFilter, trimGlobal, pageKey, globalFilterKey]
        )
      : undefined

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback(
    (updater) => {
      const next =
        typeof updater === 'function' ? updater(columnFilters) : updater
      setColumnFilters(next)

      const patch: Record<string, unknown> = {}

      for (const cfg of columnFiltersCfg) {
        const found = next.find((f) => f.id === cfg.columnId)
        const serialize = cfg.serialize ?? ((v: unknown) => v)
        if (cfg.type === 'string') {
          const value =
            typeof found?.value === 'string' ? (found.value as string) : ''
          patch[cfg.searchKey] =
            value.trim() !== '' ? serialize(value) : undefined
        } else {
          const value = Array.isArray(found?.value)
            ? (found!.value as unknown[])
            : []
          patch[cfg.searchKey] = value.length > 0 ? serialize(value) : undefined
        }
      }

      navigate({
        search: (prev) => ({
          ...(prev as SearchRecord),
          [pageKey]: undefined,
          ...patch,
        }),
      })
    },
    [navigate, columnFilters, columnFiltersCfg, pageKey]
  )

  const ensurePageInRange = useCallback(
    (
      pageCount: number,
      opts: { resetTo?: 'first' | 'last' } = { resetTo: 'first' }
    ) => {
      const currentPage = (search as SearchRecord)[pageKey]
      const pageNum =
        typeof currentPage === 'number' ? currentPage : defaultPage
      if (pageCount > 0 && pageNum > pageCount) {
        navigate({
          replace: true,
          search: (prev) => ({
            ...(prev as SearchRecord),
            [pageKey]: opts.resetTo === 'last' ? pageCount : undefined,
          }),
        })
      }
    },
    [navigate, search, pageKey, defaultPage]
  )

  return {
    globalFilter: globalFilterEnabled ? (globalFilter ?? '') : undefined,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  }
}
