import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { DictionariesDialogs } from './components/dictionaries-dialogs'
import { DictionariesPrimaryButtons } from './components/dictionaries-primary-buttons'
import { DictionariesProvider } from './components/dictionaries-provider'
import { DictionariesTable } from './components/dictionaries-table'

const route = getRouteApi('/_authenticated/dictionaries/')

export function Dictionaries() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <DictionariesProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='flex flex-1 flex-col gap-4 sm:gap-6 overflow-hidden'>
        <div className='flex flex-shrink-0 flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>字典</h2>
            <p className='text-muted-foreground'>
              在此管理系统字典数据（case_dict 表），包括字典分组、键名和键值。
            </p>
          </div>
          <DictionariesPrimaryButtons />
        </div>
        <DictionariesTable search={search} navigate={navigate} />
      </Main>

      <DictionariesDialogs />
    </DictionariesProvider>
  )
}
