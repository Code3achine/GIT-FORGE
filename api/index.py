"""
AI-Powered README Generator — Backend
FastAPI + Agno (Groq model) + GithubTools, deployed as a Vercel serverless
function via Mangum. No local file I/O — README content is generated and
returned in-memory only.
"""

import os
import re
import logging
from typing import List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from mangum import Mangum
from dotenv import load_dotenv

from agno.agent import Agent
from agno.models.groq import Groq
from agno.tools.github import GithubTools

from github import GithubException, UnknownObjectException, RateLimitExceededException

# Load environment variables from .env.local (and fall back to .env)
load_dotenv(".env.local")
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("readme-generator")

app = FastAPI(title="README Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    repo_url: str
    tone: Optional[str] = "Professional"
    include_badges: Optional[bool] = True
    badges_style: Optional[bool] = True
    sections: Optional[List[str]] = None

    @field_validator("repo_url")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("repo_url must not be empty")
        return v.strip()


class GenerateResponse(BaseModel):
    status: str
    markdown_content: str


class ErrorResponse(BaseModel):
    status: str
    error: str
    detail: Optional[str] = None


# ---------------------------------------------------------------------------
# Repo URL parsing
# ---------------------------------------------------------------------------

REPO_PATTERNS = [
    re.compile(r"^(?:https?://)?(?:www\.)?github\.com/([^/\s]+)/([^/\s#?]+?)(?:\.git)?/?$"),
    re.compile(r"^git@github\.com:([^/\s]+)/([^/\s#?]+?)(?:\.git)?/?$"),
    re.compile(r"^([^/\s]+)/([^/\s#?]+?)(?:\.git)?/?$"),
]


def parse_owner_repo(raw: str) -> tuple[str, str]:
    """Parse a GitHub URL or owner/repo shorthand. Raises ValueError if malformed."""
    candidate = raw.strip()
    for pattern in REPO_PATTERNS:
        match = pattern.match(candidate)
        if match:
            owner, repo = match.group(1), match.group(2)
            if owner and repo:
                return owner, repo
    raise ValueError(
        "Could not parse repository. Use 'owner/repo' or a full GitHub URL."
    )


# ---------------------------------------------------------------------------
# Agent instructions
# ---------------------------------------------------------------------------

SECTION_GUIDANCE = {
    "features": "a Features section",
    "installation": "a detailed Installation section (see Step 4 below)",
    "techstack": "a Tech Stack section summarizing the primary languages and frameworks",
    "license": "a License section if license info is available",
}

SECTION_ORDER = ["features", "installation", "techstack", "license"]

INSTALLATION_DETAIL = (
    "Step 4: For the Installation section specifically, write out the full setup process as "
    "numbered, copy-pasteable steps under their own subheadings (###), in this order: "
    "(0) Prerequisites — a bulleted list of required tools/runtimes and their minimum versions, "
    "inferred from the repository's primary language (e.g. Node.js 18+ for JS/TS projects, "
    "Python 3.10+ for Python projects, Go 1.21+ for Go, etc.), plus Git; "
    "(1) Clone the repository — a fenced shell code block with `git clone <repo-url>` followed by "
    "`cd <repo-name>`; "
    "(2) Install dependencies — a fenced shell code block with the correct install command for the "
    "detected language/tech stack from Step 3 (e.g. `npm install` or `yarn install` for "
    "Node/JavaScript/TypeScript projects, `pip install -r requirements.txt` for Python projects, "
    "`bundle install` for Ruby, `go mod download` for Go, etc.) — pick the command that matches what "
    "`get_repository_languages` returned; "
    "(3) Configure environment variables — if a `.env.example`, `.env.sample`, config file, or "
    "documented required variable is discoverable from the repository metadata or README contents, "
    "show a fenced shell block copying it (e.g. `cp .env.example .env`) followed by a fenced `env` "
    "block listing the variable names that need to be filled in; skip this numbered step entirely if "
    "no environment configuration is discoverable — do not invent variable names; "
    "(4) Run the project — a fenced shell code block with the appropriate start/run command for that "
    "stack (e.g. `npm run dev` or `npm start`, `python app.py`, `python manage.py runserver`, "
    "`docker compose up`, etc.), inferred from the repository's language and structure, followed by a "
    "one-line note on what URL or output to expect (e.g. `http://localhost:3000`) if that can be "
    "reasonably inferred; "
    "(5) Verify it's working — a short fenced shell code block showing a simple sanity check "
    "appropriate to the project type (e.g. a `curl` against a health/status endpoint if one exists, "
    "running the test suite, or opening the app in a browser) — omit this step if no reasonable check "
    "can be inferred rather than inventing one. "
    "Every numbered step must have its own subheading and its own code block — do not collapse them "
    "into a single block or a single paragraph, and do not fabricate details (env var names, ports, "
    "endpoints) that aren't reasonably inferable from the fetched repository data."
)


def build_instructions(req: GenerateRequest) -> List[str]:
    section_keys = {
        s.lower() for s in (req.sections or ["installation", "features", "techstack", "license"])
    }

    section_phrases = [SECTION_GUIDANCE[k] for k in SECTION_ORDER if k in section_keys]
    sections_clause = ", ".join(section_phrases) if section_phrases else "no additional sections beyond the title and description"

    show_badges = bool(req.include_badges and req.badges_style)
    badges_clause = "relevant shields.io badges (license, stars, primary language), " if show_badges else ""

    instructions = [
        "You are an expert technical writer generating a professional README.md file.",
        "Step 1: Extract the repository owner and name from the user's message.",
        "Step 2: Call the `get_repository` tool to fetch repository metadata "
        "(description, stars, license, topics, default branch, etc.).",
        "Step 3: Call the `get_repository_languages` tool to understand the tech stack, "
        "but use this ONLY to inform your wording (e.g. badges, install instructions). "
        "Do NOT include a separate 'Languages Used' or 'Languages' section in the README.",
    ]

    if "installation" in section_keys:
        instructions.append(INSTALLATION_DETAIL)

    instructions.append(
        f"Step 5: Write in a {req.tone or 'Professional'} tone throughout. Draft a complete, "
        f"well-structured README.md in Markdown with these sections: a title, a concise "
        f"description/tagline, {badges_clause}{sections_clause}."
    )
    instructions.append(
        "Use proper Markdown syntax: headings, fenced code blocks with language hints, and lists."
    )
    instructions.append(
        "Return ONLY the final Markdown content. Do not wrap it in an explanation, do not add "
        "commentary before or after, and do not wrap the whole output in a single Markdown "
        "code fence."
    )
    return instructions


def build_agent(req: GenerateRequest) -> Agent:
    groq_api_key = os.getenv("GROQ_API_KEY")
    github_token = os.getenv("GITHUB_TOKEN")

    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    github_tools = GithubTools(access_token=github_token) if github_token else GithubTools()

    return Agent(
        model=Groq(id="openai/gpt-oss-120b", api_key=groq_api_key),
        tools=[github_tools],
        instructions=build_instructions(req),
        markdown=True,
    )


def extract_text(run_response) -> str:
    """Pull plain text content out of an Agno RunResponse."""
    content = getattr(run_response, "content", None)
    if isinstance(content, str) and content.strip():
        return content.strip()
    return str(run_response).strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    """Liveness probe. Used by frontend for silent cold-start warm-up."""
    return {"status": "healthy"}


@app.post(
    "/api/generate-readme",
    response_model=GenerateResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def generate_readme(payload: GenerateRequest):
    try:
        owner, repo = parse_owner_repo(payload.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    repo_full_name = f"{owner}/{repo}"

    try:
        agent = build_agent(payload)
    except RuntimeError as e:
        logger.error("Agent configuration error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration. Please contact the administrator.",
        )

    try:
        run_response = agent.run(
            f"Generate a professional README.md for the GitHub repository '{repo_full_name}'."
        )
        markdown_content = extract_text(run_response)

        if not markdown_content:
            raise ValueError("Agent returned empty content")

        return GenerateResponse(status="success", markdown_content=markdown_content)

    except UnknownObjectException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository '{repo_full_name}' was not found. Check the owner/repo and try again.",
        )

    except RateLimitExceededException:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GitHub API rate limit exceeded. Please wait a bit and try again.",
        )

    except GithubException as e:
        if e.status == 403 and "rate limit" in str(e.data).lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="GitHub API rate limit exceeded. Please wait a bit and try again.",
            )
        if e.status == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Repository '{repo_full_name}' was not found.",
            )
        logger.error("GitHub API error for %s: %s", repo_full_name, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error communicating with GitHub.",
        )

    except Exception as e:
        msg = str(e).lower()
        if "rate limit" in msg or "429" in msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Upstream rate limit exceeded (GitHub or Groq). Please try again shortly.",
            )
        logger.exception("Unexpected error generating README for %s", repo_full_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong while generating the README. Please try again.",
        )


handler = Mangum(app)