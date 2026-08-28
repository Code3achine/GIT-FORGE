"use client";

import { useState } from "react";
import {
  Sun,
  Moon,
  Sparkles,
  Copy,
  Download,
  Maximize2,
  Eye,
  Code2,
  Link2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type Tone = "Professional" | "Technical" | "Friendly";

const TONES: Tone[] = ["Professional", "Technical", "Friendly"];

const DEFAULT_SECTIONS = [
  { key: "installation", label: "Installation", checked: true },
  { key: "features", label: "Features", checked: true },
  { key: "techStack", label: "Tech Stack", checked: true },
  { key: "license", label: "License", checked: true },
];

function parseOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  const repo = parts.pop() || "project";
  const owner = parts.pop() || "owner";
  return { owner, repo };
}

type StackInfo = {
  prereqs: string[];
  install: string[];
  installLang: string;
  run: string[];
  runLang: string;
  runNote?: string;
  verify?: string[];
  verifyLang?: string;
  envHint?: boolean;
};

// Detects the tech stack for a repo by checking root-level manifest files via
// the GitHub REST API (unauthenticated, public repos only — no token needed
// for this lightweight lookup). Falls back to `null` on any failure so callers
// can degrade gracefully instead of guessing wrong.
async function detectStack(owner: string, repo: string): Promise<StackInfo | null> {
  try {
    const [repoRes, contentsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents`),
    ]);
    if (!contentsRes.ok) return null;

    const contents: Array<{ name: string }> = await contentsRes.json();
    const files = new Set(contents.map((f) => f.name.toLowerCase()));
    const language: string | null = repoRes.ok ? (await repoRes.json()).language : null;

    const has = (name: string) => files.has(name.toLowerCase());

    // --- Node / JavaScript / TypeScript ---
    if (has("package.json")) {
      let pkgManager = "npm";
      let installCmd = "npm install";
      let runCmd = "npm run dev";
      if (has("pnpm-lock.yaml")) {
        pkgManager = "pnpm";
        installCmd = "pnpm install";
        runCmd = "pnpm dev";
      } else if (has("yarn.lock")) {
        pkgManager = "yarn";
        installCmd = "yarn install";
        runCmd = "yarn dev";
      }

      // Try to read actual scripts to pick the right run command.
      try {
        const pkgRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`
        );
        if (pkgRes.ok) {
          const pkgJson = await pkgRes.json();
          const scripts = pkgJson.scripts || {};
          const script = scripts.dev
            ? "dev"
            : scripts.start
            ? "start"
            : scripts.serve
            ? "serve"
            : null;
          if (script) {
            runCmd = pkgManager === "npm" ? `npm run ${script}` : `${pkgManager} ${script}`;
          }
        }
      } catch {
        // keep the lockfile-based guess
      }

      return {
        prereqs: ["[Node.js](https://nodejs.org) 18 or higher", "[Git](https://git-scm.com)"],
        install: [installCmd],
        installLang: "bash",
        run: [runCmd],
        runLang: "bash",
        runNote: "Open [http://localhost:3000](http://localhost:3000) once it's running.",
        verify: ["curl http://localhost:3000/api/health", '# {"status": "healthy"}'],
        verifyLang: "bash",
        envHint: has(".env.example") || has(".env.sample"),
      };
    }

    // --- Python (Django) ---
    if (has("manage.py")) {
      return {
        prereqs: ["[Python](https://python.org) 3.10 or higher", "[Git](https://git-scm.com)"],
        install: [
          "python -m venv venv",
          "source venv/bin/activate  # Windows: venv\\Scripts\\activate",
          has("requirements.txt") ? "pip install -r requirements.txt" : "pip install -e .",
        ],
        installLang: "bash",
        run: ["python manage.py migrate", "python manage.py runserver"],
        runLang: "bash",
        runNote: "Open [http://localhost:8000](http://localhost:8000) once it's running.",
        verify: ["curl http://localhost:8000"],
        verifyLang: "bash",
        envHint: has(".env.example") || has(".env.sample"),
      };
    }

    // --- Python (generic / Flask / FastAPI / scripts) ---
    if (has("requirements.txt") || has("pyproject.toml")) {
      const usesPoetry = has("poetry.lock");
      const entry = has("app.py") ? "app.py" : has("main.py") ? "main.py" : null;
      return {
        prereqs: ["[Python](https://python.org) 3.10 or higher", "[Git](https://git-scm.com)"],
        install: usesPoetry
          ? ["poetry install"]
          : [
              "python -m venv venv",
              "source venv/bin/activate  # Windows: venv\\Scripts\\activate",
              has("requirements.txt") ? "pip install -r requirements.txt" : "pip install -e .",
            ],
        installLang: "bash",
        run: [
          usesPoetry
            ? `poetry run python ${entry ?? "main.py"}`
            : `python ${entry ?? "main.py"}`,
        ],
        runLang: "bash",
        envHint: has(".env.example") || has(".env.sample"),
      };
    }

    // --- Ruby ---
    if (has("gemfile")) {
      const isRails = has("config.ru") || has("rakefile");
      return {
        prereqs: ["[Ruby](https://www.ruby-lang.org) 3.0 or higher", "[Bundler](https://bundler.io)", "[Git](https://git-scm.com)"],
        install: ["bundle install"],
        installLang: "bash",
        run: [isRails ? "bin/rails server" : "bundle exec ruby app.rb"],
        runLang: "bash",
        envHint: has(".env.example"),
      };
    }

    // --- Go ---
    if (has("go.mod")) {
      return {
        prereqs: ["[Go](https://go.dev) 1.21 or higher", "[Git](https://git-scm.com)"],
        install: ["go mod download"],
        installLang: "bash",
        run: ["go run ."],
        runLang: "bash",
      };
    }

    // --- Rust ---
    if (has("cargo.toml")) {
      return {
        prereqs: ["[Rust](https://www.rust-lang.org) (via rustup)", "[Git](https://git-scm.com)"],
        install: ["cargo build"],
        installLang: "bash",
        run: ["cargo run"],
        runLang: "bash",
      };
    }

    // --- Java (Maven) ---
    if (has("pom.xml")) {
      return {
        prereqs: ["[Java JDK](https://adoptium.net) 17 or higher", "[Maven](https://maven.apache.org)", "[Git](https://git-scm.com)"],
        install: ["mvn clean install"],
        installLang: "bash",
        run: ["mvn spring-boot:run", "# or: java -jar target/*.jar"],
        runLang: "bash",
      };
    }

    // --- Java / Kotlin (Gradle) ---
    if (has("build.gradle") || has("build.gradle.kts")) {
      return {
        prereqs: ["[Java JDK](https://adoptium.net) 17 or higher", "[Git](https://git-scm.com)"],
        install: ["./gradlew build"],
        installLang: "bash",
        run: ["./gradlew bootRun"],
        runLang: "bash",
      };
    }

    // --- PHP ---
    if (has("composer.json")) {
      const isLaravel = has("artisan");
      return {
        prereqs: ["[PHP](https://php.net) 8.1 or higher", "[Composer](https://getcomposer.org)", "[Git](https://git-scm.com)"],
        install: ["composer install"],
        installLang: "bash",
        run: [isLaravel ? "php artisan serve" : "php -S localhost:8000"],
        runLang: "bash",
        runNote: "Open [http://localhost:8000](http://localhost:8000) once it's running.",
        envHint: has(".env.example"),
      };
    }

    // --- Docker fallback ---
    if (has("dockerfile")) {
      return {
        prereqs: ["[Docker](https://www.docker.com)", "[Git](https://git-scm.com)"],
        install: [`docker build -t ${repo} .`],
        installLang: "bash",
        run: [`docker run -p 8080:8080 ${repo}`],
        runLang: "bash",
      };
    }

    // --- Nothing recognized: honest generic fallback, no invented commands ---
    return {
      prereqs: [
        language
          ? `A working ${language} development environment`
          : "The language/runtime this project is built with",
        "[Git](https://git-scm.com)",
      ],
      install: ["# Install this project's dependencies using its language's standard package manager"],
      installLang: "bash",
      run: ["# Refer to the project's own documentation for the exact run command"],
      runLang: "bash",
    };
  } catch {
    return null;
  }
}

