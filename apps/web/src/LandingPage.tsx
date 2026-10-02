import { Monitor, Globe, Download, BookOpen, Code2, Zap, GitBranch, Search, ArrowRight, ExternalLink } from 'lucide-react';

const GITHUB_RELEASES = 'https://github.com/sagarkrjha/codeshelf/releases/latest';

interface LandingPageProps {
  onOpenWebApp: () => void;
}

const features = [
  {
    icon: <BookOpen size={20} className="text-blue-400" />,
    title: 'Snippet Knowledge Base',
    desc: 'Capture and organize code snippets with rich Markdown documentation — What, Why, When, How.',
  },
  {
    icon: <Search size={20} className="text-purple-400" />,
    title: 'Smart Search & Filter',
    desc: 'Full-text, tag, category, and semantic search across your entire snippet library instantly.',
  },
  {
    icon: <GitBranch size={20} className="text-green-400" />,
    title: 'Version History',
    desc: 'Auto-snapshotting on every edit with visual diffs and one-click rollback to any revision.',
  },
  {
    icon: <Zap size={20} className="text-amber-400" />,
    title: 'AI Autofill',
    desc: 'Gemini AI enriches snippets with title, description, complexity, tags, and usage context.',
  },
  {
    icon: <Code2 size={20} className="text-pink-400" />,
    title: 'Markdown-First Editor',
    desc: 'Full-featured split-pane Markdown editor with syntax highlighting, templates, and live preview.',
  },
  {
    icon: <Download size={20} className="text-cyan-400" />,
    title: 'Portable & Offline',
    desc: 'Local-first storage in clean Markdown + YAML — export backups, import, or sync via Git.',
  },
];

const downloads = [
  {
    platform: 'Windows',
    icon: '🪟',
    files: [
      { label: 'Installer (.exe)', hint: 'CodeShelf.Setup.<version>.exe' },
      { label: 'Portable (.exe)', hint: 'CodeShelf.<version>.exe' },
    ],
  },
  {
    platform: 'macOS',
    icon: '🍎',
    files: [{ label: 'Apple Silicon / Universal (.dmg)', hint: 'CodeShelf-<version>-arm64.dmg' }],
  },
  {
    platform: 'Linux',
    icon: '🐧',
    files: [
      { label: 'Debian/Ubuntu (.deb)', hint: 'codeshelf-desktop_<version>_amd64.deb' },
      { label: 'Universal (.AppImage)', hint: 'CodeShelf-<version>.AppImage' },
    ],
  },
  {
    platform: 'VS Code Extension',
    icon: '🔌',
    files: [{ label: 'VSIX Package', hint: 'codeshelf-<version>.vsix' }],
  },
];

