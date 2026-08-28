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

function buildMarkdown({
  repoUrl,
  tone,
  includeBadges,
  sectionKeys,
}: {
  repoUrl: string;
  tone: Tone;
  includeBadges: boolean;
  sectionKeys: string[];
}) {
  const repoName = repoUrl.split("/").filter(Boolean).pop() || "project";
  const owner = repoUrl.split("/").filter(Boolean)[0] || "owner";
  const pkgName = repoName.replace(/\.git$/, "");

  const blurb: Record<Tone, string> = {
    Professional: `${pkgName} is a production-ready package maintained by ${owner}, built for reliability and ease of integration.`,
    Technical: `${pkgName} — a ${owner} project. Implementation details, APIs, and configuration are documented below.`,
    Friendly: `Hey! 👋 ${pkgName} is a fun little project from ${owner} — here's everything you need to get going.`,
  };

  const parts: string[] = [`# ${pkgName}`, ""];

  if (includeBadges) {
    parts.push(
      `![build](https://img.shields.io/badge/build-passing-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue) ![version](https://img.shields.io/badge/version-1.0.0-informational)`,
      ""
    );
  }

  parts.push(blurb[tone], "");

  if (sectionKeys.includes("installation")) {
    parts.push(
      "## Installation",
      "",
      "```bash",
      `npm install ${pkgName}`,
      "```",
      ""
    );
  }

  if (sectionKeys.includes("features")) {
    parts.push(
      "## Features",
      "",
      `- Fast, minimal setup for ${pkgName}`,
      "- Well-documented API surface",
      "- Actively maintained by " + owner,
      ""
    );
  }

  if (sectionKeys.includes("techStack")) {
    parts.push("## Tech Stack", "", "- TypeScript / JavaScript", "- Node.js", "- React", "");
  }

  if (sectionKeys.includes("license")) {
    parts.push(
      "## License",
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
        setMarkdown(
          data.markdown_content ??
            buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys })
        );
        setConnected(true);
      } else {
        setMarkdown(buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys }));
        setConnected(false);
      }
    } catch {
      setMarkdown(buildMarkdown({ repoUrl, tone, includeBadges, sectionKeys }));
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
              <div className="flex gap-2">
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="flex-1 rounded-md border px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--text-secondary)4d",
                    color: "var(--text-main)",
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap disabled:opacity-60"
                  style={{ background: "var(--action-primary)" }}
                >
                  <Sparkles size={14} />
                  {loading ? "Generating…" : "Generate"}
                </button>
              </div>
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
              <div className="grid grid-cols-3 gap-5">
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
                    className="w-full rounded-md border px-2 py-2 text-xs outline-none"
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
                    Badges Toggle
                  </div>
                  <div className="space-y-3">
                    <ToggleRow label="Include Badges?" checked={includeBadges} onChange={setIncludeBadges} />
                    <ToggleRow label="Badges" checked={badgesToggle} onChange={setBadgesToggle} />
                  </div>
                </div>

                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Sections
                  </div>
                  <div className="space-y-1.5">
                    {sections.map((s) => (
                      <label key={s.key} className="flex items-center gap-2 text-xs cursor-pointer">
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
                      className="select-none px-3 py-2 text-right text-xs font-mono"
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
                      className="flex-1 min-h-[18rem] resize-none bg-transparent px-3 py-2 font-mono text-xs leading-6 outline-none"
                      style={{ color: "var(--text-main)" }}
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
                  <article className="prose prose-sm max-w-none">
                    <ReactMarkdown>{markdown}</ReactMarkdown>
                  </article>
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
              className="px-5 py-4 border-b"
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

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {markdown ? (
                <PreviewRender markdown={markdown} />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-sm"
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--action-primary)" : "var(--text-secondary)4d" }}
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