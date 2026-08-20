export type HistoricalStanding = {
  position: number
  driver: string
  points: number
}

export type SupplementalStandings = {
  source: 'Midwest Racing News'
  coverage: string
  rows: HistoricalStanding[]
}

// Supplemental Slinger Nationals standings transcribed from Midwest Racing News
// scans supplied to the museum. Only clearly confirmed published rows are stored;
// missing positions are intentionally not reconstructed.
export const slingerNationalsMrnStandings: Record<number, SupplementalStandings> = {
  1981: {
    source: 'Midwest Racing News',
    coverage: 'Published final standings — partial transcription currently entered',
    rows: [
      { position: 1, driver: 'Alan Kulwicki', points: 2315 },
      { position: 2, driver: 'Dick Trickle', points: 2140 },
      { position: 3, driver: 'Mark Martin', points: 2040 },
    ],
  },
  1982: {
    source: 'Midwest Racing News',
    coverage: 'Published final standings — partial transcription currently entered',
    rows: [
      { position: 1, driver: 'Dick Trickle', points: 3510 },
      { position: 2, driver: 'Alan Kulwicki', points: 2645 },
      { position: 3, driver: 'John Ziegler', points: 2205 },
    ],
  },
  1983: {
    source: 'Midwest Racing News',
    coverage: 'Published final standings — partial transcription currently entered',
    rows: [
      { position: 1, driver: 'Dick Trickle', points: 4925 },
      { position: 2, driver: 'Alan Kulwicki', points: 2825 },
      { position: 3, driver: 'Bobby Allison', points: 2240 },
    ],
  },
  1987: {
    source: 'Midwest Racing News',
    coverage: 'Published Slinger Nationals final standings — Top 20',
    rows: [
      { position: 1, driver: 'Joe Shear', points: 3905 },
      { position: 2, driver: 'Butch Miller', points: 3610 },
      { position: 3, driver: 'Bobby Dotter', points: 3235 },
      { position: 4, driver: 'Conrad Morgan', points: 2305 },
      { position: 5, driver: 'Dick Trickle', points: 2150 },
      { position: 6, driver: 'Mark Martin', points: 1840 },
      { position: 7, driver: 'Al Schill', points: 1700 },
      { position: 8, driver: 'John Ziegler', points: 1655 },
      { position: 9, driver: 'Tony Strupp', points: 1385 },
      { position: 10, driver: 'Ted Musgrave', points: 1310 },
      { position: 11, driver: 'Scott Hansen', points: 1305 },
      { position: 12, driver: 'Rich Somers', points: 1285 },
      { position: 13, driver: 'Rich Bickle Jr.', points: 1275 },
      { position: 14, driver: 'Alan Kulwicki', points: 1195 },
      { position: 15, driver: 'Joel Laufer', points: 1120 },
      { position: 16, driver: 'Bobby Allison', points: 985 },
      { position: 17, driver: 'Dale Earnhardt', points: 880 },
      { position: 18, driver: 'Jim Weber', points: 875 },
      { position: 19, driver: 'Robbie Reiser', points: 760 },
      { position: 20, driver: 'Lowell Bennett', points: 720 },
    ],
  },
  1999: {
    source: 'Midwest Racing News',
    coverage: 'Published final standings — partial transcription currently entered',
    rows: [
      { position: 1, driver: 'Conrad Morgan', points: 204 },
      { position: 2, driver: 'Lowell Bennett', points: 170 },
      { position: 3, driver: 'Tony Strupp', points: 165 },
    ],
  },
}

export function getSlingerNationalsMrnStandings(year: number) {
  return slingerNationalsMrnStandings[year] ?? null
}
