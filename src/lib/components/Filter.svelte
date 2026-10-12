<script lang="ts">
  export let langs: readonly string[] = []
  export let topics: readonly string[] = []
  export let selectedLangs: readonly string[] = []
  export let selectedTopics: readonly string[] = []
  export let onLangsChange: (val: string[]) => void = () => undefined
  export let onTopicsChange: (val: string[]) => void = () => undefined

  let langQuery = ''
  let topicQuery = ''

  $: selectedCount = selectedLangs.length + selectedTopics.length
  $: filteredLangs = searchOptions(langs, langQuery)
  $: filteredTopics = searchOptions(topics, topicQuery)

  function toggle(list: readonly string[], val: string, callback: (val: string[]) => void): void {
    const nxt = new Set(list)
    if (nxt.has(val)) nxt.delete(val)
    else nxt.add(val)
    callback([...nxt])
  }

  function clear(): void {
    onLangsChange([])
    onTopicsChange([])
  }

  function searchOptions(options: readonly string[], query: string): string[] {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return [...options]
    return options.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery))
  }
</script>

<details name="gallery-tools" class="popover filter-popover">
  <summary class="control-button" aria-label="Filter sites">
    <span aria-hidden="true">⌁</span>
    <span class="control-label">Filter</span>
    {#if selectedCount}
      <span class="count-badge">{selectedCount}</span>
    {/if}
  </summary>

  <div class="popover-panel filter-panel">
    <div class="popover-head">
      <strong>Filter</strong>
      {#if selectedCount}
        <button type="button" class="text-button" onclick={clear}>Clear</button>
      {/if}
    </div>

    {#if langs.length}
      <fieldset class="filter-group">
        <legend class="sr-only">Languages</legend>
        <div class="filter-group-head">
          <span class="filter-group-title">Languages</span>
          <span class="filter-group-line" aria-hidden="true"></span>
          <label class="filter-option-search">
            <span class="sr-only">Search languages</span>
            <input bind:value={langQuery} type="search" placeholder="Search" aria-label="Search languages" />
          </label>
        </div>
        {#if filteredLangs.length}
          <div class="choice-cloud">
            {#each filteredLangs as lang (lang)}
              <button
                type="button"
                class:selected={selectedLangs.includes(lang)}
                aria-pressed={selectedLangs.includes(lang)}
                onclick={() => toggle(selectedLangs, lang, onLangsChange)}
              >{lang}</button>
            {/each}
          </div>
        {:else}
          <div class="empty-options compact">No matching languages.</div>
        {/if}
      </fieldset>
    {/if}

    {#if topics.length}
      <fieldset class="filter-group">
        <legend class="sr-only">Tags</legend>
        <div class="filter-group-head">
          <span class="filter-group-title">Tags</span>
          <span class="filter-group-line" aria-hidden="true"></span>
          <label class="filter-option-search">
            <span class="sr-only">Search tags</span>
            <input bind:value={topicQuery} type="search" placeholder="Search" aria-label="Search tags" />
          </label>
        </div>
        {#if filteredTopics.length}
          <div class="choice-cloud">
            {#each filteredTopics as topic (topic)}
              <button
                type="button"
                class:selected={selectedTopics.includes(topic)}
                aria-pressed={selectedTopics.includes(topic)}
                onclick={() => toggle(selectedTopics, topic, onTopicsChange)}
              >#{topic}</button>
            {/each}
          </div>
        {:else}
          <div class="empty-options compact">No matching tags.</div>
        {/if}
      </fieldset>
    {/if}

    {#if !langs.length && !topics.length}
      <div class="empty-options">No filter metadata is available.</div>
    {/if}
  </div>
</details>
