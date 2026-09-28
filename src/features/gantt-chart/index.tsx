import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CaseGanttChart } from './components/case-gantt-chart'

export function GanttChartPage() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed fluid className='flex flex-1 flex-col gap-0 overflow-hidden p-2'>
        <CaseGanttChart mode='today' />
      </Main>
    </>
  )
}
