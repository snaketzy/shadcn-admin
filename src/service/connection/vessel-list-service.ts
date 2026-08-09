import { query, execute, type ExecuteValues } from './db'
import { getCaseDictByKeyPrefix } from './case-dict-service'
import { auditInsert, auditUpdate, auditDelete, auditBulkDelete } from './log-list-service'

export interface VesselListRow {
  vessel_id: number
  vessel_name: string
  building_year: string | null
  vessel_imo: number | null
  vessel_loa: string | null
  vessel_breadth: string | null
  vessel_gross: number | null
  vessel_dwt: number | null
  vessel_class: string | null
  vessel_flag: string | null
  vessel_team: string | null
  vessel_incharge: string | null
  vessel_fleet_manager: string | null
}

export interface VesselDictEntry {
  dict_key: string
  dict_value: string
}

const SELECT_COLS = `
  vessel_id, vessel_name, building_year, vessel_imo,
  vessel_loa, vessel_breadth, vessel_gross, vessel_dwt,
  vessel_class, vessel_flag, vessel_team, vessel_incharge,
  vessel_fleet_manager
`

export async function getAllVesselList(): Promise<VesselListRow[]> {
  const rows = await query<VesselListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`vessel_list\` ORDER BY vessel_name`
  )
  return rows.map(normalizeRow)
}

export async function getVesselListById(vesselId: number): Promise<VesselListRow | null> {
  const rows = await query<VesselListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`vessel_list\` WHERE vessel_id = ? LIMIT 1`,
    [vesselId]
  )
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function getVesselListGroups(): Promise<{
  teams: string[]
  flags: string[]
  classes: string[]
  inchargeDict: VesselDictEntry[]
  fleetManagerDict: VesselDictEntry[]
}> {
  const [teams, flags, classes, inchargeRows, fleetRows] = await Promise.all([
    query<{ vessel_team: string | null }[]>(
      'SELECT DISTINCT vessel_team FROM `vessel_list` WHERE vessel_team IS NOT NULL AND vessel_team <> \'\' ORDER BY vessel_team'
    ),
    query<{ vessel_flag: string | null }[]>(
      'SELECT DISTINCT vessel_flag FROM `vessel_list` WHERE vessel_flag IS NOT NULL AND vessel_flag <> \'\' ORDER BY vessel_flag'
    ),
    query<{ vessel_class: string | null }[]>(
      'SELECT DISTINCT vessel_class FROM `vessel_list` WHERE vessel_class IS NOT NULL AND vessel_class <> \'\' ORDER BY vessel_class'
    ),
    getCaseDictByKeyPrefix('E'),
    getCaseDictByKeyPrefix('N'),
  ])
  return {
    teams: teams.map((r) => r.vessel_team!).filter(Boolean),
    flags: flags.map((r) => r.vessel_flag!).filter(Boolean),
    classes: classes.map((r) => r.vessel_class!).filter(Boolean),
    inchargeDict: inchargeRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
    fleetManagerDict: fleetRows.map((r) => ({
      dict_key: String(r.dict_key),
      dict_value: r.dict_value,
    })),
  }
}

