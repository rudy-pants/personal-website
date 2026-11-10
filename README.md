# personal-website

Rudy's personal site: a static site built with [Eleventy](https://www.11ty.dev/) and served by Cloudflare Workers static assets.

```sh
npm install
npm run dev      # local preview with live reload
npm run deploy   # build and publish to rudybanerjee.com
```

## Adding a post

Create a Markdown file in `content/posts/`. The filename becomes the URL.

```markdown
---
title: Notes on building slowly
date: 2026-10-14
description: Optional one-line summary, shown under the title and in link previews.
---

Your post, in plain Markdown.
```

The home page list, the post's page and the RSS feed update automatically. Add `draft: true` to see a post in `npm run dev` without publishing it. Put images in `src/static/` and link to them as `/your-image.jpg`.

## Where things live

| Path | What it is | Touch it when |
|---|---|---|
| `content/posts/` | Blog posts | Writing |
| `content/data/site.json` | Greeting, About text, links, menu, footer | Changing site text |
| `src/pages/`, `src/templates/` | Page HTML | Changing page structure |
| `src/styles/site.css` | Page styles | Changing type, spacing, colours of text |
| `src/sky/settings.js` | Horizon height, animation timing, sharpness | Tuning the sky |
| `src/sky/shader.js` | How the sky is drawn | Changing the look of the sky |
| `src/sky/index.js`, `renderer.js` | Opening, scrolling, climb between pages | Rarely |

Content never needs to know about the sky. The sky only finds the page through a few attributes described at the top of `src/sky/index.js`, so keep those in the templates.
