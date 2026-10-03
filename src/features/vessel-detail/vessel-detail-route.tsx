import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, getRouteApi } from '@tanstack/react-router'
import { Ship, ClipboardList, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchVesselDetail,
  fetchVesselGroups,
  type Vessel,
  type VesselDictEntry,
} from '@/features/users/api/client'
import { VesselDetailShell } from './vessel-detail-shell'

const route = getRouteApi('/_authenticated/vessel_detail/$vesselId')

function useVesselDetailQuery(vesselId: string) {
  const idNum = Number(vesselId)
  const enabled = !isNaN(idNum) && idNum > 0
  const detailQuery = useQuery({
    queryKey: ['vessel-detail', vesselId],
    queryFn: () => fetchVesselDetail(idNum),
    enabled,
    staleTime: 30 * 1000,
  })
  return {
    vessel: detailQuery.data ?? null,
    isLoading: detailQuery.isFetching || detailQuery.isLoading,
    error: (detailQuery.error as Error | null) ?? null,
    isNotFound: enabled && !detailQuery.isFetching && detailQuery.data === null,
  }
}

export type VesselDetailCtxValue = {
  vesselId: string
  vessel: Vessel | null
  isLoading: boolean
  error: Error | null
  inchargeDict: VesselDictEntry[]
  fleetManagerDict: VesselDictEntry[]
  flagDict: VesselDictEntry[]
  classDict: VesselDictEntry[]
}

export function useVesselDetail() {
  const { vesselId } = route.useParams()
  const { vessel, isLoading, error, isNotFound } =
    useVesselDetailQuery(vesselId)

  const { data: groupsData } = useQuery({
    queryKey: ['vessel-list-groups'],
    queryFn: fetchVesselGroups,
    staleTime: 60 * 1000,
  })

  return {
    vesselId,
    vessel,
    isLoading,
    error,
    inchargeDict: groupsData?.inchargeDict ?? [],
    fleetManagerDict: groupsData?.fleetManagerDict ?? [],
    flagDict: groupsData?.flagDict ?? [],
    classDict: groupsData?.classDict ?? [],
    isNotFound,
  }
}

export function VesselDetailRoute() {
  const { vesselId, vessel, isLoading, error, isNotFound } = useVesselDetail()

  const pageTitle = vessel?.vessel_name || '船舶详情'
  const pageSub = useMemo(() => {
    if (!vessel) return undefined
    const parts: string[] = []
    if (vessel.vessel_flag) parts.push(`船旗：${vessel.vessel_flag}`)
    if (vessel.vessel_class) parts.push(`船级：${vessel.vessel_class}`)
    if (vessel.vessel_team) parts.push(`船队：${vessel.vessel_team}`)
    return parts.length > 0 ? parts.join(' · ') : undefined
  }, [vessel])

  const sidebarItems = [
    {
      title: '基本信息',
      href: `/vessel_detail/${vesselId}`,
      icon: <Ship size={18} />,
    },
    {
      title: '关联案件',
      href: `/vessel_detail/${vesselId}/cooperation`,
      icon: <ClipboardList size={18} />,
    },
  ]

  return (
    <VesselDetailShell
      vesselId={vesselId}
      title={pageTitle}
      subTitle={pageSub}
      sidebarItems={sidebarItems}
    >
      {isLoading && <VesselDetailSkeleton />}
      {!isLoading && error && <VesselDetailError error={error} />}
      {!isLoading && !error && isNotFound && (
        <VesselDetailNotFound vesselId={vesselId} />
      )}
      {!isLoading && !error && !isNotFound && vessel && <Outlet />}
    </VesselDetailShell>
  )
}

function VesselDetailSkeleton() {
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

function VesselDetailError({ error }: { error: Error }) {
  const navigate = useNavigateVessel()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='flex items-center gap-2 text-lg font-medium text-destructive'>
          <AlertCircle className='size-5' />
          加载失败
        </h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          {error.message || '无法加载船舶详情，请稍后重试。'}
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

function VesselDetailNotFound({ vesselId }: { vesselId: string }) {
  const navigate = useNavigateVessel()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>船舶不存在</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          未找到 ID 为「{vesselId}」的船舶记录，可能已被删除或 ID 不正确。
        </p>
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>
          <Button onClick={() => navigate.toList()}>返回船队列表</Button>
        </div>
      </div>
    </div>
  )
}

function useNavigateVessel() {
  const navigate = route.useNavigate()
  return {
    toList: () => navigate({ to: '/vessel_list' }),
  }
}
