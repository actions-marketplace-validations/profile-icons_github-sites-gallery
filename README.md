# GitHub Sites Gallery

A searchable preview gallery of Pages and description-linked deployed sites for owned GitHub repositories.

# Instructions

Copy the workflow to `.github/workflows/deploy-sites-gallery.yml`:

```yml
name: deploy-sites-gallery

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update-pins:
    runs-on: ubuntu-latest
    steps:
      - uses: profile-icons/github-sites-gallery@v1
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
