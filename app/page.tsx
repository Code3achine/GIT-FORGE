"use client";

import { useState } from "react";
import { Sparkles, Copy, Download, Sun, Moon, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Tone = "Professional" | "Technical" | "Friendly";
type EditView = "raw" | "optimal";

const TONES: Tone[] = ["Professional", "Technical", "Friendly"];

const DEFAULT_SECTIONS = [
  { key: "installation", label: "Installation", checked: true },
  { key: "features", label: "Features", checked: true },
  { key: "techStack", label: "Tech Stack", checked: true },
  { key: "license", label: "License", checked: true },
];

export default function Page() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [includeBadges, setIncludeBadges] = useState(true);
  const [badgesStyle, setBadgesStyle] = useState(true);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [editView, setEditView] = useState<EditView>("raw");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, checked: !s.checked } : s))
    );
  }

  async function handleGenerate() {
    if (!repoUrl.trim()) {
      setError("Enter a repository URL or owner/repo");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl,
          tone,
          include_badges: includeBadges,
          badges_style: badgesStyle,
          sections: sections.filter((s) => s.checked).map((s) => s.key),
        }),
      });
      setConnected(res.ok);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setMarkdown(data.markdown_content ?? "");
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const repoName = repoUrl.split("/").filter(Boolean).pop() || "your-project";

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-[#0d1117] text-neutral-900 dark:text-neutral-100 transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
          {/* LEFT: Configuration */}
          <div className="border-r border-neutral-200 dark:border-neutral-800 p-6 space-y-6 overflow-y-auto">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
                Project Configuration
              </h2>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Repository URL / owner/repo
              </label>
              <div className="flex gap-2">
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="vercel/next.js"
                  className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <Sparkles size={14} />
                  {loading ? "Generating…" : "Generate"}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-500">{error}</p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
                Configuration
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as Tone)}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Badges Toggle
                  </label>
                  <div className="space-y-2 pt-1">
                    <ToggleRow
                      label="Include Badges?"
                      checked={includeBadges}
                      onChange={setIncludeBadges}
                    />
                    <ToggleRow
                      label="Badges"
                      checked={badgesStyle}
                      onChange={setBadgesStyle}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Sections
                  </label>
                  <div className="space-y-1.5 pt-1">
                    {sections.map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={s.checked}
                          onChange={() => toggleSection(s.key)}
                          className="accent-blue-600"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
                Edit View
              </h2>
              <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden mb-3">
                <button
                  onClick={() => setEditView("raw")}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    editView === "raw"
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  Raw Markdown
                </button>
                <button
                  onClick={() => setEditView("optimal")}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    editView === "optimal"
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  Optimal
                </button>
              </div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder={`# ${repoName}\n\n## Installation\n\n\`\`\`\nnpm install\n\`\`\``}
                spellCheck={false}
                className="w-full h-72 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {connected ? "Connected" : "Disconnected"}
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                README.md Preview
              </h2>
              <button
                onClick={() => setDark((d) => !d)}
                className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Toggle theme"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            <div className="flex gap-2 px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <button
                onClick={handleCopy}
                disabled={!markdown}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Markdown"}
              </button>
              <button
                onClick={handleDownload}
                disabled={!markdown}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Download size={13} />
                Download README.md
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {markdown ? (
                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-neutral-900">
                  <ReactMarkdown>{markdown}</ReactMarkdown>
                </article>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400 dark:text-neutral-600">
                  Enter a repository and click Generate to see a preview.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-6 py-2 text-[11px] text-neutral-400 dark:text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                {connected ? "Connected" : "Disconnected"}
              </span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <span className="text-xs text-neutral-600 dark:text-neutral-400">
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
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
