import { useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CaseProgressMonthlyStackedChart } from './components/case-progress-stacked-chart'

const TEAMS: string[] = ['1', '2', '3', '4', '5']
const DEFAULT_YEAR = 2026
const YEAR_OPTIONS = [2023, 2024, 2025, 2026, 2027]

export function StatisticChart1Page() {
  const [year, setYear] = useState<number>(DEFAULT_YEAR)
  return (
    <>
      <Header fixed>
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='选择年份' />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y} 年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='ms-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed fluid className='flex flex-1 flex-col gap-0 overflow-hidden p-2'>
        <ScrollArea className='h-full w-full'>
          <div className='flex w-full flex-col gap-3 p-1 pr-3'>
            {TEAMS.map((team, idx) => (
              <CaseProgressMonthlyStackedChart
                key={`${year}-${team}`}
                year={year}
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
