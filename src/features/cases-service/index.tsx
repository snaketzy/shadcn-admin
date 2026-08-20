import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesServiceDialogs } from './components/cases-service-dialogs'
import { CasesServicePrimaryButtons } from './components/cases-service-primary-buttons'
import { CasesServiceProvider } from './components/cases-service-provider'
import { CasesServiceTable } from './components/cases-service-table'

export function CasesService() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 服务项目案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesServiceProvider>
      <Header fixed>
        <CasesServicePrimaryButtons />
        <div
          id='header-filters-portal'
          className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        />
        <div className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main
        fixed
        fluid
        className='flex flex-1 flex-col gap-4 overflow-hidden sm:gap-6'
      >
        <CasesServiceTable />
      </Main>

      <CasesServiceDialogs />
    </CasesServiceProvider>
  )
}
