import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import { getRouteApi } from '@tanstack/react-router'
import { UserRound, Briefcase, AlertCircle, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchContactAll,
  type Contact,
} from '@/features/contacts/api/client'
import {
  fetchSupplierDetail,
  fetchSupplierGroups,
  type SupplierDictEntry,
  type Supplier,
} from '@/features/suppliers/api/client'
import { SupplierDetailShell } from './supplier-detail-shell'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setSupplierDetailAll,
  resetSupplierDetail,
} from '@/store/slices/supplier-detail-slice'

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
  const dispatch = useAppDispatch()
  const { supplierId } = route.useParams()
  const { supplier, isLoading, error, isNotFound } =
    useSupplierDetailQuery(supplierId)

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

  useEffect(() => {
    dispatch(
      setSupplierDetailAll({
        supplierId,
        supplier: supplier as Supplier | null,
        isLoading,
        error,
        contactRows: contactRows as Contact[],
        fieldDict,
      })
    )
    return () => {
      dispatch(resetSupplierDetail())
    }
  }, [dispatch, supplierId, supplier, isLoading, error, contactRows, fieldDict])

  const pageTitle =
    (supplier as Supplier | null)?.supplier_shortname ||
    (supplier as Supplier | null)?.supplier_name ||
    '供应商详情'
  const pageSub = (supplier as Supplier | null)?.supplier_name
    ? (supplier as Supplier).supplier_advantage
      ? `${(supplier as Supplier).supplier_name} · ${(supplier as Supplier).supplier_advantage}`
      : (supplier as Supplier).supplier_name
    : undefined

  const sidebarItems = [
    {
      title: '基本信息',
      href: `/supplier_detail/${supplierId}`,
      icon: <UserRound size={18} />,
    },
    {
      title: '员工信息',
      href: `/supplier_detail/${supplierId}/info`,
      icon: <Briefcase size={18} />,
    },
    {
      title: '合作记录',
      href: `/supplier_detail/${supplierId}/cooperation`,
      icon: <ClipboardList size={18} />,
    },
  ]

  return (
    <>
      <SupplierDetailShell
        supplierId={supplierId}
        title={pageTitle}
        subTitle={pageSub}
        sidebarItems={sidebarItems}
      >
        {isLoading && <SupplierDetailSkeleton />}
        {!isLoading && error && <SupplierDetailError error={error} />}
        {!isLoading && !error && isNotFound && (
          <SupplierDetailNotFound supplierId={supplierId} />
        )}
        {!isLoading && !error && !isNotFound && supplier && <Outlet />}
      </SupplierDetailShell>
    </>
  )
}

export function useSupplierDetail(): SupplierDetailCtxValue {
  const state = useAppSelector((s) => s.supplierDetail)

  const contactNameMap = useMemo(() => {
    const out = new Map<string, string>()
    for (const c of state.contactRows) {
      if (!c.contact_name) continue
      out.set(String(c.contact_id), c.contact_name)
    }
    return out
  }, [state.contactRows])

  const contactMap = useMemo(() => {
    const out = new Map<string, Contact>()
    for (const c of state.contactRows) {
      out.set(String(c.contact_id), c)
    }
    return out
  }, [state.contactRows])

  return {
    supplierId: state.supplierId,
    supplier: state.supplier,
    isLoading: state.isLoading,
    error: state.error,
    contactNameMap,
    contactMap,
    fieldDict: state.fieldDict,
  }
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
        <div className='-mx-1 space-y-4 px-1.5 lg:max-w-xl'>
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
