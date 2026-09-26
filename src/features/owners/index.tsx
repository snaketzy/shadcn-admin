import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { OwnersDialogs } from './components/owners-dialogs'
import { OwnersPrimaryButtons } from './components/owners-primary-buttons'
import { OwnersProvider } from './components/owners-provider'
import { OwnersTable } from './components/owners-table'

export function Owners() {
  return (
    <OwnersProvider>
      <Header fixed>
        <OwnersPrimaryButtons />
        <div
          id='header-filters-portal'
          className='flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden'
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
        <OwnersTable />
      </Main>

      <OwnersDialogs />
    </OwnersProvider>
  )
}
