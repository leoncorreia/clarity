# Clarity Production Deployment (Render)

This project is configured for production with:

- SpatialReal (client-side credentials)
- Bodhi Agent (direct client or backend proxy)
- Lovable UI layer
- Render hosting/runtime

## 1) What you need to provide

### Frontend secrets and config

- `VITE_SPATIALREAL_APP_ID`
- `VITE_SPATIALREAL_API_KEY`
- `VITE_USE_REAL_BODHI=true`
- `VITE_BODHI_AGENT_ID`
- `VITE_BODHI_API_KEY` (only needed if calling Bodhi directly from browser)
- `VITE_BODHI_BASE_URL=https://api.bodhiagent.live`
- `VITE_RENDER_DEPLOYMENT=true`
- `VITE_API_BASE_URL`:
  - use your backend root URL (`https://<backend-domain>`), or
  - use `/api` only when reverse proxying backend under same domain.

### Backend secret

- `BODHI_API_KEY` (used by `POST /bodhi/session`; optional for future proxy-to-Bodhi flow)

## 2) Render services

Create two services (or use `render.yaml` blueprint):

1. `clarity-backend` (Web Service)
   - Build Command: `npm ci`
   - Start Command: `npm run server`
   - Health Check Path: `/health`

2. `clarity-frontend` (Static Site)
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`

## 3) Set frontend API mode

Choose one mode:

- **Backend proxy mode (recommended)**  
  `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`

- **Direct Bodhi mode**  
  Leave `VITE_API_BASE_URL` empty and set Bodhi vars.

## 4) Local run

Backend:

```bash
npm run server
```

Frontend:

```bash
npm run dev
```

Local dev proxy is configured in `vite.config.ts` for `/api -> http://localhost:8787`.
