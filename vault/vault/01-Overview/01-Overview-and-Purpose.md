---
tags: [overview]
---

# Overview & Purpose

Spec for deploying AI-Powered README Generator fully on Vercel, single full-stack monorepo. System takes repo URL or owner/repo id, pulls metadata via PyGithub, builds structured Markdown docs via Agno LLM agent.

## Key Architecture Shifts

- **Unified Hosting** — Next.js 14 frontend + FastAPI backend, one repo, one Vercel deploy.
- **Serverless Execution** — FastAPI runs as serverless fn entrypoint at `api/index.py` via `mangum` or Vercel Python runtime wrapper.
- **Same-Origin API Routing** — Rewrites send frontend `/api/*` calls straight to serverless Python handlers, no CORS in prod.

See also: [[02-System-Architecture]], [[06-Deployment-and-Configuration]]
