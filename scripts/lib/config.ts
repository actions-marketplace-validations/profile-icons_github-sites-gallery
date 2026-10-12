import { loadEnvFile } from 'node:process'

export type AuthMode = 'anonymous' | 'installation' | 'pat'

export interface AppConfig {
  readonly logins: readonly string[]
  readonly primaryLogin: string
  readonly token: string
  readonly authMode: AuthMode
  readonly srcRepoUrl: string | null
  readonly screenshotDelayMS: number
}

export function loadConfig(): AppConfig {
  loadDotEnv()

  const srcRepo = process.env.GITHUB_REPOSITORY ?? null
  const configLogins = parseList(process.env.GH_USERNAMES)
  const ghPat = process.env.GH_PAT?.trim() || ''
  const installToken = process.env.GITHUB_TOKEN?.trim() || ''
  const logins = unique(configLogins.length ? configLogins : [srcRepo?.split('/')[0] || ''])

  return {
    logins,
    primaryLogin: logins[0] || '',
    token: ghPat || installToken,
    authMode: ghPat ? 'pat' : installToken ? 'installation' : 'anonymous',
    srcRepoUrl: srcRepo
      ? `${(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/+$/, '')}/${srcRepo}`
      : null,
    screenshotDelayMS: posInt(process.env.SCREENSHOT_DELAY_MS, 10_000),
  }
}

function loadDotEnv(): void {
  try {
    loadEnvFile('.env')
  } catch (error: unknown) {
    if (!hasErrCode(error, 'ENOENT')) throw error
  }
}

function parseList(val: string | undefined): string[] {
  return (val || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function unique(vals: readonly string[]): string[] {
  return [...new Set(vals.filter(Boolean))]
}

function posInt(val: string | undefined, fb: number): number {
  const parsed = Number(val)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fb
}

function hasErrCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}
