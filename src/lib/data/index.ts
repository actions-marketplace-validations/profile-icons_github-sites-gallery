import type { GalleryMetadata, Site } from '#lib/types.ts'
import metadataJson from './metadata.json'

const generatedSites = import.meta.glob<readonly Site[]>('./sites.json', {
  eager: true,
  import: 'default',
})

export const metadata: GalleryMetadata = metadataJson
export const sites: readonly Site[] = generatedSites['./sites.json'] ?? []
