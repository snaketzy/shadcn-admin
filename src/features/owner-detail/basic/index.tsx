import { ContentSection } from '@/features/settings/components/content-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOwnerDetail } from '../owner-detail-route'
import { getBadgeColor } from '@/features/owners/data/data'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@radix-ui/react-icons'
import type { OwnerDictEntry } from '@/features/owners/api/client'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: OwnerDictEntry[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

function resolveLabel(raw: unknown, { keyMap, valueMap }: DictMap): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const rawStr = String(raw)
  const byKey = keyMap.get(rawStr.toUpperCase())
  if (byKey) return byKey
  const byValue = valueMap.get(rawStr)
  if (byValue) return byValue
  return rawStr
}

type FieldValueProps = {
  label: string
  children: React.ReactNode
}

function FieldValue({ label, children }: FieldValueProps) {
  return (
    <div className='grid grid-cols-6 items-start gap-4 py-3'>
      <div className='col-span-2 pt-0.5 text-sm text-muted-foreground text-end'>
        {label}
      </div>
      <div className='col-span-4 text-sm break-words'>{children}</div>
    </div>
  )
}

export function OwnerDetailBasic() {
  const { owner, ownerId, teamDict, departmentDict, rankDict } = useOwnerDetail()

  const teamMap = makeDictMap(teamDict)
  const deptMap = makeDictMap(departmentDict)
  const rankMap = makeDictMap(rankDict)

  if (!owner) return null

  return (
    <ContentSection
      title='基本信息'
      desc='该船东的基础档案信息，包括名称、联系方式、部门职级等。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>基础档案</CardTitle>
                <CardDescription>名称、邮箱、电话等基础字段</CardDescription>
              </div>
              <Link
                to='/owner_detail/$ownerId/info'
                params={{ ownerId }}
                className='flex items-center gap-1 text-xs text-muted-foreground hover:underline'
              >
                查看关联船舶
                <ArrowRightIcon className='size-3' />
              </Link>
            </div>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='船东名称'>
              <span className='font-medium'>{owner.owner_name || '-'}</span>
            </FieldValue>
            <FieldValue label='船东ID'>
              <span className='font-mono text-muted-foreground'>
                {owner.owner_id}
              </span>
            </FieldValue>
            <FieldValue label='船东邮箱'>
              {owner.owner_email ? (
                <a
                  href={`mailto:${owner.owner_email}`}
                  className='hover:underline break-all'
                >
                  {owner.owner_email}
                </a>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='船东电话'>
              {owner.owner_phone ? (
                <a
                  href={`tel:${owner.owner_phone}`}
                  className='hover:underline font-mono text-sm'
                >
                  {owner.owner_phone}
                </a>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>部门职级</CardTitle>
            <CardDescription>小组、部门、职级等组织信息</CardDescription>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='船东小组'>
              {(() => {
                const label = resolveLabel(owner.owner_team, teamMap)
                if (!label) return <span className='text-muted-foreground'>-</span>
                return (
                  <Badge variant='outline' className={cn(getBadgeColor(label))}>
                    {label}
                  </Badge>
                )
              })()}
            </FieldValue>
            <FieldValue label='船东部门'>
              {(() => {
                const label = resolveLabel(owner.owner_department, deptMap)
                if (!label) return <span className='text-muted-foreground'>-</span>
                return (
                  <Badge variant='outline' className={cn(getBadgeColor(label))}>
                    {label}
                  </Badge>
                )
              })()}
            </FieldValue>
            <FieldValue label='船东部门邮箱'>
              {owner.owner_department_email ? (
                <a
                  href={`mailto:${owner.owner_department_email}`}
                  className='hover:underline break-all'
                >
                  {owner.owner_department_email}
                </a>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='船东职级'>
              {(() => {
                const label = resolveLabel(owner.owner_rank, rankMap)
                if (!label) return <span className='text-muted-foreground'>-</span>
                return (
                  <Badge variant='outline' className={cn(getBadgeColor(label))}>
                    {label}
                  </Badge>
                )
              })()}
            </FieldValue>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