export function LandingPage({ onOpenWebApp }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-main font-sans overflow-y-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border-color bg-bg-primary/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#121417"/>
              <rect x="5" y="20" width="22" height="3" rx="1.5" fill="#3b82f6"/>
              <rect x="6" y="10" width="4" height="10" rx="1" fill="#60a5fa"/>
              <rect x="11.5" y="12" width="3.5" height="8" rx="1" fill="#818cf8"/>
              <rect x="16" y="11" width="4" height="9" rx="1" fill="#34d399"/>
              <rect x="21" y="13" width="4" height="7" rx="1" fill="#f472b6"/>
            </svg>
            <span className="font-semibold text-base tracking-tight">CodeShelf</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/sagarkrjha/codeshelf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-xs py-1.5 px-3 hidden sm:inline-flex"
            >
              GitHub
              <ExternalLink size={12} />
            </a>
            <button
              onClick={onOpenWebApp}
              className="btn btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <Globe size={13} />
              Open Web App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1 mb-6">
          <Zap size={11} />
          Developer-focused snippet knowledge system
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
          Your code snippets,{' '}
          <span className="text-blue-400">organized & always</span>
          <br />
          within reach
        </h1>
        <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Capture, curate, and reuse code snippets across desktop and web. With AI autofill, version history,
          and seamless VS Code integration — stop losing your best code to chat logs and forgotten gists.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenWebApp}
            className="btn btn-primary text-sm py-2.5 px-6 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Globe size={16} />
            Use in Browser — Free
            <ArrowRight size={14} />
          </button>
          <a
            href={GITHUB_RELEASES}
            target="_blank"
            rel="noopener noreferrer"
            className="btn text-sm py-2.5 px-6 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Download size={16} />
            Download Desktop App
          </a>
        </div>
        <p className="text-text-muted text-xs mt-4">
          Web app runs entirely in your browser · Desktop syncs with VS Code
        </p>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-bg-secondary border border-border-color rounded-xl p-5 hover:border-accent/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm text-text-main mb-1.5">{f.title}</h3>
              <p className="text-text-muted text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two CTAs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Web App Card */}
          <div className="bg-bg-secondary border border-blue-500/30 rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Globe size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Web App</h2>
                <p className="text-xs text-text-muted">Works in any browser</p>
              </div>
            </div>
            <ul className="text-xs text-text-muted space-y-2 mb-6 flex-1">
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> No installation required</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Snippets stored in browser localStorage</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Full AI autofill, search, and version history</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Export backup anytime as JSON or Markdown</li>
            </ul>
            <button
              onClick={onOpenWebApp}
              className="btn btn-primary text-sm py-2.5 inline-flex items-center justify-center gap-2"
            >
              <Globe size={15} />
              Open Web App
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Desktop Card */}
          <div className="bg-bg-secondary border border-border-color rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-color flex items-center justify-center">
                <Monitor size={20} className="text-text-muted" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Desktop App</h2>
                <p className="text-xs text-text-muted">Windows · macOS · Linux</p>
              </div>
            </div>
            <ul className="text-xs text-text-muted space-y-2 mb-6 flex-1">
              <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Syncs bidirectionally with VS Code extension</li>
              <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Local file storage at <code className="font-mono bg-bg-tertiary px-1 py-0.5 rounded text-[10px]">~/.codeshelf/</code></li>
              <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Global hotkeys — capture code without leaving VS Code</li>
              <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Offline-first, no account needed</li>
            </ul>
            <a
              href={GITHUB_RELEASES}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-sm py-2.5 inline-flex items-center justify-center gap-2"
            >
              <Download size={15} />
              Download for Desktop
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* Downloads Table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-xl font-semibold mb-2 text-center">Desktop Downloads</h2>
        <p className="text-text-muted text-sm text-center mb-8">
          All releases available on{' '}
          <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            GitHub Releases
          </a>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {downloads.map((d) => (
            <div key={d.platform} className="bg-bg-secondary border border-border-color rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{d.icon}</span>
                <span className="font-semibold text-sm">{d.platform}</span>
              </div>
              <div className="space-y-2">
                {d.files.map((f) => (
                  <a
                    key={f.label}
                    href={GITHUB_RELEASES}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs text-text-muted hover:text-text-main group bg-bg-primary/50 border border-border-color rounded-lg px-3 py-2 transition-colors hover:border-accent/40"
                  >
                    <span className="font-medium">{f.label}</span>
                    <Download size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-color">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#1a1d21"/>
              <rect x="5" y="20" width="22" height="3" rx="1.5" fill="#3b82f6"/>
              <rect x="6" y="10" width="4" height="10" rx="1" fill="#60a5fa"/>
              <rect x="11.5" y="12" width="3.5" height="8" rx="1" fill="#818cf8"/>
              <rect x="16" y="11" width="4" height="9" rx="1" fill="#34d399"/>
              <rect x="21" y="13" width="4" height="7" rx="1" fill="#f472b6"/>
            </svg>
            <span>CodeShelf — MIT License</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/sagarkrjha/codeshelf" target="_blank" rel="noopener noreferrer" className="hover:text-text-main transition-colors">
              GitHub
            </a>
            <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer" className="hover:text-text-main transition-colors">
              Releases
            </a>
            <button onClick={onOpenWebApp} className="hover:text-text-main transition-colors">
              Web App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
