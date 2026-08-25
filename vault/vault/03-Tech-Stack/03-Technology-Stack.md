---
tags: [stack]
---

# Technology Stack

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| Monorepo / Host | Vercel | Single deploy target, frontend + serverless Python API |
| Backend Framework | Python 3.11+, FastAPI | AWS Lambda / Vercel Serverless entrypoint via `mangum` |
| Agent Orchestration | Agno Framework | `agno.agent.Agent`, `agno.models.groq.Groq`, `agno.tools.github.GithubTools` |
| GitHub Integration | PyGithub + GithubTools | Repo metadata extraction & language analytics |
| LLM Engine | Groq API — `llama-3.3-70b-versatile` | Low-latency synthesis |
| Frontend Framework | Next.js 14+ (App Router), TypeScript | Single-page App Router architecture |
| Styling / UI | Tailwind CSS, Lucide React | Modern dark/light UI |
| Markdown Rendering | `react-markdown`, `react-syntax-highlighter` | Live rendering preview |

See: [[04-Backend-Specifications]] for backend deps list.
