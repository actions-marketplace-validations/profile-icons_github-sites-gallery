export function dscrSiteUrl(dscr: string): string | null {
  const matches = dscr.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || []
  for (const candidate of matches) {
    const url = cleanUrl(candidate)
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
  const host = `${owner.toLowerCase()}.github.io`
  return repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`
}

export function screenshotName(owner: string, repo: string): string {
  return `${safeFilePart(owner)}--${safeFilePart(repo)}.webp`
}

export function latestDate(...vals: Array<string | null | undefined>): string | null {
  const timestamps = vals
    .filter((val): val is string => Boolean(val))
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
  const res = new Array<R>(items.length)
  const entries = items.entries()

  const worker = async (): Promise<void> => {
    while (true) {
      const next = entries.next()
      if (next.done) return
      const [idx, item] = next.value
      res[idx] = await mapper(item)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurr, items.length) }, worker))
  return res
}

function cleanUrl(val: string): string | null {
  let candidate = val.trim().replace(/[),.;:!?\]}>]+$/g, '')
  if (/^www\./i.test(candidate)) candidate = `https://${candidate}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
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
