---
tags: [deployment, config]
---

# Deployment & Configuration Setup

## Vercel Function Overrides (`vercel.json`)
Bumps default serverless fn timeouts for LLM inference latency.

```json
{
  "functions": {
    "api/index.py": {
      "maxDuration": 60
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "api/index.py"
    }
  ]
}
```

## Next.js Routing Config (`next.config.mjs`)
Points API calls to local FastAPI in dev, native Vercel fns in prod.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:8000/api/:path*"
          : "/api/",
      },
    ];
  },
};

export default nextConfig;
```

## Environment Variables (Vercel Dashboard)
- `GROQ_API_KEY` — Groq API auth key
- `GITHUB_TOKEN` — GitHub PAT, rate-limit protection

Back to [[02-System-Architecture]]
