import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { Link } from '@tanstack/react-router'
import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'

function CaseNewPage() {
  const navigate = useNavigate()

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
          onCancel={() => navigate({ to: '/case_list' })}
          onSuccess={() => navigate({ to: '/case_list' })}
        />
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/case_new/')({
  component: CaseNewPage,
})
