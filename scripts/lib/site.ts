export function dscrSiteUrl(dscr: string): string | null {
  const matches: readonly string[] = dscr.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || []
  for (const candidate of matches) {
    const url: string | null = cleanUrl(candidate)
    if (url) return url
  }
  return null
}

export function stripSiteUrl(dscr: string): string {
  return dscr
    .replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function fbPagesUrl(owner: string, repo: string): string {
  const host: string = `${owner.toLowerCase()}.github.io`
  return repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`
}

export function screenshotName(owner: string, repo: string): string {
  return `${safeFilePart(owner)}--${safeFilePart(repo)}.webp`
}

export function latestDate(...vals: Array<string | null | undefined>): string | null {
  const timestamps: number[] = vals
    .filter((val: string | null | undefined): val is string => Boolean(val))
    .map(Date.parse)
    .filter(Number.isFinite)
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null
}

export async function mapConcurr<T, R>(
  items: readonly T[],
  concurr: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return []
  const res: R[] = new Array<R>(items.length)
  const entries: ArrayIterator<[number, T]> = items.entries()

  const worker: () => Promise<void> = async (): Promise<void> => {
    while (true) {
      const next: IteratorResult<[number, T], undefined> = entries.next()
      if (next.done) return
      const [idx, item]: [number, T] = next.value
      res[idx] = await mapper(item)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurr, items.length) }, worker))
  return res
}

function cleanUrl(val: string): string | null {
  let candidate: string = val.trim().replace(/[),.;:!?\]}>]+$/g, '')
  if (/^www\./i.test(candidate)) candidate = `https://${candidate}`

  try {
    const url: URL = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host: string = url.hostname.toLowerCase()
    if (
      host === 'github.com' ||
      host.endsWith('.github.com') ||
      host.endsWith('githubusercontent.com')
    )
      return null
    return url.href
  } catch {
    return null
  }
}

function safeFilePart(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
