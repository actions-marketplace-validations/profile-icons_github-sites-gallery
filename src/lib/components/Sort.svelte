<script lang="ts">
  import { type MsgKey, t } from '#lib/i18n/index.ts'
  import { closeOnMouseLeave } from '#lib/popover.ts'
  import type { SecondarySortKey, SortDir, SortKey, SortOption } from '#lib/types.ts'

  export let options: readonly SortOption[] = []
  export let primary: SortKey = 'stars'
  export let secondary: SecondarySortKey = 'langUse'
  export let dir: SortDir = 'desc'
  export let onPrimaryChange: (val: SortKey) => void = (): void => undefined
  export let onSecondaryChange: (val: SecondarySortKey) => void = (): void => undefined
  export let onDirChange: (val: SortDir) => void = (): void => undefined

  const labels: Record<SortKey, MsgKey> = { stars: 'stars', forks: 'forks', contributors: 'contributors', activityAt: 'activity', createdAt: 'created', langUse: 'languages', trafficT: 'traffic' }
  let primaryLbl: string
  $: primaryLbl = options.some((option: SortOption): boolean => option.val === primary)
          ? $t(primary === 'contributors' ? 'contributorsShort' : labels[primary])
          : $t('sort')

  function selectVal(event: Event): string {
    return event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : ''
  }

  function isSortKey(val: string): val is SortKey {
    return options.some((option: SortOption): boolean => option.val === val)
  }

  function changePrimary(event: Event): void {
    const val: string = selectVal(event)
    if (!isSortKey(val)) return
    onPrimaryChange(val)
    if (val === secondary) onSecondaryChange('none')
  }

  function changeSecondary(event: Event): void {
    const val: string = selectVal(event)
    if (val === 'none' || isSortKey(val)) onSecondaryChange(val)
  }
</script>

<details name="gallery-tools" class="popover sort-popover" use:closeOnMouseLeave>
  <summary class="control-button" aria-label={$t('sortSites')}>
    <span aria-hidden="true">⇅</span>
    <span class="control-label">{primaryLbl}</span>
  </summary>

  <div class="popover-panel sort-panel">
    <div class="popover-head">
      <strong>{$t('sort')}</strong>
      <div class="sort-direction" role="group" aria-label={$t('sortDirection')}>
        <button
                type="button"
                class:active={dir === 'asc'}
                aria-pressed={dir === 'asc'}
                onclick={(): void => onDirChange('asc')}
        >{$t('ascending')}</button>
        <button
                type="button"
                class:active={dir === 'desc'}
                aria-pressed={dir === 'desc'}
                onclick={(): void => onDirChange('desc')}
        >{$t('descending')}</button>
      </div>
    </div>

    <label class="sort-field">
      <span>{$t('primary')}</span>
      <select value={primary} onchange={changePrimary}>
        {#each options as option (option.val)}
          <option value={option.val}>{$t(labels[option.val])}</option>
        {/each}
      </select>
    </label>

    <label class="sort-field">
      <span>{$t('secondary')}</span>
      <select value={secondary} onchange={changeSecondary}>
        <option value="none">{$t('none')}</option>
        {#each options.filter((option: SortOption): boolean => option.val !== primary) as option (option.val)}
          <option value={option.val}>{$t(labels[option.val])}</option>
        {/each}
      </select>
    </label>

    {#if primary === 'langUse' || secondary === 'langUse'}
      <p class="sort-note"></p>
    {/if}
    {#if primary === 'trafficT' || secondary === 'trafficT'}
      <p class="sort-note"></p>
    {/if}
  </div>
</details>
