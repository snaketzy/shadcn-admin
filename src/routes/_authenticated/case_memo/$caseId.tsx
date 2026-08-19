import { useEffect, useState } from 'react'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  fetchCaseDetail,
  fetchCaseMemoListByCaseId,
  type CaseMemo,
} from '@/features/cases/api/client'
import { CasesMemoDialog } from '@/features/cases/components/cases-memo-dialog'

function CaseMemoPage() {
  const navigate = useNavigate()
  const { caseId } = Route.useParams()
  const { memoId } = Route.useSearch()
  const caseIdNum = Number(caseId)
  const memoIdNum = memoId ? Number(memoId) : undefined

  const [editingMemo, setEditingMemo] = useState<CaseMemo | null>(null)

  const { data: caseRow, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case-detail', caseIdNum],
    queryFn: () => fetchCaseDetail(caseIdNum),
    enabled: Number.isFinite(caseIdNum) && caseIdNum > 0,
    staleTime: 60000,
  })

  const { data: memoList = [] } = useQuery({
    queryKey: ['case-memo-list', caseIdNum],
    queryFn: () => fetchCaseMemoListByCaseId(caseIdNum),
    enabled:
      Number.isFinite(caseIdNum) &&
      caseIdNum > 0 &&
      !!memoIdNum &&
      !editingMemo,
    staleTime: 60000,
  })

  useEffect(() => {
    if (memoIdNum && memoList.length > 0 && !editingMemo) {
      const matched = memoList.find((m) => m.case_memo_id === memoIdNum)
      if (matched) {
        setEditingMemo(matched)
      }
    }
  }, [memoIdNum, memoList, editingMemo])

  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 案件备忘`
    return () => {
      document.title = originalTitle
    }
  }, [])

  const displayTitle =
    caseRow?.vessel_name || caseRow?.case_inquiry_keyword || `#${caseId}`

  return (
    <>
      <Header>
        <div className='me-auto flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={() =>
              navigate({
                to: '/case_list',
              })
            }
          >
            <ArrowLeftIcon className='size-4' />
            返回
          </Button>
          <Separator orientation='vertical' className='mx-1 h-6' />
          <Link
            to='/case_list'
            className='text-sm font-medium text-muted-foreground hover:underline'
          >
            案件列表
          </Link>
          <span className='text-xs text-muted-foreground/60'>/</span>
          <span className='max-w-48 truncate text-sm font-medium'>
            案件备忘 - {displayTitle}
          </span>
        </div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main
        fixed
        fluid
        className='flex flex-1 flex-col gap-4 overflow-hidden sm:gap-6'
      >
        {isLoadingCase || !caseRow ? (
          <div className='mx-auto w-full max-w-4xl space-y-6 p-6'>
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-4 w-72' />
            <div className='grid grid-cols-[150px_1fr] gap-4'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='col-span-2 h-10 w-full' />
              ))}
            </div>
          </div>
        ) : (
          <CasesMemoDialog
            mode='page'
            currentRow={caseRow}
            editingMemo={editingMemo}
            onEditingMemoChange={setEditingMemo}
            onCancel={() => navigate({ to: '/case_list' })}
            onSuccess={() => navigate({ to: '/case_list' })}
          />
        )}
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/case_memo/$caseId')({
  component: CaseMemoPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      memoId: search.memoId ? String(search.memoId) : undefined,
    } as { memoId?: string }
  },
})
