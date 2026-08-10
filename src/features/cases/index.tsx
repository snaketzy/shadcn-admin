import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesDialogs } from './components/cases-dialogs'
import { CasesPrimaryButtons } from './components/cases-primary-buttons'
import { CasesProvider } from './components/cases-provider'
import { CasesTable } from './components/cases-table'

export function Cases() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6 overflow-hidden'>
        <div className='flex flex-shrink-0 flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>案件列表</h2>
            <p className='text-muted-foreground'>
              在此管理您的案件信息。
            </p>
          </div>
          <CasesPrimaryButtons />
        </div>
        <CasesTable />
      </Main>

      <CasesDialogs />
    </CasesProvider>
  )
}