function buildMarkdown({
  repoUrl,
  tone,
  includeBadges,
  sectionKeys,
  stack,
}: {
  repoUrl: string;
  tone: Tone;
  includeBadges: boolean;
  sectionKeys: string[];
  stack: StackInfo | null;
}) {
  const { owner, repo } = parseOwnerRepo(repoUrl);
  const pkgName = repo;

  const blurb: Record<Tone, string> = {
    Professional: `${pkgName} is a production-ready package maintained by ${owner}, built for reliability and ease of integration.`,
    Technical: `${pkgName} — a ${owner} project. Implementation details, APIs, and configuration are documented below.`,
    Friendly: `Hey! 👋 ${pkgName} is a fun little project from ${owner} — here's everything you need to get going.`,
  };

  const parts: string[] = [`# 🚀 ${pkgName}`, ""];

  if (includeBadges) {
    parts.push(
      `![build](https://img.shields.io/badge/build-passing-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue) ![version](https://img.shields.io/badge/version-1.0.0-informational)`,
      ""
    );
  }

  parts.push(blurb[tone], "");

  if (sectionKeys.includes("installation")) {
    const s = stack ?? {
      prereqs: ["[Git](https://git-scm.com)"],
      install: ["# Install this project's dependencies using its language's standard package manager"],
      installLang: "bash",
      run: ["# Refer to the project's own documentation for the exact run command"],
      runLang: "bash",
    };

    parts.push(
      "## 📦 Installation",
      "",
      "### ⚙️ Prerequisites",
      "",
      ...s.prereqs.map((p) => `- 🔹 ${p}`),
      "",
      "### 1. 📥 Clone the repository",
      "",
      "```bash",
      `git clone https://github.com/${owner}/${pkgName}.git`,
      `cd ${pkgName}`,
      "```",
      "",
      "### 2. 💻 Install dependencies",
      "",
      `\`\`\`${s.installLang}`,
      ...s.install,
      "```",
      ""
    );

    if (s.envHint) {
      parts.push(
        "### 3. 🔑 Configure environment variables",
        "",
        "Copy the example env file and fill in your own values:",
        "",
        "```bash",
        "cp .env.example .env",
        "```",
        ""
      );
    }

    const runStepNum = s.envHint ? 4 : 3;
    parts.push(
      `### ${runStepNum}. 🚀 Run the project`,
      "",
      `\`\`\`${s.runLang}`,
      ...s.run,
      "```",
      ""
    );
    if (s.runNote) parts.push(s.runNote, "");

    if (s.verify) {
      parts.push(
        `### ${runStepNum + 1}. ✅ Verify it's working`,
        "",
        `\`\`\`${s.verifyLang ?? "bash"}`,
        ...s.verify,
        "```",
        ""
      );
    }
  }

  if (sectionKeys.includes("features")) {
    parts.push(
      "## ✨ Features",
      "",
      `- ⚡ Fast, minimal setup for ${pkgName}`,
      "- 📖 Well-documented API surface",
      "- 🛠️ Actively maintained by " + owner,
      ""
    );
  }

  if (sectionKeys.includes("techStack")) {
    parts.push(
      "## 🛠️ Tech Stack",
      "",
      "- ⚡ TypeScript / JavaScript",
      "- 🟢 Node.js",
      "- ⚛️ React",
      ""
    );
  }

  if (sectionKeys.includes("license")) {
    parts.push(
      "## 📄 License",
      "",
      "This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).",
      ""
    );
  }

  return parts.join("\n");
}

