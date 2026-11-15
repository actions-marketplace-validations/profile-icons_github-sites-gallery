export type Theme = 'light' | 'dark'
export type SortDir = 'asc' | 'desc'
export type FilterSort = 'alphabetical' | 'usage'
export type SortKey =
  | 'stars'
  | 'forks'
  | 'contributors'
  | 'activityAt'
  | 'createdAt'
  | 'langUse'
  | 'trafficT'
export type SecondarySortKey = SortKey | 'none'

export interface Lang {
  readonly name: string
  readonly bytes: number
}

export interface Site {
  readonly name: string
  readonly fullName: string
  readonly description: string
  readonly repoUrl: string
  readonly siteUrl: string
  readonly isPrivate: boolean
  readonly isFork: boolean
  readonly isTemplate: boolean
  readonly topics: readonly string[]
  readonly languages: readonly Lang[]
  readonly stars: number
  readonly forks: number
  readonly contributors: number | null
  readonly trafficViews?: number | null
  readonly trafficClones?: number | null
  readonly createdAt: string | null
  readonly activityAt: string | null
  readonly screenshot: string
}

export interface Profile {
  readonly login: string
  readonly name: string | null
  readonly avatarUrl: string
  readonly profileUrl: string
}

export interface GalleryMetadata {
  readonly profile: Profile
  readonly srcRepoUrl: string | null
}

export interface SortOption {
  readonly val: SortKey
  readonly lbl: string
  readonly shortLbl: string
}
