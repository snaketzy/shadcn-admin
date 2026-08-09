import { createContext, useContext, useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { UserRound, Briefcase, AlertCircle } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchSupplierDetail, fetchSupplierGroups, type SupplierDictEntry } from '@/features/suppliers/api/client'
import { fetchContactAll, type Contact } from '@/features/contacts/api/client'
import { SupplierDetailShell } from './supplier-detail-shell'

const route = getRouteApi('/_authenticated/supplier_detail/$supplierId')

export type SupplierDetailCtxValue = {
  supplierId: string
  supplier: ReturnType<typeof useSupplierDetailQuery>['supplier']
  isLoading: boolean
  error: Error | null
  contactNameMap: Map<string, string>
  contactMap: Map<string, Contact>
  fieldDict: SupplierDictEntry[]
}

const SupplierDetailCtx = createContext<SupplierDetailCtxValue | null>(null)

function useSupplierDetailQuery(supplierId: string) {
  const idNum = Number(supplierId)
  const enabled = !isNaN(idNum) && idNum > 0
  const detailQuery = useQuery({
    queryKey: ['supplier-detail', supplierId],
    queryFn: () => fetchSupplierDetail(idNum),
    enabled,
    staleTime: 30 * 1000,
  })
  return {
    supplier: detailQuery.data ?? null,
    isLoading: detailQuery.isFetching || detailQuery.isLoading,
    error: (detailQuery.error as Error | null) ?? null,
    isNotFound: enabled && !detailQuery.isFetching && detailQuery.data === null,
  }
}

export function SupplierDetailRoute() {
  const { supplierId } = route.useParams()
  const { supplier, isLoading, error, isNotFound } = useSupplierDetailQuery(supplierId)

  const { data: groupsData } = useQuery({
    queryKey: ['supplier-list-groups'],
    queryFn: fetchSupplierGroups,
    staleTime: 60 * 1000,
  })
  const fieldDict = groupsData?.fieldDict ?? []

  const { data: contactRows = [] } = useQuery({
    queryKey: ['contact-picker-all'],
    queryFn: fetchContactAll,
    staleTime: 60 * 1000,
  })

  const contactNameMap = useMemo(() => {
    const out = new Map<string, string>()
    for (const c of contactRows as Contact[]) {
      if (!c.contact_name) continue
      out.set(String(c.contact_id), c.contact_name)
    }
    return out
  }, [contactRows])

  const contactMap = useMemo(() => {
    const out = new Map<string, Contact>()
    for (const c of contactRows as Contact[]) {
      out.set(String(c.contact_id), c)
    }
    return out
  }, [contactRows])

  const pageTitle = supplier?.supplier_shortname || supplier?.supplier_name || '供应商详情'
  const pageSub = supplier?.supplier_name
    ? supplier.supplier_shortname
      ? `${supplier.supplier_name} · ${supplier.supplier_shortname}`
      : supplier.supplier_name
    : undefined

  const sidebarItems = [
    {
      title: '基本信息',
      href: `/supplier_detail/${supplierId}`,
      icon: <UserRound size={18} />,
    },
    {
      title: '供应商信息',
      href: `/supplier_detail/${supplierId}/info`,
      icon: <Briefcase size={18} />,
    },
  ]

  const ctx: SupplierDetailCtxValue = {
    supplierId,
    supplier,
    isLoading,
    error,
    contactNameMap,
    contactMap,
    fieldDict,
  }

  return (
    <SupplierDetailCtx.Provider value={ctx}>
      <SupplierDetailShell
        supplierId={supplierId}
        title={pageTitle}
        subTitle={pageSub}
        sidebarItems={sidebarItems}
      >
        {isLoading && <SupplierDetailSkeleton />}
        {!isLoading && error && (
          <SupplierDetailError error={error} />
        )}
        {!isLoading && !error && isNotFound && (
          <SupplierDetailNotFound supplierId={supplierId} />
        )}
        {!isLoading && !error && !isNotFound && supplier && <Outlet />}
      </SupplierDetailShell>
    </SupplierDetailCtx.Provider>
  )
}

export function useSupplierDetail(): SupplierDetailCtxValue {
  const ctx = useContext(SupplierDetailCtx)
  if (!ctx) {
    throw new Error('useSupplierDetail must be used within SupplierDetailCtx Provider')
  }
  return ctx
}

function SupplierDetailSkeleton() {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='mt-2 h-4 w-56' />
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 space-y-4 lg:max-w-xl'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      </div>
    </div>
  )
}

function SupplierDetailError({ error }: { error: Error }) {
  const navigate = useNavigateSupp()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='flex items-center gap-2 text-lg font-medium text-destructive'>
          <AlertCircle className='size-5' />
          加载失败
        </h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          {error.message || '无法加载供应商详情，请稍后重试。'}
        </p>
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => window.location.reload()}>
              重新加载
            </Button>
            <Button onClick={() => navigate.toList()}>返回列表</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SupplierDetailNotFound({ supplierId }: { supplierId: string }) {
  const navigate = useNavigateSupp()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>供应商不存在</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          未找到 ID 为「{supplierId}」的供应商记录，可能已被删除或 ID 不正确。
        </p>
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>
          <Button onClick={() => navigate.toList()}>返回供应商列表</Button>
        </div>
      </div>
    </div>
  )
}

function useNavigateSupp() {
  const navigate = route.useNavigate()
  return {
    toList: () => navigate({ to: '/supplier_list' }),
  }
}
