type HeaderValue = string | number | undefined
type HeaderMap = Record<string, HeaderValue>

interface ResLike {
  readonly hdrs?: HeaderMap
}

interface CallAPI {
  readonly resource: string
  readonly cost: number
  readonly limit: number | null
  readonly remaining: number | null
}

interface ResourceTotals {
  reqs: number
  cost: number
  remaining: number | null
  limit: number | null
}

export class MeterAPI {
  readonly #calls: CallAPI[] = []

  record(res?: ResLike): void {
    const hdrs = res?.hdrs || {}
    const resource = hdr(hdrs, 'x-ratelimit-resource') || 'unmetered/unknown'

    this.#calls.push({
      resource,
      cost: resource === 'unmetered/unknown' ? 0 : 1,
      limit: numericHdr(hdrs, 'x-ratelimit-limit'),
      remaining: numericHdr(hdrs, 'x-ratelimit-remaining'),
    })
  }

  print(): void {
    if (!this.#calls.length) {
      console.log('\nGitHub API cost: no API requests made.')
      return
    }

    const ttlCost = this.#calls.reduce((sum, call) => sum + call.cost, 0)
    const resources = new Map<string, ResourceTotals>()

    for (const call of this.#calls) {
      const ttls = resources.get(call.resource) || {
        reqs: 0,
        cost: 0,
        remaining: null,
        limit: null,
      }
      ttls.reqs += 1
      ttls.cost += call.cost
      if (call.remaining !== null) ttls.remaining = call.remaining
      if (call.limit !== null) ttls.limit = call.limit
      resources.set(call.resource, ttls)
    }

    console.log('\nGitHub API request cost')
    console.log('-----------------------')
    console.log(`Total HTTP requests: ${this.#calls.length}`)
    console.log(`Total GitHub API rate cost: ${ttlCost} unit${ttlCost === 1 ? '' : 's'}`)
    for (const [resource, ttls] of resources) {
      const quota =
        ttls.remaining !== null && ttls.limit !== null
          ? `; last reported remaining ${ttls.remaining}/${ttls.limit}`
          : ''
      console.log(`  ${resource}: ${ttls.reqs} request(s), ${ttls.cost} unit(s)${quota}`)
    }
  }
}

function hdr(hdrs: HeaderMap, key: string): string | null {
  const val = hdrs[key]
  return val === undefined ? null : String(val)
}

function numericHdr(hdrs: HeaderMap, key: string): number | null {
  const raw = hdr(hdrs, key)
  if (raw === null) return null
  const val = Number(raw)
  return Number.isFinite(val) ? val : null
}
