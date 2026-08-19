import { useEffect, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { resolveCaseNavFromSearch } from '@/features/cases/api/nav-helpers'

function CaseNewPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
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

  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 添加新案件`
    return () => {
      document.title = originalTitle
    }
  }, [])

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
            添加新案件
          </span>
        </div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='flex flex-1 flex-col gap-4 overflow-hidden sm:gap-6'>
        <CasesActionDialog
          mode='page'
          onCancel={goBack}
          onSuccess={goBack}
        />
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/case_new/')({
  component: CaseNewPage,
})
