import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { GalleryMetadata, Profile, Site } from '../src/lib/types'
import { loadConfig } from './lib/config'
import { type Account, GitHubAPI, type Repo, type ResSite, repoOwner } from './lib/github'
import { dscrSiteUrl, latestDate, mapConcurr, screenshotName, stripSiteUrl } from './lib/site'

const SITES_OUTPUT = path.resolve('src/lib/data/sites.json')
const METADATA_OUTPUT = path.resolve('src/lib/data/metadata.json')

const config = loadConfig()
const gh = new GitHubAPI(config)

try {
  await sync()
} finally {
  gh.meter.print()
}

async function sync(): Promise<void> {
  if (!config.logins.length) {
    console.log('No GitHub username could be determined.')
    return
  }

  const { repos, accounts } = await gh.collectRepos(config.logins)
  const profile = buildProfile(accounts)
  console.log(`Header profile: ${profile.login}.`)
  const metadata: GalleryMetadata = {
    profile,
    srcRepoUrl: config.srcRepoUrl,
  }
  console.log(
    `Gallery source repository: ${config.srcRepoUrl ? config.srcRepoUrl : '(not detected)'}.`,
  )

  const prequal = repos
    .map((repo) => ({ repo, descriptionUrl: dscrSiteUrl(repo.description || '') }))
    .filter(({ repo, descriptionUrl }) => repo.has_pages || descriptionUrl)
  console.log(`Found ${prequal.length} repositories with GitHub Pages or site URL in description.`)
  const res = await mapConcurr(prequal, 5, async ({ repo, descriptionUrl }) => ({
    repo,
    site: await gh.resolveSite(repo, descriptionUrl),
  }))

  const candidates = res.filter(
    (entry): entry is { repo: Repo; site: NonNullable<typeof entry.site> } => Boolean(entry.site),
  )

  const sites = await mapConcurr(candidates, 4, async ({ repo, site }) => buildSite(repo, site))
  sites.sort(
    (a, b) =>
      b.stars - a.stars ||
      compareOptionalDates(b.activityAt, a.activityAt) ||
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base', numeric: true }),
  )

  await Promise.all([writeJson(SITES_OUTPUT, sites), writeJson(METADATA_OUTPUT, metadata)])
  console.log(`Wrote ${sites.length} deployed sites to ${SITES_OUTPUT}.`)
}

async function buildSite(repo: Repo, deployed: ResSite): Promise<Site> {
  const owner = repoOwner(repo)
  const [langs, activity] = await Promise.all([gh.langs(repo), gh.activity(repo)])

  return {
    name: repo.name,
    fullName: repo.full_name,
    description: stripSiteUrl(repo.description || ''),
    repoUrl: repo.html_url,
    siteUrl: deployed.siteUrl,
    isPrivate: Boolean(repo.private),
    isFork: Boolean(repo.fork),
    isTemplate: Boolean(repo.is_template),
    topics: [...(repo.topics || [])].slice(0, 20).sort((a, b) => a.localeCompare(b)),
    languages: langs,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    contributors: activity.contributors,
    createdAt: repo.created_at || null,
    activityAt: latestDate(repo.pushed_at, activity.latestReleaseAt, activity.latestIssueAt),
    screenshot: `screenshots/${screenshotName(owner, repo.name)}`,
  }
}

function buildProfile(accounts: ReadonlyMap<string, Account>): Profile {
  const login = config.primaryLogin || config.logins[0] || ''
  const account = accounts.get(login.toLowerCase())
  return {
    login: account?.login || login,
    name: account?.name || null,
    avatarUrl: account?.avatar_url || (login ? `https://github.com/${login}.png?size=96` : ''),
    profileUrl: account?.html_url || (login ? `https://github.com/${login}` : 'https://github.com'),
  }
}

function compareOptionalDates(left: string | null, right: string | null): number {
  const leftTime = left ? Date.parse(left) : 0
  const rightTime = right ? Date.parse(right) : 0
  return leftTime - rightTime
}

async function writeJson(file: string, val: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(val, null, 2)}\n`)
}
