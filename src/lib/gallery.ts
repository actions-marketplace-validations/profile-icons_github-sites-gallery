import Fuse, { type FuseResult } from 'fuse.js'
import type {
  FilterSort,
  Lang,
  SecondarySortKey,
  Site,
  SortDir,
  SortKey,
  SortOption,
} from './types'

export const SORT_OPTIONS = [
  { val: 'stars', lbl: 'Stars', shortLbl: 'Stars' },
  { val: 'forks', lbl: 'Forks', shortLbl: 'Forks' },
  { val: 'contributors', lbl: 'Contributors', shortLbl: 'Contrib.' },
  { val: 'activityAt', lbl: 'Activity', shortLbl: 'Activity' },
  { val: 'createdAt', lbl: 'Created', shortLbl: 'Created' },
  { val: 'langUse', lbl: 'Languages', shortLbl: 'Languages' },
  { val: 'trafficT', lbl: 'Traffic', shortLbl: 'Traffic' },
] as const satisfies readonly SortOption[]

const DATE_SORTS: ReadonlySet<SortKey> = new Set(['activityAt', 'createdAt'])

export function getSortOptions(sites: readonly Site[]): readonly SortOption[] {
  const isTraffic: boolean = sites.some((site: Site): boolean => traffic(site) !== null)
  return SORT_OPTIONS.filter(
    (option: SortOption): boolean => option.val !== 'trafficT' || isTraffic,
  )
}

export function traffic({ trafficViews, trafficClones }: Site): number | null {
  if (
    typeof trafficViews !== 'number' ||
    typeof trafficClones !== 'number' ||
    trafficViews < 0 ||
    trafficClones < 0
  )
    return null
  const ttl: number = trafficViews + trafficClones
  return Number.isFinite(ttl) ? ttl : null
}

export function createSiteSearch(sites: readonly Site[]): Fuse<Site> {
  return new Fuse([...sites], {
    threshold: 0.3,
    ignoreLocation: true,
    keys: [
      { name: 'fullName', weight: 3.4 },
      { name: 'name', weight: 3 },
      { name: 'description', weight: 2 },
      { name: 'topics', weight: 1.6 },
      { name: 'languages.name', weight: 1.2 },
    ],
  })
}

export function langNames(sites: readonly Site[], sort: FilterSort = 'alphabetical'): string[] {
  return sortedOptions(
    sites.map((site: Site): string[] => site.languages.map(({ name }: Lang): string => name)),
    sort,
  )
}

export function topicNames(
  sites: readonly Site[],
  selectedLangs: readonly string[] = [],
  sort: FilterSort = 'alphabetical',
): string[] {
  const relSites: readonly Site[] = selectedLangs.length
    ? sites.filter((site: Site): boolean =>
        selectedLangs.some((name: string): boolean =>
          site.languages.some((lang: Lang): boolean => lang.name === name),
        ),
      )
    : sites
  return sortedOptions(
    relSites.map((site: Site): readonly string[] => site.topics),
    sort,
  )
}

export function filterSites(
  sites: readonly Site[],
  search: Fuse<Site>,
  query: string,
  selectedLangs: readonly string[],
  selectedTopics: readonly string[],
): Site[] {
  let res: Site[] = query.trim()
    ? search.search(query.trim()).map(({ item }: FuseResult<Site>): Site => item)
    : [...sites]

  if (selectedLangs.length) {
    res = res.filter((site: Site): boolean =>
      selectedLangs.some((name: string): boolean =>
        site.languages.some((lang: Lang): boolean => lang.name === name),
      ),
    )
  }

  if (selectedTopics.length) {
    res = res.filter((site: Site): boolean =>
      selectedTopics.some((topic: string): boolean => site.topics.includes(topic)),
    )
  }

  return res
}

export function langUseScores(sites: readonly Site[]): ReadonlyMap<string, number> {
  const langBytes: Map<string, number> = new Map<string, number>()
  let ttlBytes: number = 0

  for (const site of sites) {
    for (const { name, bytes } of site.languages) {
      if (!name || !Number.isFinite(bytes) || bytes <= 0) continue
      langBytes.set(name, (langBytes.get(name) ?? 0) + bytes)
      ttlBytes += bytes
    }
  }

  const scores: Map<string, number> = new Map<string, number>()
  if (!ttlBytes) return scores
  for (const site of sites) {
    const names: Set<string> = new Set(site.languages.map(({ name }: Lang): string => name))
    let bytes: number = 0
    for (const name of names) bytes += langBytes.get(name) ?? 0
    if (bytes > 0) scores.set(site.repoUrl, (bytes / ttlBytes) * 100)
  }

  return scores
}

export function sortSites(
  sites: readonly Site[],
  primary: SortKey,
  secondary: SecondarySortKey,
  dir: SortDir,
  langScores: ReadonlyMap<string, number> = langUseScores(sites),
): Site[] {
  return [...sites].sort(
    (a: Site, b: Site): number =>
      compareMetric(a, b, primary, dir, langScores) ||
      compareMetric(a, b, secondary, dir, langScores) ||
      compareNames(a.fullName, b.fullName),
  )
}

function metricVal(
  site: Site,
  key: SecondarySortKey,
  langScores: ReadonlyMap<string, number>,
): number | null {
  if (key === 'none') return null
  if (key === 'langUse') return langScores.get(site.repoUrl) ?? null
  if (key === 'trafficT') return traffic(site)
  const val: string | number | null = site[key]
  if (val === null || val === undefined || val === '') return null
  if (DATE_SORTS.has(key)) {
    const ts: number = Date.parse(String(val))
    return Number.isFinite(ts) ? ts : null
  }
  return typeof val === 'number' && Number.isFinite(val) ? val : null
}

function compareMetric(
  a: Site,
  b: Site,
  key: SecondarySortKey,
  dir: SortDir,
  langScores: ReadonlyMap<string, number>,
): number {
  if (key === 'none') return 0
  const left: number | null = metricVal(a, key, langScores)
  const right: number | null = metricVal(b, key, langScores)
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return dir === 'asc' ? left - right : right - left
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}

function sortedOptions(groups: readonly (readonly string[])[], sort: FilterSort): string[] {
  const counts: Map<string, number> = new Map<string, number>()
  for (const group of groups) {
    for (const name of new Set(group)) {
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }

  return [...counts.keys()].sort(
    (a: string, b: string): number =>
      (sort === 'usage' ? (counts.get(b) ?? 0) - (counts.get(a) ?? 0) : 0) ||
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}
