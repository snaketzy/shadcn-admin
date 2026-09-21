import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, getRouteApi } from '@tanstack/react-router'
import { UserRound, Anchor, ClipboardList, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchOwnerDetail,
  fetchOwnerGroups,
  type OwnerDictEntry,
} from '@/features/owners/api/client'
import { OwnerDetailShell } from './owner-detail-shell'

const route = getRouteApi('/_authenticated/owner_detail/$ownerId')

function useOwnerDetailQuery(ownerId: string) {
  const idNum = Number(ownerId)
  const enabled = !isNaN(idNum) && idNum > 0
  const detailQuery = useQuery({
    queryKey: ['owner-detail', ownerId],
    queryFn: () => fetchOwnerDetail(idNum),
    enabled,
    staleTime: 30 * 1000,
  })
  return {
    owner: detailQuery.data ?? null,
    isLoading: detailQuery.isFetching || detailQuery.isLoading,
    error: (detailQuery.error as Error | null) ?? null,
    isNotFound: enabled && !detailQuery.isFetching && detailQuery.data === null,
  }
}

export type OwnerDetailCtxValue = {
  ownerId: string
  owner: ReturnType<typeof useOwnerDetailQuery>['owner']
  isLoading: boolean
  error: Error | null
  teamDict: OwnerDictEntry[]
  departmentDict: OwnerDictEntry[]
  rankDict: OwnerDictEntry[]
}

export function useOwnerDetail() {
  const { ownerId } = route.useParams()
  const { owner, isLoading, error, isNotFound } = useOwnerDetailQuery(ownerId)

  const { data: groupsData } = useQuery({
    queryKey: ['owner-list-groups'],
    queryFn: fetchOwnerGroups,
    staleTime: 60 * 1000,
  })
  const teamDict = groupsData?.teamDict ?? []
  const departmentDict = groupsData?.departmentDict ?? []
  const rankDict = groupsData?.rankDict ?? []

  return {
    ownerId,
    owner,
    isLoading,
    error,
    teamDict,
    departmentDict,
    rankDict,
    isNotFound,
  }
}

export function OwnerDetailRoute() {
  const { ownerId, owner, isLoading, error, isNotFound } = useOwnerDetail()

  const pageTitle = owner?.owner_name || '船东详情'
  const pageSub = owner?.owner_email
    ? owner.owner_phone
      ? `${owner.owner_email} · ${owner.owner_phone}`
      : owner.owner_email
    : owner?.owner_phone || undefined

  const sidebarItems = [
    {
      title: '基本信息',
      href: `/owner_detail/${ownerId}`,
      icon: <UserRound size={18} />,
    },
    {
      title: '关联船舶',
      href: `/owner_detail/${ownerId}/info`,
      icon: <Anchor size={18} />,
    },
    {
      title: '合作记录',
      href: `/owner_detail/${ownerId}/cooperation`,
      icon: <ClipboardList size={18} />,
    },
  ]

  return (
    <OwnerDetailShell
      ownerId={ownerId}
      title={pageTitle}
      subTitle={pageSub}
      sidebarItems={sidebarItems}
    >
      {isLoading && <OwnerDetailSkeleton />}
      {!isLoading && error && <OwnerDetailError error={error} />}
      {!isLoading && !error && isNotFound && (
        <OwnerDetailNotFound ownerId={ownerId} />
      )}
      {!isLoading && !error && !isNotFound && owner && <Outlet />}
    </OwnerDetailShell>
  )
}

function OwnerDetailSkeleton() {
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

function OwnerDetailError({ error }: { error: Error }) {
  const navigate = useNavigateOwner()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='flex items-center gap-2 text-lg font-medium text-destructive'>
          <AlertCircle className='size-5' />
          加载失败
        </h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          {error.message || '无法加载船东详情，请稍后重试。'}
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

function OwnerDetailNotFound({ ownerId }: { ownerId: string }) {
  const navigate = useNavigateOwner()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>船东不存在</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          未找到 ID 为「{ownerId}」的船东记录，可能已被删除或 ID 不正确。
        </p>
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>
          <Button onClick={() => navigate.toList()}>返回船东列表</Button>
        </div>
      </div>
    </div>
  )
}

function useNavigateOwner() {
  const navigate = route.useNavigate()
  return {
    toList: () => navigate({ to: '/owner_list' }),
  }
}
