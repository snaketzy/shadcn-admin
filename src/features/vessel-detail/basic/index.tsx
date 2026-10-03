import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useVesselDetail } from '../vessel-detail-route'
import { getBadgeColor } from '@/features/users/data/data'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@radix-ui/react-icons'

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

function resolveDictLabel(
  raw: unknown,
  dict: { dict_key: string; dict_value: string }[]
): { label: string | null; rawKey: string } {
  if (raw === null || raw === undefined || raw === '') {
    return { label: null, rawKey: '' }
  }
  const rawStr = String(raw)
  const byKey = dict.find(
    (d) => String(d.dict_key).toUpperCase() === rawStr.toUpperCase()
  )
  if (byKey) return { label: byKey.dict_value, rawKey: rawStr }
  const byValue = dict.find((d) => d.dict_value === rawStr)
  if (byValue) return { label: byValue.dict_value, rawKey: rawStr }
  return { label: rawStr, rawKey: rawStr }
}

function calcVesselAge(buildingYearRaw: unknown): string | null {
  if (!buildingYearRaw) return null
  const built = String(buildingYearRaw).trim()
  if (!built) return null
  const yearMatch = built.match(/^(\d{4})/)
  if (!yearMatch) return null
  const y = parseInt(yearMatch[1], 10)
  if (!Number.isFinite(y) || y < 1000) return null
  const now = new Date().getFullYear()
  const age = now - y
  if (age < 0) return null
  return `${age}年`
}

export function VesselDetailBasic() {
  const {
    vessel,
    vesselId,
    inchargeDict,
    fleetManagerDict,
    flagDict,
    classDict,
  } = useVesselDetail()

  const vesselFlagInfo = useMemo(
    () => resolveDictLabel(vessel?.vessel_flag, flagDict),
    [vessel, flagDict]
  )
  const vesselClassInfo = useMemo(
    () => resolveDictLabel(vessel?.vessel_class, classDict),
    [vessel, classDict]
  )
  const inchargeInfo = useMemo(
    () => resolveDictLabel(vessel?.vessel_incharge, inchargeDict),
    [vessel, inchargeDict]
  )
  const fleetManagerInfo = useMemo(
    () => resolveDictLabel(vessel?.vessel_fleet_manager, fleetManagerDict),
    [vessel, fleetManagerDict]
  )

  if (!vessel) return null

  const age = calcVesselAge(vessel.building_year)

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-none'>
        <h3 className='text-lg font-medium'>基本信息</h3>
        <p className='text-sm text-muted-foreground'>
          该船舶的基础档案信息，包括 IMO、尺寸、船旗、船级、负责人等。
        </p>
      </div>
      <Separator className='my-4 flex-none' />
      <div className='h-full min-h-0 w-full overflow-y-auto scroll-smooth pe-2 pb-8'>
        <div className='space-y-4 pr-1'>
          <Card>
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <CardTitle className='text-base'>基础档案</CardTitle>
                  <CardDescription>
                    船名、IMO、建造年份、尺寸等核心字段
                  </CardDescription>
                </div>
                <Link
                  to='/vessel_detail/$vesselId/cooperation'
                  params={{ vesselId }}
                  className='flex items-center gap-1 text-xs text-muted-foreground hover:underline'
                >
                  查看关联案件
                  <ArrowRightIcon className='size-3' />
                </Link>
              </div>
            </CardHeader>
            <CardContent className='divide-y border-t'>
              <FieldValue label='船名'>
                <span className='font-medium'>{vessel.vessel_name || '-'}</span>
              </FieldValue>
              <FieldValue label='船舶ID'>
                <span className='font-mono text-muted-foreground'>
                  {vessel.vessel_id}
                </span>
              </FieldValue>
              <FieldValue label='IMO'>
                {vessel.vessel_imo != null ? (
                  <span className='font-mono'>{vessel.vessel_imo}</span>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
              <FieldValue label='建造年份'>
                <div className='flex items-center gap-2'>
                  <span>{vessel.building_year || '-'}</span>
                  {age && (
                    <Badge variant='outline' className='font-normal'>
                      船龄 {age}
                    </Badge>
                  )}
                </div>
              </FieldValue>
              <FieldValue label='总长 LOA'>
                <span>{vessel.vessel_loa || '-'}</span>
              </FieldValue>
              <FieldValue label='型宽 Breadth'>
                <span>{vessel.vessel_breadth || '-'}</span>
              </FieldValue>
              <FieldValue label='总吨 Gross'>
                <span>
                  {vessel.vessel_gross != null ? vessel.vessel_gross : '-'}
                </span>
              </FieldValue>
              <FieldValue label='载重吨 DWT'>
                <span>
                  {vessel.vessel_dwt != null ? vessel.vessel_dwt : '-'}
                </span>
              </FieldValue>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>运营配置</CardTitle>
              <CardDescription>
                所属船队、船旗、船级、负责人
              </CardDescription>
            </CardHeader>
            <CardContent className='divide-y border-t'>
              <FieldValue label='所属船队'>
                {vessel.vessel_team ? (
                  <Badge
                    variant='outline'
                    className={cn(getBadgeColor(vessel.vessel_team))}
                  >
                    {vessel.vessel_team}
                  </Badge>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
              <FieldValue label='船旗'>
                {vesselFlagInfo.label ? (
                  <Badge
                    variant='outline'
                    className={cn(getBadgeColor(vesselFlagInfo.label))}
                  >
                    {vesselFlagInfo.label}
                  </Badge>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
              <FieldValue label='船级'>
                {vesselClassInfo.label ? (
                  <Badge
                    variant='outline'
                    className={cn(getBadgeColor(vesselClassInfo.label))}
                  >
                    {vesselClassInfo.label}
                  </Badge>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
              <FieldValue label='主管（海务/机务）'>
                {inchargeInfo.label ? (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{inchargeInfo.label}</span>
                    {inchargeInfo.rawKey &&
                      inchargeInfo.rawKey !== inchargeInfo.label && (
                        <Badge
                          variant='outline'
                          className='font-mono text-xs text-muted-foreground'
                        >
                          Key: {inchargeInfo.rawKey}
                        </Badge>
                      )}
                  </div>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
              <FieldValue label='船队主管'>
                {fleetManagerInfo.label ? (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{fleetManagerInfo.label}</span>
                    {fleetManagerInfo.rawKey &&
                      fleetManagerInfo.rawKey !== fleetManagerInfo.label && (
                        <Badge
                          variant='outline'
                          className='font-mono text-xs text-muted-foreground'
                        >
                          Key: {fleetManagerInfo.rawKey}
                        </Badge>
                      )}
                  </div>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </FieldValue>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
