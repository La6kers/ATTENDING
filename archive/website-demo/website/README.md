# ATTENDING AI — Public Website

Marketing landing page for [attendingai.health](https://attendingai.health).
Built with Vite + React. Deployed via Azure Static Web Apps.

## Local Development

```bash
cd apps/website
npm install
npm run dev        # → http://localhost:5173
npm run build      # → outputs to dist/
npm run preview    # → preview production build
```

## Deployment

Deploys automatically when changes to `apps/website/**` are pushed to `main`.
See `.github/workflows/deploy-website.yml`.

### First-Time Azure Setup

1. Create Azure Static Web App (Free tier):
   ```bash
   az staticwebapp create \
     --name attendingai-landing \
     --resource-group attending-rg \
     --source https://github.com/YOUR_ORG/ATTENDING \
     --branch main \
     --app-location "apps/website" \
     --output-location "dist"
   ```

2. Get the deployment token:
   ```bash
   az staticwebapp secrets list --name attendingai-landing --resource-group attending-rg
   ```

3. Add `AZURE_STATIC_WEB_APPS_API_TOKEN` to GitHub repo secrets.

4. Connect custom domain (`attendingai.health`) in Azure Portal → Static Web App → Custom domains.

## Structure

```
apps/website/
├── public/favicon.svg              ← Browser tab icon
├── src/
│   ├── main.jsx                    ← React entry point
│   └── AttendingAILanding.jsx      ← Landing page component
├── index.html                      ← HTML shell + SEO meta
├── staticwebapp.config.json        ← Routing + security headers
├── vite.config.js
└── package.json
```
