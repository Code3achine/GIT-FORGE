# Quickstart

AI-Powered README Generator — Next.js 14 frontend + FastAPI backend, single Vercel deploy.

## Prerequisites

- Node.js 18+
- Python 3.11+
- A [Groq API key](https://console.groq.com)
- A [GitHub Personal Access Token](https://github.com/settings/tokens) (for rate-limit protection)

## 1. Install dependencies

```bash
npm install
pip install -r api/requirements.txt --break-system-packages
```

## 2. Set environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
GROQ_API_KEY=your_groq_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
```

## 3. Run locally (two terminals)

**Terminal 1 — backend:**

```bash
python -m uvicorn api.index:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In dev, `next.config.mjs` rewrites `/api/*` to `http://127.0.0.1:8000/api/*`, so no CORS setup needed.

## 4. Verify backend health

```bash
curl http://localhost:8000/api/health
# {"status": "healthy"}
```

## 5. Generate a README

In the UI: enter a repo as `owner/repo` (e.g. `vercel/next.js`), pick a tone, toggle badges/sections, click **Generate**.

Or directly via API:

```bash
curl -X POST http://localhost:8000/api/generate-readme \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "vercel/next.js"}'
```

## 6. Deploy to Vercel

```bash
vercel
```

Vercel auto-detects the Next.js frontend and the Python serverless function at `api/index.py`. Add the same environment variables (`GROQ_API_KEY`, `GITHUB_TOKEN`) in **Project Settings → Environment Variables** on the Vercel dashboard before deploying to production.

```bash
vercel --prod
```

## Project structure

```text
├── api/
│   ├── index.py           # FastAPI entrypoint (Mangum handler)
│   └── requirements.txt
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # Two-pane config + preview UI
│   └── globals.css
├── .env.local.example
├── next.config.mjs         # Dev/prod API rewrites
├── vercel.json             # maxDuration + rewrites
└── package.json
```

## Troubleshooting

| Issue | Fix |
| :--- | :--- |
| `GROQ_API_KEY` missing error | Confirm `.env.local` exists and backend was restarted after editing it |
| GitHub rate-limit errors | Set `GITHUB_TOKEN`; unauthenticated requests are capped much lower |
| 504 / timeout on generate | LLM inference can be slow on first call; `vercel.json` sets `maxDuration: 60` — raise if still timing out on Vercel |
| CORS errors in dev | Make sure you're hitting `localhost:3000`, not `:8000`, directly — rewrites only apply through the frontend |
