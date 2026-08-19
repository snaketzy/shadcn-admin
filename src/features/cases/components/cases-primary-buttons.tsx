import { useMemo } from 'react'
import { FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRouteApi } from '@tanstack/react-router'
import { buildCaseNavSearch } from '../api/nav-helpers'

const route = getRouteApi('/_authenticated/case_list/')

export function CasesPrimaryButtons() {
  const navigate = route.useNavigate()
  const search = route.useSearch()
  const navSearch = useMemo(
    () =>
      buildCaseNavSearch({
        fromPath: '/case_list',
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
