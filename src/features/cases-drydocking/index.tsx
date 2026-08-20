import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesDrydockingDialogs } from './components/cases-drydocking-dialogs'
import { CasesDrydockingPrimaryButtons } from './components/cases-drydocking-primary-buttons'
import { CasesDrydockingProvider } from './components/cases-drydocking-provider'
import { CasesDrydockingTable } from './components/cases-drydocking-table'

export function CasesDrydocking() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 坞修案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesDrydockingProvider>
      <Header fixed>
        <CasesDrydockingPrimaryButtons />
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
        <CasesDrydockingTable />
      </Main>

      <CasesDrydockingDialogs />
    </CasesDrydockingProvider>
  )
}
