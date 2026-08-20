import { useMemo } from 'react'
import { FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRouteApi } from '@tanstack/react-router'
import { buildCaseNavSearch } from '../../cases/api/nav-helpers'

const route = getRouteApi('/_authenticated/case_drydocking_list/')

export function CasesDrydockingPrimaryButtons() {
  const navigate = route.useNavigate()
  const search = route.useSearch()
  const navSearch = useMemo(
    () =>
      buildCaseNavSearch({
        fromPath: '/case_drydocking_list',
        listSearch: search as Record<string, unknown>,
      }),
    [search]
  )
  return (
    <div className='flex gap-2'>
      <Button
        className='space-x-1'
        onClick={() =>
          navigate({
            to: '/case_new',
            search: navSearch,
          })
        }
      >
        <span>添加案件</span> <FileTextIcon size={18} />
      </Button>
    </div>
  )
}
