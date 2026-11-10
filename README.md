# personal-website

Rudy's personal site: a static site built with [Eleventy](https://www.11ty.dev/) and served by Cloudflare Workers static assets.

```sh
npm install
npm run dev      # local preview with live reload
npm run deploy   # build and publish to rudybanerjee.com
npm run deploy:preview # build and publish to the shared staging Worker
```

## Automatic deployments

GitHub Actions builds PRs targeting `main` and deploys same-repository PRs to
https://personal-website-preview.rudybdev.workers.dev/#writing. This is a shared
staging site: the latest PR deployment replaces the previous one. Fork PRs only
build and do not receive deployment credentials. The preview configuration uses
a separate Worker with no production custom domains.

Every push to `main`, including a merged PR, builds and deploys the production
Worker serving both https://rudybanerjee.com and https://www.rudybanerjee.com.
Deployments to each Worker are serialized, and successful runs include the site
link in the Actions job summary.

Before deployments can run, add these **repository secrets** under GitHub
Settings → Secrets and variables → Actions:

- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account containing the Workers.
- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token using the **Edit Cloudflare
  Workers** template, restricted to that account and the `rudybanerjee.com` zone
  for production custom domains. Use an API token rather than a local Wrangler
  OAuth login, which cannot authenticate GitHub Actions.

See [Cloudflare's GitHub Actions setup](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
for token configuration. Missing credentials cause the deployment step to fail
with a setup message. Once the secrets are saved, rerun the failed Actions run.
No manual Worker creation is needed: Wrangler creates the preview Worker on its
first deployment. Keep any Cloudflare dashboard Git integration disabled for
these Workers so it does not duplicate the Actions deployments.

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
