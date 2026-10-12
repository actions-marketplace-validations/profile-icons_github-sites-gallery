<script lang="ts">
  import { onMount } from 'svelte'
  import { getGridSize } from '#lib/grid.ts'
  import {
    SORT_OPTIONS,
    createSiteSearch,
    filterSites,
    langNames,
    sortSites,
    topicNames,
  } from '#lib/gallery.ts'
  import type {
    GalleryMetadata,
    SecondarySortKey,
    Site,
    SortDir,
    SortKey,
    Theme,
  } from '#lib/types.ts'
  import Filter from './Filter.svelte'
  import SiteCard from './SiteCard.svelte'
  import Sort from './Sort.svelte'
  import Octicon from './icons/Octicon.svelte'

  export let sites: readonly Site[] = []
  export let metadata: GalleryMetadata

  let query = ''
  let selectedLangs: string[] = []
  let selectedTopics: string[] = []
  let primarySort: SortKey = 'stars'
  let secondarySort: SecondarySortKey = 'activityAt'
  let sortDir: SortDir = 'desc'
  let curPage = 1
  let cols = 1
  let rows = 1
  let gridShell: HTMLElement | null = null
  let lastFilterKey = ''
  let theme: Theme = 'dark'

  const search = createSiteSearch(sites)
  const langs = langNames(sites)

  $: availTopics = topicNames(sites, selectedLangs)
  $: filteredSites = sortSites(
    filterSites(sites, search, query, selectedLangs, selectedTopics),
    primarySort,
    secondarySort,
    sortDir,
  )
  $: pageSize = Math.max(1, cols * rows)
  $: pageCount = Math.max(1, Math.ceil(filteredSites.length / pageSize))
  $: pageStart = (curPage - 1) * pageSize
  $: pageSites = filteredSites.slice(pageStart, pageStart + pageSize)
  $: activeFilterCount = selectedLangs.length + selectedTopics.length
  $: profileName = metadata.profile.name || metadata.profile.login || 'GitHub'
  $: rangeLbl = filteredSites.length
    ? `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredSites.length)} of ${filteredSites.length}`
    : '0 sites'
  $: filterKey = [query, selectedLangs.join('|'), selectedTopics.join('|'), primarySort, secondarySort, sortDir].join('::')
  $: if (filterKey !== lastFilterKey) {
    lastFilterKey = filterKey
    curPage = 1
  }
  $: if (curPage > pageCount) curPage = pageCount

  function setLangs(val: string[]): void {
    selectedLangs = val
    const validTopics = new Set(topicNames(sites, val))
    selectedTopics = selectedTopics.filter((topic) => validTopics.has(topic))
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

    const prevPageSize = Math.max(1, cols * rows)
    const firstVisIdx = (curPage - 1) * prevPageSize
    const { cols: nxtCols, rows: nxtRows } = getGridSize(
      gridShell.clientWidth,
      gridShell.clientHeight,
      sites.length,
    )
    const nxtPageSize = Math.max(1, nxtCols * nxtRows)

    cols = nxtCols
    rows = nxtRows
    if (nxtPageSize !== prevPageSize) curPage = Math.floor(firstVisIdx / nxtPageSize) + 1
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

  onMount(() => {
    const initTheme = document.documentElement.dataset.theme
      || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    theme = initTheme === 'light' ? 'light' : 'dark'

    measureGrid()
    const resizeObs = new ResizeObserver(measureGrid)
    if (gridShell) resizeObs.observe(gridShell)
    window.addEventListener('orientationchange', measureGrid)

    return () => {
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
        aria-label={`Open ${profileName} on GitHub`}
      >
        <img class="brand-avatar" src={metadata.profile.avatarUrl} alt="" width="34" height="34" />
      </a>
      <div>
        <h1><span class="profile-name">{profileName}'s</span> Sites</h1>
        <span>{sites.length} deployed repositories</span>
      </div>
    </div>

    <div class="header-actions">
      <button
        type="button"
        class="header-icon-button"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        onclick={toggleTheme}
      >
        <Octicon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>

      {#if metadata.srcRepoUrl}
        <a
          class="header-icon-button"
          href={metadata.srcRepoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open this site's source repository on GitHub"
          title="GitHub repository"
        >
          <Octicon name="mark-github" />
        </a>
      {/if}
    </div>
  </header>

  <section class="toolbar" aria-label="Search, filter and sort">
    <label class="search-box">
      <span aria-hidden="true">⌕</span>
      <input bind:value={query} type="search" placeholder="Search sites…" aria-label="Search sites" />
      {#if query}
        <button type="button" class="input-clear" aria-label="Clear search" onclick={() => (query = '')}>×</button>
      {/if}
    </label>

    <div class="toolbar-actions">
      <Filter
        {langs}
        topics={availTopics}
        {selectedLangs}
        {selectedTopics}
        onLangsChange={setLangs}
        onTopicsChange={setTopics}
      />
      <Sort
        options={SORT_OPTIONS}
        primary={primarySort}
        secondary={secondarySort}
        onPrimaryChange={setPrimary}
        onSecondaryChange={setSecondary}
        dir={sortDir}
        onDirChange={setDir}
      />
      {#if activeFilterCount || query}
        <button type="button" class="clear-compact" onclick={clearAll} aria-label="Clear search and filters">×</button>
      {/if}
    </div>
  </section>

  <section bind:this={gridShell} class="grid-shell">
    {#if pageSites.length}
      <div class="site-grid" style={`--columns: ${cols}; --rows: ${rows};`}>
        {#each pageSites as site (site.repoUrl)}
          <SiteCard {site} />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <strong>No matching sites</strong>
        <span>Change the search or filters.</span>
        <button type="button" class="control-button" onclick={clearAll}>Clear</button>
      </div>
    {/if}
  </section>

  <footer class="pagination-bar">
    <span class="result-count">{rangeLbl}</span>
    <nav class="pager" aria-label="Pagination">
      <button type="button" disabled={curPage === 1} aria-label="Previous page" onclick={() => go(curPage - 1)}>←</button>
      <span class="page-indicator">{curPage} / {pageCount}</span>
      <button type="button" disabled={curPage === pageCount} aria-label="Next page" onclick={() => go(curPage + 1)}>→</button>
    </nav>
    <span class="capacity">{cols}×{rows}</span>
  </footer>
</main>
