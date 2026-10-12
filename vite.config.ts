import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

type BasePath = '' | `/${string}`

function getBasePath(val: string | undefined): BasePath {
  const path = (val ?? '').trim().replace(/^\/+|\/+$/g, '')

  return path ? `/${path}` : ''
}

const base = getBasePath(process.env.BASE_PATH)

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({
        pages: 'build',
        assets: 'build',
        precompress: false,
        strict: true,
      }),
      paths: { base },
    }),
  ],
})
