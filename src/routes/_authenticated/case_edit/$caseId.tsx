import { useEffect, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { fetchCaseDetail } from '@/features/cases/api/client'
import { resolveCaseNavFromSearch } from '@/features/cases/api/nav-helpers'

function CaseEditPage() {
  const navigate = useNavigate()
  const { caseId } = Route.useParams()
  const search = Route.useSearch()
  const caseIdNum = Number(caseId)

  const nav = useMemo(
    () =>
      resolveCaseNavFromSearch(
        search as Record<string, unknown>,
        '/case_list'
      ),
    [search]
  )
  const goBack = () =>
    navigate({
      to: nav.fromPath,
      search: nav.listSearch,
    })

  const { data: caseRow, isLoading } = useQuery({
    queryKey: ['case-detail', caseIdNum],
    queryFn: () => fetchCaseDetail(caseIdNum),
    enabled: Number.isFinite(caseIdNum) && caseIdNum > 0,
    staleTime: 60000,
  })

  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 编辑案件`

    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.title = originalTitle
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.overflow = originalBodyOverflow
    }
  }, [])

  const displayTitle =
    caseRow?.vessel_name || caseRow?.case_inquiry_keyword || `#${caseId}`

  return (
    <>
      <Header>
        <div className='flex items-center gap-2 me-auto'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={goBack}
          >
            <ArrowLeftIcon className='size-4' />
            返回
          </Button>
          <Separator orientation='vertical' className='mx-1 h-6' />
          <Link
            to={nav.fromPath}
            search={nav.listSearch}
            className='text-sm font-medium text-muted-foreground hover:underline'
          >
            {nav.fromLabel}
          </Link>
          <span className='text-muted-foreground/60 text-xs'>/</span>
          <span className='text-sm font-medium truncate max-w-48'>
            编辑案件 - {displayTitle}
          </span>
        </div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='flex flex-1 flex-col overflow-hidden pb-4 pt-0 sm:pb-6 sm:pt-0'>
        {isLoading || !caseRow ? (
          <div className='mx-auto flex h-full min-h-0 w-full max-w-5xl items-start justify-center overflow-auto p-6'>
            <div className='w-full space-y-6'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-4 w-72' />
              <div className='grid grid-cols-2 gap-4'>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <CasesActionDialog
            mode='page'
            currentRow={caseRow}
            onCancel={goBack}
            onSuccess={goBack}
          />
        )}
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/case_edit/$caseId')({
  component: CaseEditPage,
})
