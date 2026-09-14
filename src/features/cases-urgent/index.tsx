import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CasesUrgentDialogs } from './components/cases-urgent-dialogs'
import { CasesUrgentPrimaryButtons } from './components/cases-urgent-primary-buttons'
import { CasesUrgentProvider } from './components/cases-urgent-provider'
import { CasesUrgentTable } from './components/cases-urgent-table'

export function CasesUrgent() {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${originalTitle} - 紧急案件列表`
    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <CasesUrgentProvider>
      <Header fixed>
        <CasesUrgentPrimaryButtons />
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
        <CasesUrgentTable />
      </Main>

      <CasesUrgentDialogs />
    </CasesUrgentProvider>
  )
}
