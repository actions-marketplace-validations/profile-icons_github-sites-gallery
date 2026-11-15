<script lang="ts">
  import { onMount } from 'svelte'
  import type Fuse from 'fuse.js'
  import { t } from '#lib/i18n/index.ts'
  import ButtonLocale from './ButtonLocale.svelte'
  import { getGridSize, type GridSize } from '#lib/grid.ts'
  import {
    createSiteSearch,
    filterSites,
    getSortOptions,
    langNames,
    langUseScores,
    sortSites,
    topicNames,
  } from '#lib/gallery.ts'
  import type {
    FilterSort,
    GalleryMetadata,
    SecondarySortKey,
    Site,
    SortDir,
    SortKey,
    SortOption,
    Theme,
  } from '#lib/types.ts'
  import Filter from './Filter.svelte'
  import SiteCard from './SiteCard.svelte'
  import Sort from './Sort.svelte'
  import Octicon from './icons/Octicon.svelte'

  export let sites: readonly Site[] = []
  export let metadata: GalleryMetadata

  let query: string = ''
  let selectedLangs: string[] = []
  let selectedTopics: string[] = []
  let filterSort: FilterSort = 'alphabetical'
  let primarySort: SortKey = 'stars'
  let secondarySort: SecondarySortKey = 'langUse'
  let sortDir: SortDir = 'desc'
  let curPage: number = 1
  let cols: number = 1
  let rows: number = 1
  let gridShell: HTMLElement | null = null
  let isGridReady: boolean = false
  let lastFilterKey: string = ''
  let theme: Theme = 'dark'

  const search: Fuse<Site> = createSiteSearch(sites)
  const languageScores: ReadonlyMap<string, number> = langUseScores(sites)

  let langs: string[]
  let availTopics: string[]
  let sortOptions: readonly SortOption[]
  let filteredSites: Site[]
  let pageSize: number
  let pageCount: number
  let pageStart: number
  let pageSites: Site[]
  let activeFilterCount: number
  let profileName: string
  let rangeLbl: string
  let filterKey: string

  $: langs = langNames(sites, filterSort)
  $: availTopics = topicNames(sites, selectedLangs, filterSort)
  $: sortOptions = getSortOptions(sites)
  $: filteredSites = sortSites(
          filterSites(sites, search, query, selectedLangs, selectedTopics),
          primarySort,
          secondarySort,
          sortDir,
          languageScores,
  )
  $: pageSize = Math.max(1, cols * rows)
  $: pageCount = Math.max(1, Math.ceil(filteredSites.length / pageSize))
  $: pageStart = (curPage - 1) * pageSize
  $: pageSites = filteredSites.slice(pageStart, pageStart + pageSize)
  $: activeFilterCount = selectedLangs.length + selectedTopics.length
  $: profileName = metadata.profile.name || metadata.profile.login || 'GitHub'
  $: rangeLbl = filteredSites.length
          ? $t('range', { start: pageStart + 1, end: Math.min(pageStart + pageSize, filteredSites.length), total: filteredSites.length })
          : $t('zeroSites')
  $: filterKey = [query, selectedLangs.join('|'), selectedTopics.join('|'), primarySort, secondarySort, sortDir].join('::')
  $: if (filterKey !== lastFilterKey) {
    lastFilterKey = filterKey
    curPage = 1
  }
  $: if (curPage > pageCount) curPage = pageCount

  function setLangs(val: string[]): void {
    selectedLangs = val
    const validTopics: Set<string> = new Set(topicNames(sites, val))
    selectedTopics = selectedTopics.filter((topic: string): boolean => validTopics.has(topic))
  }


  function setTopics(val: string[]): void {
    selectedTopics = val
  }

  function setSecondary(val: SecondarySortKey): void {
    secondarySort = val
  }

  function setDir(val: SortDir): void {
    sortDir = val
  }

  function measureGrid(): void {
    if (!gridShell) return

    const prevPageSize: number = Math.max(1, cols * rows)
    const firstVisIdx: number = (curPage - 1) * prevPageSize
    const { cols: nxtCols, rows: nxtRows }: GridSize = getGridSize(
            gridShell.clientWidth,
            gridShell.clientHeight,
            sites.length,
    )
    const nxtPageSize: number = Math.max(1, nxtCols * nxtRows)

    cols = nxtCols
    rows = nxtRows
    if (nxtPageSize !== prevPageSize) curPage = Math.floor(firstVisIdx / nxtPageSize) + 1
    isGridReady = true
  }

  function clearAll(): void {
    query = ''
    selectedLangs = []
    selectedTopics = []
  }

  function go(page: number): void {
    curPage = Math.max(1, Math.min(page, pageCount))
  }

  function setPrimary(val: SortKey): void {
    primarySort = val
    if (secondarySort === val) secondarySort = 'none'
  }

  function applyTheme(nextTheme: Theme): void {
    theme = nextTheme
    document.documentElement.dataset.theme = theme
    localStorage.setItem('gallery-theme', theme)
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
            ?.setAttribute('content', theme === 'light' ? '#f6f8fa' : '#0c0e12')
  }

  function toggleTheme(): void {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }

  onMount((): (() => void) => {
    const initTheme: string = document.documentElement.dataset.theme
            || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    theme = initTheme === 'light' ? 'light' : 'dark'

    measureGrid()
    const resizeObs: ResizeObserver = new ResizeObserver(measureGrid)
    if (gridShell) resizeObs.observe(gridShell)
    window.addEventListener('orientationchange', measureGrid)

    return (): void => {
      resizeObs.disconnect()
      window.removeEventListener('orientationchange', measureGrid)
    }
  })
