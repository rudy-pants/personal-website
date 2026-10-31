# personal-website

Static personal site served by [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/) on the free plan. No build step; everything in `public/` is deployed as-is.

```sh
npm install
npm run dev      # local preview at http://localhost:8787
npm run deploy   # publish to <name>.<subdomain>.workers.dev
```
