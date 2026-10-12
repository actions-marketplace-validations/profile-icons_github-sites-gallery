# GitHub Sites Gallery

A searchable preview gallery of Pages and description-linked deployed sites for owned GitHub repositories.

An example site is [found here](https://profile-icons.github.io/github-sites-gallery/).

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
        uses: profile-icons/github-sites-gallery@v1
        with:
          gh_usernames: ${{ secrets.GH_USERNAMES }}  # optional, eg: 'username,orgA,orgB,...'
          gh_pat: ${{ secrets.GH_PAT }}  # optional: Personal Access Token (PAT)
```

# Contribute

Before making a Pull Request, ensure it addresses an Issue, and verify the branch passes:

```bash
npm run verify:fix
```

## Install

```bash
npm ci
npx playwright install --with-deps chromium
```

## Run

```bash
npm run dev:all
```

## Build

```bash
npm run build:all
npm run preview
```
