<script lang="ts">
  import { asset } from '$app/paths'
  import { onMount, tick } from 'svelte'
  import type { Site } from '#lib/types.ts'
  import LockIcon from './icons/LockIcon.svelte'
  import Octicon from './icons/Octicon.svelte'

  export let site: Site

  let isImgFail = false
  let langLimit = 5
  let langRow: HTMLDivElement | null = null
  let repoIcon: 'repo-forked' | 'repo-template' | 'repo' = 'repo'

  $: screenshotUrl = site.screenshot
    ? asset(site.screenshot.replace(/^\/+/, '') as Parameters<typeof asset>[0])
    : ''
  $: visLangs = site.languages.slice(0, langLimit)
  $: summary = site.description || 'No repository description.'
  $: initials = site.name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  $: repoIcon = site.isFork ? 'repo-forked' : (site.isTemplate ? 'repo-template' : 'repo')
  $: repoTypeLbl = site.isFork ? 'Fork repository' : (site.isTemplate ? 'Template repository' : 'Repository')

  async function fitLangs(): Promise<void> {
    if (!langRow) return
    langLimit = Math.min(5, site.languages.length)
    await tick()

    while (langLimit > 0 && langRow.scrollWidth > langRow.clientWidth + 1) {
      langLimit -= 1
      await tick()
    }
  }

  onMount(() => {
    void fitLangs()
    const resizeObs = new ResizeObserver(() => void fitLangs())
    if (langRow) resizeObs.observe(langRow)
    return () => resizeObs.disconnect()
  })
</script>

<article class={site.isPrivate ? 'site-card is-private' : 'site-card'}>
  <a class="preview" href={site.siteUrl} target="_blank" rel="noreferrer" aria-label={`Open ${site.fullName}`}>
    {#if screenshotUrl && !isImgFail}
      <img
        src={screenshotUrl}
        alt={`Preview of ${site.fullName}`}
        loading="lazy"
        onerror={() => (isImgFail = true)}
      />
    {:else}
      <div class="preview-fallback" aria-hidden="true">
        <span>{initials}</span>
      </div>
    {/if}
    <span class="open-badge" aria-hidden="true">↗</span>
  </a>

  <div class="card-body">
    <div class="title-row">
      <div class="title-copy">
        <h2 title={site.fullName}>{site.fullName}</h2>
        {#if site.isPrivate}
          <span class="private-badge" title="Private source repository">
            <LockIcon />
            <span>Private</span>
          </span>
        {/if}
      </div>

      {#if site.isPrivate}
        <span class="repo-link" aria-disabled="true" title={`Private ${repoTypeLbl.toLowerCase()} link unavailable`}>
          <LockIcon />
          <Octicon name={repoIcon} />
          <span>GitHub</span>
        </span>
      {:else}
        <a
          class="repo-link"
          href={site.repoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${site.fullName} on GitHub`}
          title={`${repoTypeLbl} on GitHub`}
        >
          <Octicon name={repoIcon} />
          <span>GitHub</span>
        </a>
      {/if}
    </div>

    <p>{summary}</p>

    <div class="card-meta">
      <div bind:this={langRow} class="meta-row" aria-label="Languages">
        {#each visLangs as lang (`lang-${lang.name}`)}
          <span class="chip language-chip">{lang.name}</span>
        {/each}
      </div>

      <div class="card-stats" aria-label="Repository statistics">
        <span title="Stars" aria-label={`${site.stars} stars`}><Octicon name="star" /> {site.stars}</span>
        <span title="Forks" aria-label={`${site.forks} forks`}><Octicon name="repo-forked" /> {site.forks}</span>
        {#if site.contributors !== null}
          <span title="Contributors" aria-label={`${site.contributors} contributors`}><Octicon name="people" /> {site.contributors}</span>
        {/if}
      </div>
    </div>
  </div>
</article>
