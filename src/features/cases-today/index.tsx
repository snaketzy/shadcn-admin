import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesTodayDialogs } from './components/cases-today-dialogs'
import { CasesTodayPrimaryButtons } from './components/cases-today-primary-buttons'
import { CasesTodayProvider } from './components/cases-today-provider'
import { CasesTodayTable } from './components/cases-today-table'

export function CasesToday() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 当天处理案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesTodayProvider>
      <Header fixed>
        <CasesTodayPrimaryButtons />
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
        <CasesTodayTable />
      </Main>

      <CasesTodayDialogs />
    </CasesTodayProvider>
  )
}
