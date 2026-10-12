<script lang="ts">
  import type { SecondarySortKey, SortDir, SortKey, SortOption } from '#lib/types.ts'

  export let options: readonly SortOption[] = []
  export let primary: SortKey = 'stars'
  export let secondary: SecondarySortKey = 'activityAt'
  export let dir: SortDir = 'desc'
  export let onPrimaryChange: (val: SortKey) => void = () => undefined
  export let onSecondaryChange: (val: SecondarySortKey) => void = () => undefined
  export let onDirChange: (val: SortDir) => void = () => undefined

  $: primaryLbl = options.find((option) => option.val === primary)?.shortLbl
    ?? options.find((option) => option.val === primary)?.lbl
    ?? 'Sort'

  function selectVal(event: Event): string {
    return event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : ''
  }

  function isSortKey(val: string): val is SortKey {
    return options.some((option) => option.val === val)
  }

  function changePrimary(event: Event): void {
    const val = selectVal(event)
    if (!isSortKey(val)) return
    onPrimaryChange(val)
    if (val === secondary) onSecondaryChange('none')
  }

  function changeSecondary(event: Event): void {
    const val = selectVal(event)
    if (val === 'none' || isSortKey(val)) onSecondaryChange(val)
  }
</script>

<details name="gallery-tools" class="popover sort-popover">
  <summary class="control-button" aria-label="Sort sites">
    <span aria-hidden="true">⇅</span>
    <span class="control-label">{primaryLbl}</span>
  </summary>

  <div class="popover-panel sort-panel">
    <div class="popover-head">
      <strong>Sort</strong>
      <div class="sort-direction" role="group" aria-label="Sort direction">
        <button
          type="button"
          class:active={dir === 'asc'}
          aria-pressed={dir === 'asc'}
          onclick={() => onDirChange('asc')}
        >Ascending</button>
        <button
          type="button"
          class:active={dir === 'desc'}
          aria-pressed={dir === 'desc'}
          onclick={() => onDirChange('desc')}
        >Descending</button>
      </div>
    </div>

    <label class="sort-field">
      <span>PRIMARY</span>
      <select value={primary} onchange={changePrimary}>
        {#each options as option (option.val)}
          <option value={option.val}>{option.lbl}</option>
        {/each}
      </select>
    </label>

    <label class="sort-field">
      <span>SECONDARY</span>
      <select value={secondary} onchange={changeSecondary}>
        <option value="none">None</option>
        {#each options.filter((option) => option.val !== primary) as option (option.val)}
          <option value={option.val}>{option.lbl}</option>
        {/each}
      </select>
    </label>
  </div>
</details>
