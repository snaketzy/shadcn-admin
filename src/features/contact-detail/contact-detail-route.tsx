import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, getRouteApi } from '@tanstack/react-router'
import { UserRound, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchContactDetail,
  fetchContactGroups,
  fetchDivisionSuppliers,
  fetchDivisionCollaborations,
  type ContactDictEntry,
  type DivisionSupplierRow,
  type DivisionCollaborationRow,
} from '@/features/contacts/api/client'
import { ContactDetailShell } from './contact-detail-shell'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setContactDetailAll,
  resetContactDetail,
  type ContactDetailGroups,
} from '@/store/slices/contact-detail-slice'
import type { Contact } from '@/features/contacts/data/schema'

const route = getRouteApi('/_authenticated/contact_detail/$contactId')

export type ContactDetailCtxValue = {
  contactId: string
  contact: ReturnType<typeof useContactDetailQuery>['contact']
  isLoading: boolean
  error: Error | null
  groups: {
    typeDict: ContactDictEntry[]
    divisionDict: ContactDictEntry[]
    rankDict: ContactDictEntry[]
    supplierFieldDict: ContactDictEntry[]
    collaborationFieldDict: ContactDictEntry[]
  }
  supplierRows: DivisionSupplierRow[]
  collaborationRows: DivisionCollaborationRow[]
}

function useContactDetailQuery(contactId: string) {
  const idNum = Number(contactId)
  const enabled = !isNaN(idNum) && idNum > 0
  const detailQuery = useQuery({
    queryKey: ['contact-detail', contactId],
    queryFn: () => fetchContactDetail(idNum),
    enabled,
    staleTime: 30 * 1000,
  })
  return {
    contact: detailQuery.data ?? null,
    isLoading: detailQuery.isFetching || detailQuery.isLoading,
    error: (detailQuery.error as Error | null) ?? null,
    isNotFound: enabled && !detailQuery.isFetching && detailQuery.data === null,
  }
}

export function ContactDetailRoute() {
  const dispatch = useAppDispatch()
  const { contactId } = route.useParams()
  const { contact, isLoading, error, isNotFound } =
    useContactDetailQuery(contactId)

  const { data: groupsData } = useQuery({
    queryKey: ['contact-list-groups'],
    queryFn: fetchContactGroups,
    staleTime: 60 * 1000,
  })
  const groups: ContactDetailGroups = {
    typeDict: groupsData?.typeDict ?? [],
    divisionDict: groupsData?.divisionDict ?? [],
    rankDict: groupsData?.rankDict ?? [],
    supplierFieldDict: groupsData?.supplierFieldDict ?? [],
    collaborationFieldDict: groupsData?.collaborationFieldDict ?? [],
  }

  const { data: supplierRows = [] } = useQuery({
    queryKey: ['division-picker-suppliers'],
    queryFn: fetchDivisionSuppliers,
    staleTime: 60 * 1000,
  })
  const { data: collaborationRows = [] } = useQuery({
    queryKey: ['division-picker-collaborations'],
    queryFn: fetchDivisionCollaborations,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    dispatch(
      setContactDetailAll({
        contactId,
        contact: contact as Contact | null,
        isLoading,
        error,
        groups,
        supplierRows,
        collaborationRows,
      })
    )
    return () => {
      dispatch(resetContactDetail())
    }
  }, [
    dispatch,
    contactId,
    contact,
    isLoading,
    error,
    groups,
    supplierRows,
    collaborationRows,
  ])

  const pageTitle = (contact as Contact | null)?.contact_name || '联系人详情'
  const divisionDisplay = useMemo(() => {
    if (!contact) return undefined
    const c = contact as Contact
    const divisionType = (c.contact_division_type ?? '').toUpperCase()
    const divisionId = c.contact_division_id
    if (!divisionType || !divisionId) return undefined
    const idStr = String(divisionId)
    if (divisionType === 'K1') {
      const s = supplierRows.find(
        (r) => String(r.supplier_id) === idStr
      ) as DivisionSupplierRow | undefined
      if (s) {
        const short = s.supplier_shortname?.trim()
        const full = s.supplier_name?.trim()
        const parts: string[] = []
        if (short) parts.push(short)
        if (full && full !== short) parts.push(full)
        return parts.length ? parts.join(' · ') : undefined
      }
      return `供应商 #${idStr}`
    }
    if (divisionType === 'K2') {
      const co = collaborationRows.find(
        (r) => String(r.collaboration_id) === idStr
      ) as DivisionCollaborationRow | undefined
      if (co) {
        const short = co.collaboration_shortname?.trim()
        const full = co.collaboration_name?.trim()
        const parts: string[] = []
        if (short) parts.push(short)
        if (full && full !== short) parts.push(full)
        return parts.length ? parts.join(' · ') : undefined
      }
      return `协作商 #${idStr}`
    }
    return undefined
  }, [contact, supplierRows, collaborationRows])

  const sidebarItems = [
    {
      title: '基本信息',
      href: `/contact_detail/${contactId}`,
      icon: <UserRound size={18} />,
    },
  ]

  return (
    <>
      <ContactDetailShell
        contactId={contactId}
        title={pageTitle}
        subTitle={divisionDisplay}
        sidebarItems={sidebarItems}
      >
        {isLoading && <ContactDetailSkeleton />}
        {!isLoading && error && <ContactDetailError error={error} />}
        {!isLoading && !error && isNotFound && (
          <ContactDetailNotFound contactId={contactId} />
        )}
        {!isLoading && !error && !isNotFound && contact && <Outlet />}
      </ContactDetailShell>
    </>
  )
}

export function useContactDetail(): ContactDetailCtxValue {
  const state = useAppSelector((s) => s.contactDetail)
  return {
    contactId: state.contactId,
    contact: state.contact,
    isLoading: state.isLoading,
    error: state.error,
    groups: state.groups,
    supplierRows: state.supplierRows,
    collaborationRows: state.collaborationRows,
  }
}

function ContactDetailSkeleton() {
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

function ContactDetailError({ error }: { error: Error }) {
  const navigate = useNavigateContact()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='flex items-center gap-2 text-lg font-medium text-destructive'>
          <AlertCircle className='size-5' />
          加载失败
        </h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          {error.message || '无法加载联系人详情，请稍后重试。'}
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

function ContactDetailNotFound({ contactId }: { contactId: string }) {
  const navigate = useNavigateContact()
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>联系人不存在</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          未找到 ID 为「{contactId}」的联系人记录，可能已被删除或 ID 不正确。
        </p>
      </div>
      <div className='my-4 h-px bg-border' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>
          <Button onClick={() => navigate.toList()}>返回联系人列表</Button>
        </div>
      </div>
    </div>
  )
}

function useNavigateContact() {
  const navigate = route.useNavigate()
  return {
    toList: () => navigate({ to: '/contact_list' }),
  }
}
