import { useEffect } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
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
        <CasesPrimaryButtons />
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
        <CasesTable />
      </Main>

      <CasesDialogs />
    </CasesProvider>
  )
}
