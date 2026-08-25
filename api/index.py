import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from mangum import Mangum
from dotenv import load_dotenv

from agno.agent import Agent
from agno.models.groq import Groq
from agno.tools.github import GithubTools

# Safely load .env.local from project root
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

app = FastAPI()


class GenerateRequest(BaseModel):
    repo_url: str
    tone: Optional[str] = "Professional"
    include_badges: Optional[bool] = True
    badges_style: Optional[bool] = True
    sections: Optional[List[str]] = None


class GenerateResponse(BaseModel):
    status: str
    markdown_content: str


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.post("/api/generate-readme", response_model=GenerateResponse)
def generate_readme(req: GenerateRequest):
    if not req.repo_url.strip():
        raise HTTPException(status_code=400, detail="repo_url is required")

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY environment variable is missing. Check your .env.local file."
        )

    github_token = os.getenv("GITHUB_TOKEN")
    sections = req.sections or ["installation", "features", "techStack", "license"]

    tools = [GithubTools(access_token=github_token)] if github_token else [GithubTools()]

    agent = Agent(
        model=Groq(id="openai/gpt-oss-120b", api_key=groq_api_key),
        tools=tools,
        instructions=[
            f"Generate a {req.tone} README.md for the repository {req.repo_url}.",
            f"Include only these sections, in order: {', '.join(sections)}.",
            "Include shields.io badges at the top." if req.include_badges else "Do not include badges.",
            "Return raw Markdown only, no commentary.",
        ],
    )

    try:
        result = agent.run(f"Generate README for {req.repo_url}")
        markdown_content = result.content if hasattr(result, "content") else str(result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Generation failed: {exc}")

    return GenerateResponse(status="success", markdown_content=markdown_content)


handler = Mangum(app)