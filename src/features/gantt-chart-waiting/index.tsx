import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CaseGanttChart } from '@/features/gantt-chart/components/case-gantt-chart'

export function GanttChartWaitingPage() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed fluid className='flex flex-1 flex-col gap-0 overflow-hidden p-2'>
        <CaseGanttChart mode='waiting_confirm' />
      </Main>
    </>
  )
}