export async function getVesselListPaginated(params: {
  page?: number
  pageSize?: number
  vesselName?: string
  vesselTeam?: string
  vesselFlag?: string
  vesselClass?: string
  vesselIncharge?: string
  vesselFleetManager?: string
}): Promise<{ rows: VesselListRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const whereParams: ExecuteValues[] = []

  if (params.vesselName && params.vesselName.trim() !== '') {
    whereClauses.push('vessel_name LIKE ?')
    whereParams.push(`%${params.vesselName}%`)
  }
  if (params.vesselTeam && params.vesselTeam.trim() !== '') {
    whereClauses.push('vessel_team = ?')
    whereParams.push(params.vesselTeam)
  }
  if (params.vesselFlag && params.vesselFlag.trim() !== '') {
    whereClauses.push('vessel_flag = ?')
    whereParams.push(params.vesselFlag)
  }
  if (params.vesselClass && params.vesselClass.trim() !== '') {
    whereClauses.push('vessel_class = ?')
    whereParams.push(params.vesselClass)
  }
  if (params.vesselIncharge && params.vesselIncharge.trim() !== '') {
    whereClauses.push('vessel_incharge LIKE ?')
    whereParams.push(`%${params.vesselIncharge}%`)
  }
  if (params.vesselFleetManager && params.vesselFleetManager.trim() !== '') {
    whereClauses.push('vessel_fleet_manager LIKE ?')
    whereParams.push(`%${params.vesselFleetManager}%`)
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM \`vessel_list\` ${whereSql}`
  const dataSql = `SELECT ${SELECT_COLS} FROM \`vessel_list\` ${whereSql} ORDER BY vessel_name LIMIT ? OFFSET ?`

  const [countRows, dataRows] = await Promise.all([
    query<[{ total: number }]>(countSql, whereParams),
    query<VesselListRow[]>(
      dataSql,
      [...whereParams, pageSize, offset] as ExecuteValues
    ),
  ])

  return {
    rows: dataRows.map(normalizeRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}

export async function createVesselList(data: {
  vessel_name: string
  building_year?: string | null
  vessel_imo?: number | null
  vessel_loa?: string | null
  vessel_breadth?: string | null
  vessel_gross?: number | null
  vessel_dwt?: number | null
  vessel_class?: string | null
  vessel_flag?: string | null
  vessel_team?: string | null
  vessel_incharge?: string | null
  vessel_fleet_manager?: string | null
}): Promise<VesselListRow> {
  const result = await execute(
    `INSERT INTO \`vessel_list\`
      (vessel_name, building_year, vessel_imo, vessel_loa, vessel_breadth,
       vessel_gross, vessel_dwt, vessel_class, vessel_flag, vessel_team, vessel_incharge, vessel_fleet_manager)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.vessel_name,
      data.building_year ?? null,
      data.vessel_imo ?? null,
      data.vessel_loa ?? null,
      data.vessel_breadth ?? null,
      data.vessel_gross ?? null,
      data.vessel_dwt ?? null,
      data.vessel_class ?? null,
      data.vessel_flag ?? null,
      data.vessel_team ?? null,
      data.vessel_incharge ?? null,
      data.vessel_fleet_manager ?? null,
    ]
  )
  const newId = Number(result.insertId)
  if (!newId) throw new Error('Failed to create vessel_list row')
  const created = await getVesselListById(newId)
  if (!created) throw new Error('Failed to create vessel_list row')
  await auditInsert('vessel_list', created, { excludeFields: ['vessel_id'], primaryKeyField: 'vessel_id' })
  return created
}

export async function updateVesselList(
  vesselId: number,
  data: {
    vessel_name?: string
    building_year?: string | null
    vessel_imo?: number | null
    vessel_loa?: string | null
    vessel_breadth?: string | null
    vessel_gross?: number | null
    vessel_dwt?: number | null
    vessel_class?: string | null
    vessel_flag?: string | null
    vessel_team?: string | null
    vessel_incharge?: string | null
    vessel_fleet_manager?: string | null
  }
): Promise<VesselListRow> {
  const oldRow = await getVesselListById(vesselId)
  if (!oldRow) throw new Error('Vessel not found')
  const sets: string[] = []
  const params: (string | number | null)[] = []
  const mapping: Array<[keyof typeof data, 'str' | 'num' | 'date']> = [
    ['vessel_name', 'str'],
    ['building_year', 'date'],
    ['vessel_imo', 'num'],
    ['vessel_loa', 'str'],
    ['vessel_breadth', 'str'],
    ['vessel_gross', 'num'],
    ['vessel_dwt', 'num'],
    ['vessel_class', 'str'],
    ['vessel_flag', 'str'],
    ['vessel_team', 'str'],
    ['vessel_incharge', 'str'],
    ['vessel_fleet_manager', 'str'],
  ]
  for (const [key] of mapping) {
    if (key in data) {
      sets.push(`\`${key}\` = ?`)
      const v = (data as any)[key]
      if (typeof v === 'string' && v.trim() === '') params.push(null)
      else if (v === undefined) params.push(null)
      else params.push(v)
    }
  }
  if (sets.length === 0) {
    return oldRow
  }
  params.push(vesselId)
  await execute(
    `UPDATE \`vessel_list\` SET ${sets.join(', ')} WHERE vessel_id = ?`,
    params as ExecuteValues
  )
  const newRow = await getVesselListById(vesselId)
  if (!newRow) throw new Error('Failed to update vessel_list row')
  await auditUpdate('vessel_list', oldRow, newRow, data, { excludeFields: ['vessel_id'], primaryKeyField: 'vessel_id' })
  return newRow
}

export async function deleteVesselList(vesselId: number): Promise<boolean> {
  const oldRow = await getVesselListById(vesselId)
  if (!oldRow) return false
  const result = await execute(
    'DELETE FROM `vessel_list` WHERE vessel_id = ?',
    [vesselId]
  )
  if (result.affectedRows > 0) {
    await auditDelete('vessel_list', oldRow, { excludeFields: ['vessel_id'], primaryKeyField: 'vessel_id' })
  }
  return result.affectedRows > 0
}

export async function deleteVesselListBulk(vesselIds: number[]): Promise<number> {
  if (vesselIds.length === 0) return 0
  const placeholders = vesselIds.map(() => '?').join(', ')
  const oldRows = await query<VesselListRow[]>(
    `SELECT ${SELECT_COLS} FROM \`vessel_list\` WHERE vessel_id IN (${placeholders})`,
    vesselIds
  )
  const deleteResult = await execute(
    `DELETE FROM \`vessel_list\` WHERE vessel_id IN (${placeholders})`,
    vesselIds
  )
  if (deleteResult.affectedRows > 0 && oldRows.length > 0) {
    await auditBulkDelete('vessel_list', oldRows.map(normalizeRow), { excludeFields: ['vessel_id'], primaryKeyField: 'vessel_id' })
  }
  return Number(deleteResult.affectedRows)
}

function normalizeRow(row: any): VesselListRow {
  return {
    vessel_id: Number(row.vessel_id),
    vessel_name: String(row.vessel_name ?? ''),
    building_year: row.building_year ? formatDate(row.building_year) : null,
    vessel_imo:
      row.vessel_imo === null || row.vessel_imo === undefined
        ? null
        : Number(row.vessel_imo),
    vessel_loa: row.vessel_loa ? String(row.vessel_loa) : null,
    vessel_breadth: row.vessel_breadth ? String(row.vessel_breadth) : null,
    vessel_gross:
      row.vessel_gross === null || row.vessel_gross === undefined
        ? null
        : Number(row.vessel_gross),
    vessel_dwt:
      row.vessel_dwt === null || row.vessel_dwt === undefined
        ? null
        : Number(row.vessel_dwt),
    vessel_class: row.vessel_class ? String(row.vessel_class) : null,
    vessel_flag: row.vessel_flag ? String(row.vessel_flag) : null,
    vessel_team: row.vessel_team ? String(row.vessel_team) : null,
    vessel_incharge: row.vessel_incharge ? String(row.vessel_incharge) : null,
    vessel_fleet_manager: row.vessel_fleet_manager ? String(row.vessel_fleet_manager) : null,
  }
}

function formatDate(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v ?? '').split('T')[0]
  return s
}
