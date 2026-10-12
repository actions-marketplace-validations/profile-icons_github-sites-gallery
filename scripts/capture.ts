import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Browser, chromium, type Page } from 'playwright'
import type { Site } from '../src/lib/types'
import { loadConfig } from './lib/config'
import { mapConcurr } from './lib/site'

const SITES_FILE = path.resolve('src/lib/data/sites.json')
const SCREENSHOTS_DIR = path.resolve('static/screenshots')
const SCREENSHOT_CONCURR = 3
const { screenshotDelayMS } = loadConfig()
const sites = parseSites(await readFile(SITES_FILE, 'utf8'))
let capturedCount = 0

if (!sites.length) {
  console.log('Captured 0 site(s).')
  console.log('Removed 0 site(s) returning HTTP 404.')
  process.exit(0)
}

await mkdir(SCREENSHOTS_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
let isKeep: boolean[]

try {
  isKeep = await mapConcurr(sites, SCREENSHOT_CONCURR, (site) => capture(browser, site))
} finally {
  await browser.close()
}

const retained = sites.filter((_, index) => isKeep[index])
const removedCount = sites.length - retained.length
if (removedCount) {
  await writeFile(SITES_FILE, `${JSON.stringify(retained, null, 2)}\n`)
}
await removeStaleScreenshots(retained)
console.log(`Captured ${capturedCount} site(s).`)
console.log(`Removed ${removedCount} site(s) returning HTTP 404.`)

async function capture(browser: Browser, site: Site): Promise<boolean> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const outPath = path.join(SCREENSHOTS_DIR, path.basename(site.screenshot))

  try {
    const res = await page.goto(site.siteUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    if (res?.status() === 404) {
      await removeIfPresent(outPath)
      return false
    }

    await settle(page)
    await page.screenshot({
      path: outPath,
      type: 'webp',
      quality: 78,
      fullPage: false,
      animations: 'disabled',
    })
    capturedCount += 1
    return true
  } catch {
    return true
  } finally {
    await page.close()
  }
}

async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(screenshotDelayMS)
  await page.evaluate(async () => document.fonts.ready)
}

async function removeStaleScreenshots(sites: readonly Site[]): Promise<void> {
  const expected = new Set(sites.map((site) => path.basename(site.screenshot)))
  for (const file of await readdir(SCREENSHOTS_DIR)) {
    if (file.endsWith('.webp') && !expected.has(file))
      await unlink(path.join(SCREENSHOTS_DIR, file))
  }
}

async function removeIfPresent(file: string): Promise<void> {
  try {
    await unlink(file)
  } catch (err: unknown) {
    if (!hasErrCode(err, 'ENOENT')) throw err
  }
}

function parseSites(source: string): Site[] {
  const value: unknown = JSON.parse(source)
  if (!Array.isArray(value) || !value.every(isSite)) {
    throw new TypeError(`Invalid generated site data in ${SITES_FILE}.`)
  }
  return value
}

function isSite(value: unknown): value is Site {
  if (!isRecord(value)) return false
  return (
    isString(value.name) &&
    isString(value.fullName) &&
    isString(value.description) &&
    isString(value.repoUrl) &&
    isString(value.siteUrl) &&
    typeof value.isPrivate === 'boolean' &&
    typeof value.isFork === 'boolean' &&
    typeof value.isTemplate === 'boolean' &&
    isStringArray(value.topics) &&
    Array.isArray(value.languages) &&
    value.languages.every(isLang) &&
    isFiniteNumber(value.stars) &&
    isFiniteNumber(value.forks) &&
    (value.contributors === null || isFiniteNumber(value.contributors)) &&
    isNullableString(value.createdAt) &&
    isNullableString(value.activityAt) &&
    isString(value.screenshot)
  )
}

function isLang(value: unknown): value is Site['languages'][number] {
  return isRecord(value) && isString(value.name) && isFiniteNumber(value.bytes)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasErrCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}
