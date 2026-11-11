<script lang="ts">
  import { t } from '#lib/i18n/index.ts'
  import { closeOnMouseLeave } from '#lib/popover.ts'
  import type { FilterSort } from '#lib/types.ts'

  export let langs: readonly string[] = []
  export let topics: readonly string[] = []
  export let selectedLangs: readonly string[] = []
  export let selectedTopics: readonly string[] = []
  export let sort: FilterSort = 'alphabetical'
  export let onSortChange: (val: FilterSort) => void = (): void => undefined
  export let onLangsChange: (val: string[]) => void = (): void => undefined
  export let onTopicsChange: (val: string[]) => void = (): void => undefined

  let langQuery: string = ''
  let topicQuery: string = ''
  let selectedCount: number
  let filteredLangs: string[]
  let filteredTopics: string[]

  $: selectedCount = selectedLangs.length + selectedTopics.length
  $: filteredLangs = searchOptions(langs, langQuery)
  $: filteredTopics = searchOptions(topics, topicQuery)

  function toggle(list: readonly string[], val: string, callback: (val: string[]) => void): void {
    const nxt: Set<string> = new Set(list)
    if (nxt.has(val)) nxt.delete(val)
    else nxt.add(val)
    callback([...nxt])
  }

  function clear(): void {
    onLangsChange([])
    onTopicsChange([])
  }

  function searchOptions(options: readonly string[], query: string): string[] {
    const normalizedQuery: string = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return [...options]
    return options.filter((option: string): boolean => option.toLocaleLowerCase().includes(normalizedQuery))
  }
</script>

<details name="gallery-tools" class="popover filter-popover" use:closeOnMouseLeave>
  <summary class="control-button" aria-label={$t('filterSites')}>
    <span aria-hidden="true">⌁</span>
    <span class="control-label">{$t('filter')}</span>
    {#if selectedCount}
      <span class="count-badge">{selectedCount}</span>
    {/if}
  </summary>

  <div class="popover-panel filter-panel">
    <div class="popover-head">
      <strong>{$t('filter')}</strong>
      <div class="filter-head-actions">
        {#if selectedCount}
          <button type="button" class="text-button" onclick={clear}>{$t('clear')}</button>
        {/if}
        <div class="sort-direction" role="group" aria-label={$t('filterOrder')}>
          <button
                  type="button"
                  class:active={sort === 'alphabetical'}
                  aria-pressed={sort === 'alphabetical'}
                  onclick={(): void => onSortChange('alphabetical')}
          >{$t('alphabetical')}</button>
          <button
                  type="button"
                  class:active={sort === 'usage'}
                  aria-pressed={sort === 'usage'}
                  onclick={(): void => onSortChange('usage')}
          >{$t('mostUsed')}</button>
        </div>
      </div>
    </div>

    {#if langs.length}
      <fieldset class="filter-group">
        <legend class="sr-only">{$t('languages')}</legend>
        <div class="filter-group-head">
          <span class="filter-group-title">{$t('languages')}</span>
          <span class="filter-group-line" aria-hidden="true"></span>
          <label class="filter-option-search">
            <span class="sr-only">{$t('searchLanguages')}</span>
            <input bind:value={langQuery} type="search" placeholder={$t('search')} aria-label={$t('searchLanguages')} />
          </label>
        </div>
        {#if filteredLangs.length}
          <div class="choice-cloud">
            {#each filteredLangs as lang (lang)}
              <button
                      type="button"
                      class:selected={selectedLangs.includes(lang)}
                      aria-pressed={selectedLangs.includes(lang)}
                      onclick={(): void => toggle(selectedLangs, lang, onLangsChange)}
              >{lang}</button>
            {/each}
          </div>
        {:else}
          <div class="empty-options compact">{$t('noMatchingLanguages')}</div>
        {/if}
      </fieldset>
    {/if}

    {#if topics.length}
      <fieldset class="filter-group">
        <legend class="sr-only">{$t('tags')}</legend>
        <div class="filter-group-head">
          <span class="filter-group-title">{$t('tags')}</span>
          <span class="filter-group-line" aria-hidden="true"></span>
          <label class="filter-option-search">
            <span class="sr-only">{$t('searchTags')}</span>
            <input bind:value={topicQuery} type="search" placeholder={$t('search')} aria-label={$t('searchTags')} />
          </label>
        </div>
        {#if filteredTopics.length}
          <div class="choice-cloud">
            {#each filteredTopics as topic (topic)}
              <button
                      type="button"
                      class:selected={selectedTopics.includes(topic)}
                      aria-pressed={selectedTopics.includes(topic)}
                      onclick={(): void => toggle(selectedTopics, topic, onTopicsChange)}
              >#{topic}</button>
            {/each}
          </div>
        {:else}
          <div class="empty-options compact">{$t('noTags')}</div>
        {/if}
      </fieldset>
    {/if}

    {#if !langs.length && !topics.length}
      <div class="empty-options">{$t('noMetadata')}</div>
    {/if}
  </div>
</details>
