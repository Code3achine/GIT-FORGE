---
tags: [architecture]
---

# System Architecture

```mermaid
flowchart TD
    A[Browser / Next.js UI - Vercel Frontend] -->|fetch('/api/generate-readme')| B[Next.js Rewrites / Vercel Serverless Function]
    B --> C[FastAPI api/index.py via Mangum]
    C --> D[Agno Agent]
    D --> E[GithubTools - PyGithub]
    E --> F[GitHub REST API]
    D --> G[Groq LLM: llama-3.3-70b-versatile]
    G --> H[In-memory Markdown string]
    H --> I[JSON response]
    I --> J[Rendered Preview + Download]
```

## Repository Directory Structure

```text
├── api/
│   ├── index.py           # FastAPI entrypoint for Vercel Serverless
│   └── requirements.txt   # Python dependencies
├── app/                   # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── .env.local             # Local development environment variables
├── next.config.mjs        # Next.js & local dev API rewrites
├── vercel.json            # Serverless function execution overrides
└── package.json           # Frontend packages
```

Related: [[04-Backend-Specifications]], [[05-Frontend-Specifications]]
