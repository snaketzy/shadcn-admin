import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OwnersDialogs } from './components/owners-dialogs'
import { OwnersPrimaryButtons } from './components/owners-primary-buttons'
import { OwnersProvider } from './components/owners-provider'
import { OwnersTable } from './components/owners-table'

export function Owners() {
  return (
    <OwnersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='flex flex-1 flex-col gap-4 sm:gap-6 overflow-hidden'>
        <div className='flex flex-shrink-0 flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>船东列表</h2>
            <p className='text-muted-foreground'>
              在此管理您的船东信息。
            </p>
          </div>
          <OwnersPrimaryButtons />
        </div>
        <OwnersTable />
      </Main>

      <OwnersDialogs />
    </OwnersProvider>
  )
}
