import type { Endpoints } from '@octokit/types'
import { Octokit } from 'octokit'
import type { Lang } from '../../src/lib/types'
import { MeterAPI } from './api'
import type { AppConfig } from './config'
import { fbPagesUrl } from './site'

export type Account = Endpoints['GET /users/{username}']['response']['data']
type UserRepo = Endpoints['GET /users/{username}/repos']['response']['data'][number]
type OrgRepo = Endpoints['GET /orgs/{org}/repos']['response']['data'][number]
type AuthRepo = Endpoints['GET /user/repos']['response']['data'][number]
type InstallationRepo =
  Endpoints['GET /installation/repositories']['response']['data']['repositories'][number]
export type Repo = UserRepo | OrgRepo | AuthRepo | InstallationRepo

export interface ResSite {
  readonly siteUrl: string
}

export interface RepoActivity {
  readonly contributors: number | null
  readonly latestReleaseAt: string | null
  readonly latestIssueAt: string | null
}

export class GitHubAPI {
  readonly meter = new MeterAPI()
  readonly #api: Octokit
  readonly #anonymous: Octokit
  readonly #privateAPI: Octokit | null

  constructor(private readonly config: AppConfig) {
    const auth = config.token
    this.#api = trackedOctokit(auth, this.meter)
    this.#anonymous = auth ? trackedOctokit('', this.meter) : this.#api
    this.#privateAPI = auth ? this.#api : null
  }

