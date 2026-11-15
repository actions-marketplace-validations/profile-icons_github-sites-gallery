<script lang="ts">
  import { t } from '#lib/i18n/index.ts'
  import Gallery from '#lib/components/Gallery.svelte'
  import { metadata, sites } from '#lib/data/index.ts'

  const titleName = metadata.profile.name || metadata.profile.login || 'GitHub'
</script>

<svelte:head>
  <title>{$t('pageTitle', { name: titleName })}</title>
  <meta name="description" content={$t('metaDescription')} />
  <meta name="author" content="Adam Ross (https://github.com/r055a)" />
  <meta name="theme-color" content="#0c0e12" />
</svelte:head>

<Gallery {sites} {metadata} />
