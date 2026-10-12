import Fuse from 'fuse.js'
import type { SecondarySortKey, Site, SortDir, SortKey, SortOption } from './types'

export const SORT_OPTIONS = [
  { val: 'stars', lbl: 'Stars', shortLbl: 'Stars' },
  { val: 'forks', lbl: 'Forks', shortLbl: 'Forks' },
  { val: 'contributors', lbl: 'Contributors', shortLbl: 'Contrib.' },
  { val: 'activityAt', lbl: 'Activity', shortLbl: 'Activity' },
  { val: 'createdAt', lbl: 'Created', shortLbl: 'Created' },
] as const satisfies readonly SortOption[]

const DATE_SORTS: ReadonlySet<SortKey> = new Set(['activityAt', 'createdAt'])

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

export function langNames(sites: readonly Site[]): string[] {
  return uniqSorted(sites.flatMap((site) => site.languages.map(({ name }) => name)))
}

export function topicNames(
  sites: readonly Site[],
  selectedLangs: readonly string[] = [],
): string[] {
  const relSites = selectedLangs.length
    ? sites.filter((site) =>
        selectedLangs.some((name) => site.languages.some((lang) => lang.name === name)),
      )
    : sites
  return uniqSorted(relSites.flatMap((site) => site.topics))
}

export function filterSites(
  sites: readonly Site[],
  search: Fuse<Site>,
  query: string,
  selectedLangs: readonly string[],
  selectedTopics: readonly string[],
): Site[] {
  let res = query.trim() ? search.search(query.trim()).map(({ item }) => item) : [...sites]

  if (selectedLangs.length) {
    res = res.filter((site) =>
      selectedLangs.some((name) => site.languages.some((lang) => lang.name === name)),
    )
  }

  if (selectedTopics.length) {
    res = res.filter((site) => selectedTopics.some((topic) => site.topics.includes(topic)))
  }

  return res
}

export function sortSites(
  sites: readonly Site[],
  primary: SortKey,
  secondary: SecondarySortKey,
  dir: SortDir,
): Site[] {
  return [...sites].sort(
    (a, b) =>
      compareMetric(a, b, primary, dir) ||
      compareMetric(a, b, secondary, dir) ||
      compareNames(a.fullName, b.fullName),
  )
}

function metricVal(site: Site, key: SecondarySortKey): number | null {
  if (key === 'none') return null
  const val = site[key]
  if (val === null || val === undefined || val === '') return null
  if (DATE_SORTS.has(key)) {
    const ts = Date.parse(String(val))
    return Number.isFinite(ts) ? ts : null
  }
  return typeof val === 'number' && Number.isFinite(val) ? val : null
}

function compareMetric(a: Site, b: Site, key: SecondarySortKey, dir: SortDir): number {
  if (key === 'none') return 0
  const left = metricVal(a, key)
  const right = metricVal(b, key)
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return dir === 'asc' ? left - right : right - left
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}

function uniqSorted(vals: readonly string[]): string[] {
  return [...new Set(vals.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}
