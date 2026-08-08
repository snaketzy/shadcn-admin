import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CollaborationsDialogs } from './components/collaborations-dialogs'
import { CollaborationsPrimaryButtons } from './components/collaborations-primary-buttons'
import { CollaborationsProvider } from './components/collaborations-provider'
import { CollaborationsTable } from './components/collaborations-table'

export function Collaborations() {
  return (
    <CollaborationsProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6 overflow-hidden'>
        <div className='flex flex-shrink-0 flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>协作商列表</h2>
            <p className='text-muted-foreground'>
              在此管理您的协作商信息。
            </p>
          </div>
          <CollaborationsPrimaryButtons />
        </div>
        <CollaborationsTable />
      </Main>

      <CollaborationsDialogs />
    </CollaborationsProvider>
  )
}
