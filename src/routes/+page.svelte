<script lang="ts">
  import Gallery from '#lib/components/Gallery.svelte'
  import { metadata, sites } from '#lib/data/index.ts'

  const titleName = metadata.profile.name || metadata.profile.login || 'GitHub'
</script>

<svelte:head>
  <title>{titleName}'s Sites</title>
  <meta name="description" content="A searchable preview gallery of Pages and description-linked deployed sites for owned GitHub repositories using SvelteKit." />
  <meta name="author" content="Adam Ross (https://github.com/r055a)" />
  <meta name="theme-color" content="#0c0e12" />
</svelte:head>

<Gallery {sites} {metadata} />