export default function Page() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [includeBadges, setIncludeBadges] = useState(true);
  const [badgesToggle, setBadgesToggle] = useState(true);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [editTab, setEditTab] = useState<"raw" | "preview">("raw");
  const [markdown, setMarkdown] = useState("");
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, checked: !s.checked } : s))
    );
  }

  async function handleGenerate() {
    if (!repoUrl.trim()) return;
    setLoading(true);
    const sectionKeys = sections.filter((s) => s.checked).map((s) => s.key);
    try {
      const res = await fetch("/api/generate-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl,
          tone,
          include_badges: includeBadges,
          badges_toggle: badgesToggle,
          sections: sectionKeys,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.markdown_content) {
          setMarkdown(data.markdown_content);
        } else {
          const { owner, repo } = parseOwnerRepo(repoUrl);
          const stack = sectionKeys.includes("installation")
            ? await detectStack(owner, repo)
            : null;
          setMarkdown(buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys, stack }));
        }
        setConnected(true);
      } else {
        const { owner, repo } = parseOwnerRepo(repoUrl);
        const stack = sectionKeys.includes("installation")
          ? await detectStack(owner, repo)
          : null;
        setMarkdown(buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys, stack }));
        setConnected(false);
      }
    } catch {
      const { owner, repo } = parseOwnerRepo(repoUrl);
      const stack = sectionKeys.includes("installation")
        ? await detectStack(owner, repo)
        : null;
      setMarkdown(buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys, stack }));
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
  }

  const lines = markdown.split("\n");

  return (
    <div data-theme={dark ? "dark" : "light"}>
      <div
        className="min-h-screen flex flex-col transition-colors"
        style={{ background: "var(--bg-primary)", color: "var(--text-main)" }}
      >
        {/* HEADER */}
        <header
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--text-secondary)33",
          }}
        >
          <RobotLogo size={40} />
          <span className="text-lg font-bold tracking-tight">GIT-FORGE</span>
        </header>

        {/* CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 flex-1">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Project Configuration */}
            <section
              className="rounded-lg border p-5"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--text-secondary)33",
              }}
            >
              <h2 className="text-sm font-semibold mb-3">Project Configuration</h2>
              <label
                className="block text-xs mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerate();
                }}
                className="flex gap-2"
              >
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="https://github.com/username/repo"
                  className="flex-1 rounded-md border px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--text-secondary)4d",
                    color: "var(--text-main)",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap disabled:opacity-60"
                  style={{ background: "var(--action-primary)" }}
                >
                  <Sparkles size={14} />
                  {loading ? "Generating…" : "Generate"}
                </button>
              </form>
            </section>

            {/* Configuration */}
            <section
              className="rounded-lg border p-5"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--text-secondary)33",
              }}
            >
              <h2 className="text-sm font-semibold mb-4">Configuration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tone
                  </div>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as Tone)}
                    className="w-full rounded-md border px-2.5 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: "var(--text-secondary)4d",
                      color: "var(--text-main)",
                    }}
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Badges
                  </div>
                  <div className="space-y-2">
                    <ToggleRow label="Include Badges" checked={includeBadges} onChange={setIncludeBadges} />
                    <ToggleRow label="Show Shields" checked={badgesToggle} onChange={setBadgesToggle} />
                  </div>
                </div>

                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Sections
                  </div>
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <label key={s.key} className="flex items-center gap-2 text-xs cursor-pointer select-none h-6">
                        <input
                          type="checkbox"
                          checked={s.checked}
                          onChange={() => toggleSection(s.key)}
                          style={{ accentColor: "var(--action-primary)" }}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Edit View */}
            <section
              className="rounded-lg border p-5"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--text-secondary)33",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Edit View</h2>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: "var(--action-primary)22",
                      color: "var(--action-primary)",
                    }}
                  >
                    <Eye size={11} /> Optimal
                  </span>
                  <button className="rounded p-1" style={{ color: "var(--text-secondary)" }}>
                    <Maximize2 size={13} />
                  </button>
                </div>
              </div>

              <div
                className="inline-flex rounded-md border overflow-hidden mb-3"
                style={{ borderColor: "var(--text-secondary)4d" }}
              >
                <button
                  onClick={() => setEditTab("raw")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                  style={
                    editTab === "raw"
                      ? { background: "var(--action-primary)", color: "#fff" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  <Code2 size={12} /> Raw Markdown
                </button>
                <button
                  onClick={() => setEditTab("preview")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                  style={
                    editTab === "preview"
                      ? { background: "var(--action-primary)", color: "#fff" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  <Eye size={12} /> Preview
                </button>
              </div>

              {editTab === "raw" ? (
                <div
                  className="rounded-md border overflow-hidden"
                  style={{
                    borderColor: "var(--text-secondary)33",
                    background: "var(--bg-primary)",
                  }}
                >
                  <div className="flex max-h-72 overflow-y-auto">
                    <div
                      className="select-none px-3 py-2 text-right text-xs font-mono leading-6"
                      style={{ color: "var(--text-secondary)99" }}
                    >
                      {lines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                      placeholder="Click Generate to create your README…"
                      spellCheck={false}
                      className="flex-1 min-h-[18rem] resize-none overflow-hidden bg-transparent px-3 py-2 font-mono text-xs leading-6 outline-none"
                      style={{
                        color: "var(--text-main)",
                        height: `${Math.max(288, lines.length * 24 + 16)}px`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-md border p-4 max-h-72 overflow-y-auto"
                  style={{
                    borderColor: "var(--text-secondary)33",
                    background: "var(--bg-primary)",
                  }}
                >
                  <PreviewRender markdown={markdown} />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN — Preview */}
          <div
            className="rounded-lg border flex flex-col overflow-hidden"
            style={{
              background: "var(--bg-panel)",
              borderColor: "var(--text-secondary)33",
            }}
          >
            <div
              className="px-5 py-4 border-b shrink-0"
              style={{ borderColor: "var(--text-secondary)33" }}
            >
              <h2 className="text-sm font-semibold mb-3">README.md Preview</h2>
              <div className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
                Preview Actions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: "var(--text-secondary)4d" }}
                >
                  <Copy size={12} /> Copy Markdown
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: "var(--text-secondary)4d" }}
                >
                  <Download size={12} /> Download README.md
                </button>
                <div
                  className="ml-auto flex items-center gap-1 rounded-md border p-0.5"
                  style={{ borderColor: "var(--text-secondary)4d" }}
                >
                  <button onClick={() => setDark(false)} className="rounded p-1">
                    <Sun size={13} />
                  </button>
                  <button onClick={() => setDark(true)} className="rounded p-1">
                    <Moon size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-72 min-h-[18rem] px-6 py-5">
              {markdown ? (
                <PreviewRender markdown={markdown} />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-sm py-12"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Generate a README to see the preview.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER STATUS BAR */}
        <footer
          className="flex items-center justify-between border-t px-6 py-2 text-xs"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--text-secondary)33",
            color: "var(--text-secondary)",
          }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: connected ? "var(--action-primary)" : "#e53935" }}
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}

function RobotLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GIT-FORGE logo"
    >
      {/* antenna stalk */}
      <rect x="242" y="96" width="28" height="64" rx="6" fill="var(--action-primary)" />
      {/* antenna light */}
      <circle cx="256" cy="70" r="38" fill="var(--accent-heading)" stroke="var(--action-primary)" strokeWidth="18" />

      {/* left ear */}
      <rect x="8" y="248" width="64" height="128" rx="18" fill="var(--text-secondary)" stroke="var(--action-primary)" strokeWidth="18" />
      {/* right ear */}
      <rect x="440" y="248" width="64" height="128" rx="18" fill="var(--text-secondary)" stroke="var(--action-primary)" strokeWidth="18" />

      {/* head */}
      <rect x="72" y="152" width="368" height="296" rx="48" fill="var(--bg-panel)" stroke="var(--action-primary)" strokeWidth="24" />
      {/* lower panel shading */}
      <path
        d="M96 360 h320 v40 a48 48 0 0 1-48 48 H144 a48 48 0 0 1-48-48 z"
        fill="var(--action-primary)"
        opacity="0.18"
      />

      {/* eyes */}
      <circle cx="196" cy="266" r="30" fill="var(--bg-primary)" stroke="var(--action-primary)" strokeWidth="18" />
      <circle cx="196" cy="266" r="10" fill="var(--text-secondary)" />
      <circle cx="316" cy="266" r="30" fill="var(--bg-primary)" stroke="var(--action-primary)" strokeWidth="18" />
      <circle cx="316" cy="266" r="10" fill="var(--text-secondary)" />

      {/* smile */}
      <path
        d="M200 356 q56 32 112 0"
        stroke="var(--action-primary)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 h-6 w-full">
      <span className="text-xs font-normal truncate select-none" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none"
        style={{ background: checked ? "var(--action-primary)" : "#f06292" }}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="group flex items-center gap-2 text-xl font-bold mt-6 mb-3 first:mt-0"
      style={{ color: "var(--accent-heading)" }}
    >
      {children}
      <Link2 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </h2>
  );
}

function PreviewRender({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-sm max-w-none" style={{ color: "var(--text-main)" }}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-extrabold mb-4" style={{ color: "var(--text-main)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => <SectionHeading>{children}</SectionHeading>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}