<script lang="ts">
  import { asset } from '$app/paths'
  import { t } from '#lib/i18n/index.ts'
  import { onMount, tick } from 'svelte'
  import type { Lang, Site } from '#lib/types.ts'
  import LockIcon from './icons/LockIcon.svelte'
  import Octicon from './icons/Octicon.svelte'

  export let site: Site

  let isImgFail: boolean = false
  let langLimit: number = 5
  let langRow: HTMLDivElement | null = null
  let repoIcon: 'repo-forked' | 'repo-template' | 'repo' = 'repo'
  let screenshotUrl: string
  let visLangs: Lang[]
  let nameSeparator: number
  let repoOwner: string
  let repoName: string
  let summary: string
  let initials: string
  let privateLinkLbl: string
  let repoGithubLbl: string

  $: screenshotUrl = site.screenshot
    ? asset(site.screenshot.replace(/^\/+/, '') as Parameters<typeof asset>[0])
    : ''
  $: visLangs = site.languages.slice(0, langLimit)
  $: nameSeparator = site.fullName.lastIndexOf('/')
  $: repoOwner = nameSeparator >= 0 ? site.fullName.slice(0, nameSeparator) : ''
  $: repoName = site.fullName.slice(nameSeparator + 1)
  $: summary = site.description || $t('noDescription')
  $: initials = site.name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string): string => part[0]?.toUpperCase() ?? '')
    .join('')
  $: repoIcon = site.isFork ? 'repo-forked' : (site.isTemplate ? 'repo-template' : 'repo')
  $: privateLinkLbl = $t(site.isFork ? 'privateForkLink' : (site.isTemplate ? 'privateTemplateLink' : 'privateLink'))
  $: repoGithubLbl = $t(site.isFork ? 'forkGithub' : (site.isTemplate ? 'templateGithub' : 'repositoryGithub'))

  async function fitLangs(): Promise<void> {
    if (!langRow) return
    langLimit = Math.min(5, site.languages.length)
    await tick()

    while (langLimit > 0 && langRow.scrollWidth > langRow.clientWidth + 1) {
      langLimit -= 1
      await tick()
    }
  }

  onMount((): (() => void) => {
    void fitLangs()
    const resizeObs: ResizeObserver = new ResizeObserver((): void => void fitLangs())
    if (langRow) resizeObs.observe(langRow)
    return (): void => resizeObs.disconnect()
  })
</script>

<article class={site.isPrivate ? 'site-card is-private' : 'site-card'}>
  <a class="preview" href={site.siteUrl} target="_blank" rel="noreferrer" aria-label={$t('openSite', { name: site.fullName })}>
    <div class="preview-image">
      {#if screenshotUrl && !isImgFail}
        <img
          src={screenshotUrl}
          alt={$t('preview', { name: site.fullName })}
          loading="lazy"
          onerror={(): boolean => (isImgFail = true)}
        />
      {:else}
        <div class="preview-fallback" aria-hidden="true">
          <span>{initials}</span>
        </div>
      {/if}
    </div>
  </a>

  <div class="card-body">
    <div class="title-row">
      <div class="title-copy">
        <h2 title={site.fullName} aria-label={site.fullName}>
          {#if repoOwner}<span class="repo-owner">{repoOwner}</span>{/if}
          <span class="repo-name">{repoName}</span>
        </h2>
        {#if site.isPrivate}
          <span class="private-badge" title={$t('privateSource')}>
            <LockIcon />
            <span>{$t('private')}</span>
          </span>
        {/if}
      </div>

      {#if site.isPrivate}
        <span class="repo-link" aria-disabled="true" title={privateLinkLbl}>
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
          aria-label={$t('openGithub', { name: site.fullName })}
          title={repoGithubLbl}
        >
          <Octicon name={repoIcon} />
          <span>GitHub</span>
        </a>
      {/if}
    </div>

    <p>{summary}</p>

    <div class="card-meta">
      <div bind:this={langRow} class="meta-row" aria-label={$t('languages')}>
        {#each visLangs as lang (`lang-${lang.name}`)}
          <span class="chip language-chip">{lang.name}</span>
        {/each}
      </div>

      <div class="card-stats" aria-label={$t('statistics')}>
        <span title={$t('stars')} aria-label={$t('starCount', { count: site.stars })}><Octicon name="star" /> {site.stars}</span>
        <span title={$t('forks')} aria-label={$t('forkCount', { count: site.forks })}><Octicon name="repo-forked" /> {site.forks}</span>
        {#if site.contributors !== null}
          <span title={$t('contributors')} aria-label={$t('contributorCount', { count: site.contributors })}><Octicon name="people" /> {site.contributors}</span>
        {/if}
      </div>
    </div>
  </div>
</article>
