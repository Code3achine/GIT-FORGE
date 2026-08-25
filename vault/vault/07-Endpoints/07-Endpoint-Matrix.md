---
tags: [api, endpoints]
---

# Endpoint Matrix

| Endpoint | Method | Input | Output | Details |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | None | `{"status": "healthy"}` | Liveness check; confirms serverless deploy state |
| `/api/generate-readme` | `POST` | `{"repo_url": "string"}` | `{"status": "success", "markdown_content": "..."}` | Parses input, runs Agno agent, returns Markdown string |

Back to [[04-Backend-Specifications]]
