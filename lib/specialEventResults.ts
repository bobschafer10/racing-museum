import { supabase } from '@/lib/supabase'

export type SpecialEventRaceConfig = {
  year: number
  raceId: number
  label?: string
  venue?: string
}

export type SpecialEventResultRow = {
  position: number
  driverId: number
  driverName: string
  driverSlug: string | null
}

export type SpecialEventRaceArchive = SpecialEventRaceConfig & {
  raceDate: string | null
  results: SpecialEventResultRow[]
}

export async function getSpecialEventResults(races: SpecialEventRaceConfig[]): Promise<SpecialEventRaceArchive[]> {
  if (!races.length) return []

  const raceIds = Array.from(new Set(races.map((race) => race.raceId)))

  const [{ data: resultRows, error: resultError }, { data: eventRows }] = await Promise.all([
    supabase
      .from('Results')
      .select('race_id,driver_id,finishing_position')
      .in('race_id', raceIds)
      .order('race_id', { ascending: true })
      .order('finishing_position', { ascending: true }),
    supabase
      .from('Events')
      .select('id,race_date')
      .in('id', raceIds),
  ])

  if (resultError) {
    console.error('[UMARM] Special-event result lookup failed', resultError)
    return races.map((race) => ({ ...race, raceDate: null, results: [] }))
  }

  const driverIds = Array.from(
    new Set((resultRows || []).map((row: any) => Number(row.driver_id)).filter((id) => Number.isFinite(id))),
  )

  const { data: driverRows } = driverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id,driver_name,slug')
        .in('driver_id', driverIds)
    : { data: [] as any[] }

  const drivers = new Map(
    (driverRows || []).map((driver: any) => [
      Number(driver.driver_id),
      { name: String(driver.driver_name || 'Unknown Driver'), slug: driver.slug ? String(driver.slug) : null },
    ]),
  )
  const dates = new Map((eventRows || []).map((event: any) => [Number(event.id), event.race_date ? String(event.race_date) : null]))
  const byRace = new Map<number, SpecialEventResultRow[]>()

  for (const row of resultRows || []) {
    const raceId = Number((row as any).race_id)
    const driverId = Number((row as any).driver_id)
    const position = Number((row as any).finishing_position)
    if (!Number.isFinite(raceId) || !Number.isFinite(driverId) || !Number.isFinite(position)) continue

    const driver = drivers.get(driverId)
    const result: SpecialEventResultRow = {
      position,
      driverId,
      driverName: driver?.name || `Driver #${driverId}`,
      driverSlug: driver?.slug || null,
    }

    const list = byRace.get(raceId)
    if (list) list.push(result)
    else byRace.set(raceId, [result])
  }

  return races.map((race) => ({
    ...race,
    raceDate: dates.get(race.raceId) || null,
    results: (byRace.get(race.raceId) || []).sort((a, b) => a.position - b.position),
  }))
}
