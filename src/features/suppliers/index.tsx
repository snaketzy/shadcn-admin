import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SuppliersDialogs } from './components/suppliers-dialogs'
import { SuppliersPrimaryButtons } from './components/suppliers-primary-buttons'
import { SuppliersProvider } from './components/suppliers-provider'
import { SuppliersTable } from './components/suppliers-table'

export function Suppliers() {
  return (
    <SuppliersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='flex flex-1 flex-col gap-4 sm:gap-6 overflow-hidden'>
        <div className='flex flex-shrink-0 flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>供应商列表</h2>
            <p className='text-muted-foreground'>
              在此管理您的供应商信息。
            </p>
          </div>
          <SuppliersPrimaryButtons />
        </div>
        <SuppliersTable />
      </Main>

      <SuppliersDialogs />
    </SuppliersProvider>
  )
}