</script>

<main class="app-shell">
  <header class="topbar">
    <div class="brand">
      <a
              class="brand-avatar-link"
              href={metadata.profile.profileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={$t('openGithub', { name: profileName })}
      >
        <img class="brand-avatar" src={metadata.profile.avatarUrl} alt="" width="34" height="34" />
      </a>
      <div>
        <h1>{$t('pageTitle', { name: profileName })}</h1>
        <span>{$t('deployed', { count: sites.length })}</span>
      </div>
    </div>

    <div class="header-actions">
      <button
              type="button"
              class="header-icon-button"
              aria-label={$t(theme === 'dark' ? 'switchLight' : 'switchDark')}
              title={$t(theme === 'dark' ? 'lightMode' : 'darkMode')}
              onclick={toggleTheme}
      >
        <Octicon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      <ButtonLocale />

      {#if metadata.srcRepoUrl}
        <a
                class="header-icon-button"
                href={metadata.srcRepoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={$t('openSource')}
                title={$t('githubRepository')}
        >
          <Octicon name="mark-github" />
        </a>
      {/if}
    </div>
  </header>

  <section class="toolbar" aria-label={$t('toolbar')}>
    <label class="search-box">
      <span aria-hidden="true">⌕</span>
      <input bind:value={query} type="search" placeholder={$t('searchSitesPlaceholder')} aria-label={$t('searchSites')} />
      {#if query}
        <button type="button" class="input-clear" aria-label={$t('clearSearch')} onclick={(): string => (query = '')}>×</button>
      {/if}
    </label>

    <div class="toolbar-actions">
      <Filter
              {langs}
              topics={availTopics}
              {selectedLangs}
              {selectedTopics}
              sort={filterSort}
              onSortChange={(val: FilterSort): FilterSort => (filterSort = val)}
              onLangsChange={setLangs}
              onTopicsChange={setTopics}
      />
      <Sort
              options={sortOptions}
              primary={primarySort}
              secondary={secondarySort}
              onPrimaryChange={setPrimary}
              onSecondaryChange={setSecondary}
              dir={sortDir}
              onDirChange={setDir}
      />
      {#if activeFilterCount || query}
        <button type="button" class="clear-compact" onclick={clearAll} aria-label={$t('clearAll')}>×</button>
      {/if}
    </div>
  </section>

  <section bind:this={gridShell} class="grid-shell" style:visibility={isGridReady ? 'visible' : 'hidden'}>
    {#if pageSites.length}
      <div class="site-grid" style={`--columns: ${cols}; --rows: ${rows};`}>
        {#each pageSites as site (site.repoUrl)}
          <SiteCard {site} />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <strong>{$t('noSites')}</strong>
        <span>{$t('adjustFilters')}</span>
        <button type="button" class="control-button" onclick={clearAll}>{$t('clear')}</button>
      </div>
    {/if}
  </section>

  <footer class="pagination-bar" style:visibility={isGridReady ? 'visible' : 'hidden'}>
    <span class="result-count">{rangeLbl}</span>
    <nav class="pager" aria-label={$t('pagination')}>
      <button type="button" disabled={curPage === 1} aria-label={$t('previousPage')} onclick={(): void => go(curPage - 1)}>←</button>
      <span class="page-indicator">{curPage} / {pageCount}</span>
      <button type="button" disabled={curPage === pageCount} aria-label={$t('nextPage')} onclick={(): void => go(curPage + 1)}>→</button>
    </nav>
    <span class="capacity">{cols}×{rows}</span>
  </footer>
</main>
