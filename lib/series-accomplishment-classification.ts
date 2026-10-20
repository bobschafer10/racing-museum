/**
 * Annual standalone special-event archives that use the Series/SeriesSeasons
 * tables to retain their event winners. In these archives,
 * SeriesSeasons.champion_driver_id identifies the race winner, NOT the
 * season-long touring/points champion.
 *
 * Audited against the museum Series inventory on 2026-10-20:
 * 38 (Slinger Nationals), 93-115 (special-event archives),
 * 166 (JMcK 63), and 194-225 (special-event archives).
 * Extend this classification whenever an annual event is added to Series.
 */
const SPECIAL_EVENT_SERIES_IDS = new Set<number>([
  38,
  ...Array.from({ length: 23 }, (_, index) => 93 + index),
  166,
  ...Array.from({ length: 32 }, (_, index) => 194 + index),
])

export function isSpecialEventSeriesId(seriesId: number | string | null | undefined): boolean {
  return seriesId != null && SPECIAL_EVENT_SERIES_IDS.has(Number(seriesId))
}
