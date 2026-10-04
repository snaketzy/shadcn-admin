import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CaseProgressMonthlyStackedChart } from './components/case-progress-stacked-chart'

const TEAMS: string[] = ['1', '2', '3', '4', '5']
const DEFAULT_YEAR = 2026

export function StatisticChart1Page() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed fluid className='flex flex-1 flex-col gap-0 overflow-hidden p-2'>
        <ScrollArea className='h-full w-full'>
          <div className='flex w-full flex-col gap-3 p-1 pr-3'>
            {TEAMS.map((team, idx) => (
              <CaseProgressMonthlyStackedChart
                key={team}
                year={DEFAULT_YEAR}
                ownerTeam={team}
                showLegendFooter={idx === TEAMS.length - 1}
              />
            ))}
          </div>
        </ScrollArea>
      </Main>
    </>
  )
}
