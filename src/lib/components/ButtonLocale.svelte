<script lang="ts">
  import { onMount } from 'svelte'
  import { type Locale, locale, localeDisplayName, restoreLocale, setLocale, supLocales, t } from '#lib/i18n/index.ts'

  let dialog: HTMLDialogElement
  let search: string = ''
  let isErr: boolean = false
  let sel: number = 0
  let displayNames: Record<Locale, string>
  let query: string
  let filtered: Locale[]

  $: displayNames = Object.fromEntries(supLocales.map((code: Locale): [Locale, string] => [code, localeDisplayName(code, $locale)]))
  $: query = norm(search)
  $: filtered = supLocales.filter((code: Locale): boolean => norm(`${displayNames[code]} ${code}`).includes(query))

  onMount(restoreLocale)

  function norm(val: string): string {
    return val.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  }

  function openDialog(): void {
    sel += 1
    search = ''
    isErr = false
    dialog.showModal()
  }

  function closeDialog(): void {
    sel += 1
    dialog.close()
  }

  function handleDialogClick(event: MouseEvent): void {
    if (event.target !== dialog) return
    const box: DOMRect = dialog.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog()
  }

  async function choose(code: Locale): Promise<void> {
    const id: number = ++sel
    isErr = false
    try {
      const applied: boolean = await setLocale(code)
      if (applied && id === sel) dialog.close()
    } catch {
      if (id === sel) isErr = true
    }
  }
</script>

<button
  type="button"
  class="header-icon-button locale-trigger"
  aria-label={$t('chooseLanguage')}
  title={$t('chooseLanguage')}
  aria-haspopup="dialog"
  onclick={openDialog}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18"></path>
  </svg>
  <span translate="no" dir="ltr">{$locale.toUpperCase()}</span>
</button>

<dialog
  bind:this={dialog}
  class="locale-dialog"
  aria-labelledby="locale-dialog-heading"
  onclick={handleDialogClick}
>
  <div class="locale-scroll">
    <div class="locale-header">
      <div class="locale-heading">
        <h2 id="locale-dialog-heading">{$t('language')}</h2>
        <button class="locale-close" type="button" aria-label={$t('closeLanguage')} onclick={closeDialog}>×</button>
      </div>
      <label for="locale-search">{$t('searchLanguages')}</label>
      <input id="locale-search" type="search" bind:value={search} autocomplete="off" spellcheck="false" />
    </div>
    <div class="locale-content">
      {#if isErr}<p role="alert">{$t('localeError')}</p>{/if}
      <div class="locale-grid" translate="no">
        {#each filtered as code (code)}
          <button class:selected={code === $locale} type="button" aria-pressed={code === $locale} onclick={(): Promise<void> => choose(code)}>
            <span lang={code}>{displayNames[code]}</span>
            <small dir="ltr">{code.toUpperCase()}</small>
          </button>
        {/each}
      </div>
      {#if !filtered.length}<p class="locale-empty">{$t('noLanguages')}</p>{/if}
    </div>
  </div>
</dialog>

<style>
  .locale-trigger { width: auto; min-width: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 0 7px; white-space: nowrap; }
  .locale-trigger svg { width: 17px; height: 17px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .locale-trigger span { font-size: 11px; line-height: 1; font-weight: 800; letter-spacing: .035em; }
  .locale-dialog {
    --locale-surface: #12151a; --locale-text: #f0f2f6; --locale-muted: #959caa;
    --locale-border: #2c313d; --locale-control: #15181e; --locale-hover: #1a1e25;
    --locale-accent: #8d95ff; --locale-selected: #252942;
    margin: auto; padding: 0; max-height: min(42.5rem, calc(100dvh - 2rem));
    width: min(34rem, calc(100vw - 1.5rem)); max-width: none; overflow: hidden;
    border: 1px solid var(--locale-border); border-radius: 1.125rem;
    background: var(--locale-surface); color: var(--locale-text);
    box-shadow: 0 24px 80px rgb(0 0 0 / .4);
  }
  :global(html[data-theme='light']) .locale-dialog {
    --locale-surface: #fff; --locale-text: #1f2328; --locale-muted: #656d76;
    --locale-border: #d0d7de; --locale-control: #f6f8fa; --locale-hover: #eef1f5;
    --locale-accent: #5965db; --locale-selected: #eef0ff;
  }
  .locale-dialog::backdrop { background: rgb(2 7 13 / .72); backdrop-filter: blur(2px); }
  .locale-scroll { max-height: min(42.5rem, calc(100dvh - 2rem)); overflow-y: auto; background: var(--locale-surface); }
  .locale-header { position: sticky; top: 0; z-index: 2; padding: 24px 24px 14px; background: var(--locale-surface); box-shadow: 0 5px 12px rgb(0 0 0 / .08); }
  .locale-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  h2 { margin: 0; font-size: 20px; line-height: 24px; }
  .locale-close { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; flex: none; border: 1px solid var(--locale-border); border-radius: 9px; background: var(--locale-control); color: inherit; font-size: 1.45rem; cursor: pointer; }
  label { display: block; margin-bottom: .4rem; color: var(--locale-muted); font-size: .78rem; font-weight: 700; }
  input { min-height: 44px; width: 100%; padding: .7rem .8rem; border: 1px solid var(--locale-border); border-radius: .65rem; outline: none; background: var(--locale-control); color: inherit; }
  .locale-content { padding: .85rem 24px 24px; }
  .locale-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .45rem; }
  .locale-grid button { display: flex; align-items: center; justify-content: space-between; min-height: 48px; gap: .7rem; padding: .6rem .7rem; border: 1px solid var(--locale-border); border-radius: .65rem; background: var(--locale-control); color: inherit; text-align: start; cursor: pointer; }
  .locale-grid button.selected { border-color: var(--locale-accent); background: var(--locale-selected); box-shadow: inset 0 0 0 1px var(--locale-accent); }
  .locale-grid button:hover, .locale-close:hover { border-color: var(--locale-accent); background: var(--locale-hover); }
  .locale-grid span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  small { flex: none; font-size: .66rem; color: var(--locale-muted); }
  .locale-empty { text-align: center; color: var(--locale-muted); }
  input:focus, button:focus-visible { outline: 2px solid var(--locale-accent); outline-offset: 2px; }
  @media (max-width: 520px) { .locale-grid { grid-template-columns: 1fr; } }
</style>
