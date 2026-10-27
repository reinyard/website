<p align="center">
  <a href="https://reinyard.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="src/assets/logo-dark.svg">
      <img src="src/assets/logo-light.svg" alt="Reinyard" width="72" height="72">
    </picture>
  </a>
</p>

<h1 align="center">Reinyard website</h1>

<p align="center">
  The source of <a href="https://reinyard.com">reinyard.com</a>: the landing page, the About page and the documentation.
</p>

<p align="center">
  <a href="https://reinyard.com">Website</a> ·
  <a href="https://reinyard.com/docs/">Documentation</a> ·
  <a href="https://reinyard.com/about/">About</a>
</p>

---

**Reinyard** is a controlled place for agents to work: build, version and run agents and automations in isolated
sandboxes, with every change in Git and every run on record.

> [!NOTE]
> This repository contains **only the public website and its documentation**. The Reinyard application, and
> everything behind the login, lives elsewhere.

## What's here

| Route | Source |
| --- | --- |
| `/` | `src/pages/index.astro`, composed from `src/components/` |
| `/about/` | `src/pages/about.astro` |
| `/docs/…` | Markdown in `src/content/docs/docs/`, rendered by [Starlight](https://starlight.astro.build) |
| `/licenses/` | `src/pages/licenses.astro` (reads the notices from the installed packages at build time) |

The site is fully static. It is built to `dist/` and served by a Cloudflare Worker using
[static assets](https://developers.cloudflare.com/workers/static-assets/), with no server-side code.

**Built with** [Astro](https://astro.build) and [Starlight](https://starlight.astro.build), [TypeScript](https://www.typescriptlang.org),
and [Bun](https://bun.sh). Fonts are [IBM Plex](https://www.ibm.com/plex/) Sans and Mono, self-hosted. There are light
and dark themes, and the hero animation is a small canvas script with no animation library.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) **22.23.4 or newer** (required by Astro 7 and Wrangler)
- [Bun](https://bun.sh) 1.3 or newer, used as the package manager

### Install

```sh
bun install
```

### Develop

```sh
bun run dev
```

Opens a dev server at <http://localhost:4321> with hot reloading.

### Build and preview

```sh
bun run build     # writes the static site to dist/
bun run preview   # serves dist/ on the Cloudflare Workers runtime (wrangler dev)
```

`preview` is the one to trust before deploying: it applies the same headers, trailing-slash handling and 404 page as production.
Run `build` first, since it serves what is in `dist/`.

### Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Astro dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve `dist/` with Wrangler |
| `bun run check` | Type-check the Astro and TypeScript sources |

## Project structure

```text
.
├── public/               Static files served as-is: icon, robots.txt, _headers, team photos
├── src/
│   ├── assets/           Logo files
│   ├── components/       Landing sections, navigation, footer, and the docs header and footer
│   ├── content/docs/     The documentation, in Markdown
│   ├── content.config.ts Content collections (Starlight's docs and UI strings)
│   ├── layouts/          Base page layout, theme bootstrapping and meta tags
│   ├── pages/            Landing, About, Licenses and the 404 page
│   ├── scripts/hero/     The hero canvas animation
│   └── styles/           Design tokens, global styles, Starlight theme, self-hosted fonts
├── astro.config.mjs      Astro and Starlight configuration, including the docs sidebar
├── wrangler.jsonc        Cloudflare Worker configuration (static assets only)
└── LICENSE               All rights reserved; third-party components keep their own licenses
```

## Writing documentation

Docs are Markdown files under `src/content/docs/docs/`. Each needs a `title` and a `description` in its frontmatter:

```md
---
title: Sandboxes
description: How pipelines run in isolation.
---
```

The sidebar is listed explicitly in `astro.config.mjs`, so add a new page there as well. Describe the product as it is
today, and mark anything that is planned as planned.

## Design system

All colors, type and radii are tokens in `src/styles/tokens.css`, defined for both themes. The site and the docs read the
same tokens, and the theme (System, Light or Dark) is stored under one key, so a choice made on any page applies
everywhere.

## Deployment

The site is deployed as a Cloudflare Worker with static assets, configured in `wrangler.jsonc`:

```sh
bun run build
bunx wrangler deploy
```

This needs access to the Reinyard Cloudflare account. Security headers and cache rules live in `public/_headers`.

## Contributing

Spotted a typo or a mistake in the site or the docs? Please [open an issue](https://github.com/reinyard/website/issues).
Pull requests that fix errors are welcome; for anything larger, open an issue first so we can agree on it.

## Security

Please report vulnerabilities privately to [security@reinyard.com](mailto:security@reinyard.com) instead of opening a
public issue.

## License

The source is public so that the site is transparent and easy to correct. It is **not** released under an open-source
license: © 2026 Reinyard. All rights reserved. The Reinyard name, logo, copy, illustrations and photographs are not
licensed for reuse.

Third-party components keep their own licenses: IBM Plex is under the
[SIL Open Font License 1.1](https://openfontlicense.org) (the notice is in `src/styles/fonts/IBM-Plex-OFL.txt`), and
Astro, Starlight, Expressive Code and Pagefind are MIT. The full notices are on the
[licenses page](https://reinyard.com/licenses/). GitHub and the GitHub mark are trademarks of
GitHub, Inc., and the mark is used here only to link to our GitHub organization.