  async collectRepos(logins: readonly string[]): Promise<{
    repos: readonly Repo[]
    accounts: ReadonlyMap<string, Account>
  }> {
    const repos = new Map<string, Repo>()
    const accounts = new Map<string, Account>()

    for (const login of logins) {
      try {
        const account = (
          await this.#publicRequest((client) =>
            client.rest.users.getByUsername({ username: login }),
          )
        ).data
        accounts.set(login.toLowerCase(), account)

        let newRepos: Repo[]
        if (account.type === 'Organization') {
          newRepos = await this.#publicRequest((client) =>
            client.paginate(client.rest.repos.listForOrg, {
              org: login,
              type: 'public',
              per_page: 100,
            }),
          )
        } else {
          newRepos = await this.#publicRequest((client) =>
            client.paginate(client.rest.repos.listForUser, {
              username: login,
              type: 'owner',
              per_page: 100,
            }),
          )
        }
        console.log(`Fetched ${newRepos.length} public repositories for ${login}.`)
        addRepos(repos, newRepos)
      } catch (err: unknown) {
        console.warn(`Could not fetch one configured GitHub account: ${errMsg(err)}`)
      }
    }

    if (this.#privateAPI) {
      try {
        const allowedOwners = new Set(logins.map((login) => login.toLowerCase()))
        const privateRepos =
          this.config.authMode === 'pat' ? await this.#patRepos() : await this.#installationRepos()
        const selected = privateRepos.filter(
          (repo) => repo.private && allowedOwners.has(repo.owner?.login?.toLowerCase() || ''),
        )
        console.log(
          `Merged ${selected.length} private repositories authorized by the ${
            this.config.authMode === 'pat' ? 'pat' : 'installation'
          } token.`,
        )
        addRepos(repos, selected)
      } catch (error: unknown) {
        console.warn(`Could not enumerate private repositories: ${errMsg(error)}.`)
      }
    }

    return { repos: [...repos.values()], accounts }
  }

  async #patRepos(): Promise<AuthRepo[]> {
    if (!this.#privateAPI) return []
    return this.#privateAPI.paginate(this.#privateAPI.rest.repos.listForAuthenticatedUser, {
      visibility: 'private',
      affiliation: 'owner,collaborator,organization_member',
      per_page: 100,
    })
  }

  async #installationRepos(): Promise<InstallationRepo[]> {
    if (!this.#privateAPI) return []

    const repos: InstallationRepo[] = []
    for (let page = 1; ; page += 1) {
      const res = await this.#privateAPI.request('GET /installation/repositories', {
        per_page: 100,
        page,
      })
      repos.push(...res.data.repositories)
      if (res.data.repositories.length < 100) return repos
    }
  }

  async resolveSite(repo: Repo, dscrUrl: string | null): Promise<ResSite | null> {
    if (!repo.has_pages) return dscrUrl ? { siteUrl: dscrUrl } : null

    const owner = repoOwner(repo)
    try {
      const res = await this.#repoReq(repo, (client) =>
        client.rest.repos.getPages({ owner, repo: repo.name }),
      )
      if (res.data.html_url) return { siteUrl: res.data.html_url }
    } catch (err: unknown) {
      const status = errStatus(err)
      if (status !== 403 && status !== 404) {
        console.warn(`Could not read Pages metadata for one repository: ${errMsg(err)}.`)
      }
    }

    return { siteUrl: fbPagesUrl(owner, repo.name) }
  }

  async langs(repo: Repo): Promise<Lang[]> {
    const owner = repoOwner(repo)
    try {
      const res = await this.#repoReq(repo, (client) =>
        client.rest.repos.listLanguages({ owner, repo: repo.name }),
      )
      const langs = Object.entries(res.data)
        .map(([name, bytes]) => ({ name, bytes }))
        .sort((a, b) => b.bytes - a.bytes)
      if (langs.length) return langs
    } catch (err: unknown) {
      console.warn(`Could not fetch languages for one repository: ${errMsg(err)}.`)
    }

    return repo.language ? [{ name: repo.language, bytes: 0 }] : []
  }

  async activity(repo: Repo): Promise<RepoActivity> {
    const owner = repoOwner(repo)
    const [contributors, release, issue] = await Promise.allSettled([
      this.#contributorCount(repo, owner),
      this.#latestRelease(repo, owner),
      this.#latestIssue(repo, owner),
    ])

    reportFail('contributors', contributors)
    reportFail('release', release)
    reportFail('issue', issue)

    return {
      contributors: fulfilledVal(contributors),
      latestReleaseAt: fulfilledVal(release),
      latestIssueAt: fulfilledVal(issue),
    }
  }

  async #contributorCount(repo: Repo, owner: string): Promise<number | null> {
    const res = await this.#repoReq(repo, (client) =>
      client.rest.repos.listContributors({
        owner,
        repo: repo.name,
        anon: 'true',
        per_page: 1,
        page: 1,
      }),
    )
    return lastPage(res.headers.link) ?? res.data.length
  }

  async #latestRelease(repo: Repo, owner: string): Promise<string | null> {
    const res = await this.#repoReq(repo, (client) =>
      client.rest.repos.listReleases({
        owner,
        repo: repo.name,
        per_page: 1,
        page: 1,
      }),
    )
    const release = res.data[0]
    return release?.published_at || release?.created_at || null
  }

  async #latestIssue(repo: Repo, owner: string): Promise<string | null> {
    for (let page = 1; ; page += 1) {
      const res = await this.#repoReq(repo, (client) =>
        client.rest.issues.listForRepo({
          owner,
          repo: repo.name,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: 100,
          page,
        }),
      )
      const issue = res.data.find((item) => !item.pull_request)
      if (issue) return issue.updated_at || null
      if (res.data.length < 100) return null
    }
  }

  async #publicRequest<T>(request: (client: Octokit) => Promise<T>): Promise<T> {
    try {
      return await request(this.#api)
    } catch (err: unknown) {
      if (this.config.token && [401, 403, 404].includes(errStatus(err) ?? 0)) {
        return request(this.#anonymous)
      }
      throw err
    }
  }

  async #repoReq<T>(repo: Repo, request: (client: Octokit) => Promise<T>): Promise<T> {
    if (repo.private) {
      if (!this.#privateAPI)
        throw new Error('Private repository requires an authenticated GitHub token.')
      return request(this.#privateAPI)
    }
    return this.#publicRequest(request)
  }
}

export function repoOwner(repo: Repo): string {
  return repo.owner?.login || repo.full_name.split('/')[0] || ''
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function trackedOctokit(auth: string, meter: MeterAPI): Octokit {
  const client = new Octokit(auth ? { auth } : {})
  client.hook.wrap('request', async (request, options) => {
    try {
      const res = await request(options)
      meter.record({ hdrs: res.headers })
      return res
    } catch (err: unknown) {
      meter.record(resFromErr(err))
      throw err
    }
  })
  return client
}

function resFromErr(
  err: unknown,
): { readonly hdrs?: Record<string, string | number | undefined> } | undefined {
  if (!isRecord(err) || !isRecord(err.response)) return undefined

  const response = err.response
  return {
    hdrs: isHeaderMap(response.headers) ? response.headers : undefined,
  }
}

function errStatus(err: unknown): number | null {
  if (!isRecord(err)) return null
  return typeof err.status === 'number' ? err.status : null
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

function isHeaderMap(val: unknown): val is Record<string, string | number | undefined> {
  if (!isRecord(val)) return false
  return Object.values(val).every(
    (item) => item === undefined || typeof item === 'string' || typeof item === 'number',
  )
}

function addRepos(target: Map<string, Repo>, repos: readonly Repo[]): void {
  for (const repo of repos) target.set(repo.full_name.toLowerCase(), repo)
}

function lastPage(link: string | undefined): number | null {
  const match = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/)
  return match ? Number(match[1]) : null
}

function fulfilledVal<T>(res: PromiseSettledResult<T>): T | null {
  return res.status === 'fulfilled' ? res.value : null
}

function reportFail<T>(lbl: string, res: PromiseSettledResult<T>): void {
  if (res.status === 'rejected') {
    console.warn(`Could not fetch ${lbl} data for one repository: ${errMsg(res.reason)}`)
  }
}
