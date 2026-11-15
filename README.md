# GitHub Sites Gallery

Preview gallery of sites deployed from or linked to public/private user/organization repositories using SvelteKit. 

Filter by:

* languages
* topics

Sort by (most/least):

* stars
* forks
* traffic
* languages (used)
* contributor count
* activity
* created

# Instructions

Copy the workflow to `.github/workflows/deploy-sites-gallery.yml`:

```yml
name: deploy-sites-gallery

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  gallery:
    runs-on: ubuntu-latest

    environment:
      name: github-pages
      url: ${{ steps.gallery.outputs.page-url }}

    steps:
      - name: Deploy
        id: gallery
        uses: profile-icons/github-sites-gallery@main
        with:
          gh_usernames: ${{ secrets.GH_USERNAMES }}  # optional, eg: 'username,orgA,orgB,...'
          gh_pat: ${{ secrets.GH_PAT }}  # optional: Personal Access Token (PAT) - for org/private repo, traffic auth..
```

## Install

```bash
npm ci
npx playwright install --with-deps chromium
```

## Run

```bash
npm run dev:data
```

## Build

```bash
npm run build:data
npm run preview
```

## Contribute

Before making a Pull Request, ensure it addresses an Issue, and verify:

```bash
npm run verify:fix
```
