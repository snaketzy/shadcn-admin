import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesDealDialogs } from './components/cases-deal-dialogs'
import { CasesDealPrimaryButtons } from './components/cases-deal-primary-buttons'
import { CasesDealProvider } from './components/cases-deal-provider'
import { CasesDealTable } from './components/cases-deal-table'

export function CasesDeal() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 成交案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesDealProvider>
      <Header fixed>
        <CasesDealPrimaryButtons />
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
        <CasesDealTable />
      </Main>

      <CasesDealDialogs />
    </CasesDealProvider>
  )
}
