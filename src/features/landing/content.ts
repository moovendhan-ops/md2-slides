/** All landing-page copy, in one place (edit words here, not in components). */

export const HERO = {
  badge: "Open source · Markdown → slides · synced to GitHub",
  title: ["Your slides are", "just a Markdown file."],
  sub: "Stop fighting slide tools. Edit the .md in your repo, push, and the deck you show your client updates itself. Code, diagrams and data stay in sync with the code they describe.",
};

/** The live demo types these versions of one file, in order, then loops. */
export const DEMO_SCRIPT = [
  "---\ntheme: zinc\n---\n\n# Q3 platform review\nWhat we shipped for Acme Corp\n",
  "---\ntheme: zinc\n---\n\n# Q3 platform review\nWhat we shipped for Acme Corp\n\n---\n\n## Results\n\n:::stats style=big\n- 4 min | CI time, was 38\n- 0 | Incidents in 90 days\n- 12 | Releases per week\n:::\n",
  "---\ntheme: midnight\naccent: #a78bfa\n---\n\n# Q3 platform review\nWhat we shipped for Acme Corp\n\n---\n\n## Results\n\n:::stats style=big\n- 4 min | CI time, was 38\n- 0 | Incidents in 90 days\n- 12 | Releases per week\n:::\n",
  "---\ntheme: midnight\naccent: #a78bfa\n---\n\n# Q3 platform review\nWhat we shipped for Acme Corp\n\n---\n\n## Results\n\n:::stats style=big\n- 4 min | CI time, was 38\n- 0 | Incidents in 90 days\n- 12 | Releases per week\n:::\n\n---\n\n## Next quarter\n\n:::cards style=glass cols=3\n- rocket | Multi-region | Active-active in EU + US\n- shield-check | SOC 2 | Audit in November\n- gauge | p99 < 100ms | Edge caching\n:::\n",
];

export const WORKS_WITH: [string, string][] = [
  ["github-logo", "GitHub"],
  ["code", "VS Code"],
  ["sparkle", "Claude (MCP)"],
  ["flow-arrow", "Mermaid"],
  ["cloud", "Cloudflare"],
  ["file-html", "Any browser"],
];

export const PAINS: { pain: string; fix: string; icon: string; detail: string }[] = [
  { icon: "copy", pain: "Copy-pasting code into slides that are stale by Friday", fix: "Code blocks live in the deck file", detail: "Highlighted lines, click-to-step walkthroughs, even imports straight from your repo with <<<." },
  { icon: "git-diff", pain: "“Which version did we send the client?”", fix: "The deck is a file in Git", detail: "Every change is a commit you can review, diff and roll back. Pull requests for slides." },
  { icon: "paint-brush", pain: "Waiting on design for every tweak", fix: "Themes, layouts and components", detail: "Pick a theme, drag blocks around, and it looks designed. The Markdown stays readable." },
  { icon: "paperclip", pain: "Emailing a 40 MB .pptx", fix: "A link, or one HTML file", detail: "Share a view-only link (nothing stored on a server) or export an offline HTML presentation." },
];

/** Shared look for the workflow slides (front matter, as in any deck). */
const WORKFLOW_LOOK = "---\ntheme: zinc\naccent: #3b82f6\nbg: mesh\nglass: true\nnums: false\n---\n";

export const WORKFLOW: { n: string; title: string; text: string; code: string; slide: string }[] = [
  {
    n: "01",
    title: "Write (or let Claude write)",
    text: "Plain Markdown with blocks for cards, stats, timelines, code and Mermaid.",
    code: "## Everything is a block\n\n:::cards style=glass cols=3\n- lightning | Live preview | …\n- squares-four | Components | …\n:::",
    slide: `${WORKFLOW_LOOK}^ Write\n## Everything is a block\n:::cards style=glass cols=3\n- lightning | Live preview | Every keystroke re-renders\n- squares-four | Components | Cards, stats, charts, Mermaid\n- git-branch | In your repo | One .md file per deck\n:::`,
  },
  {
    n: "02",
    title: "Push to your repo",
    text: "The dashboard syncs with GitHub. Your deck sits next to the code it explains.",
    code: "git add decks/q3.md\ngit commit -m \"Q3 review: add results\"\ngit push",
    slide: `${WORKFLOW_LOOK}^ Q3 review\n## Results\n:::stats style=boxed\n- 42% | Faster deploys | +12%\n- 99.9% | Uptime\n- 3x | Release cadence | +1x\n:::`,
  },
  {
    n: "03",
    title: "Present or share",
    text: "Full presenter with notes, pen and timer, a share link or one offline HTML file.",
    code: "```ts deck.ts {2|3}\nconst deck = await parse(\"q3.md\");\nconst link = await share(deck);\npresent(deck);\n```",
    slide: `${WORKFLOW_LOOK}^ Present\n## One deck, three ways out\n:::cards style=outline cols=3\n- presentation | Presenter | Notes, pen, laser and timer\n- share-network | Share link | The deck travels in the link\n- file-html | HTML file | Works offline, anywhere\n:::`,
  },
];

export const MCP = {
  title: "Let Claude write the deck.",
  sub: "Run the md2slides MCP server with npx. Claude reads the syntax, writes the .md into your repo, fixes anything the engine flags, and hands you a preview link.",
  install: {
    "Claude Code": "claude mcp add md2slides -- npx -y md2slides-mcp",
    "Claude Desktop": '{\n  "mcpServers": {\n    "md2slides": {\n      "command": "npx",\n      "args": ["-y", "md2slides-mcp"]\n    }\n  }\n}',
    "Cursor / VS Code": '"md2slides": {\n  "command": "npx",\n  "args": ["-y", "md2slides-mcp"]\n}',
  } as Record<string, string>,
  prompt: "Make a 6-slide client update in decks/acme-q3.md: results as stats, the new architecture as a Mermaid diagram, and next quarter's plan.",
  steps: [
    ["chat-circle-text", "You ask Claude"],
    ["check-circle", "Engine validates"],
    ["file-md", "decks/acme-q3.md written"],
    ["squares-four", "Shows in your dashboard"],
  ] as [string, string][],
};

export const EXPORTS: [string, string, string][] = [
  ["share-network", "Share link", "The deck travels inside the link. Optional password, expiry, QR code."],
  ["file-html", "HTML presentation", "One offline file with the full presenter and speaker view."],
  ["file-pdf", "PDF", "One slide per page, for the client who needs an attachment."],
  ["code", "VS Code", "Open any .md as slides beside your code."],
];

export const FAQ: [string, string][] = [
  ["Is it free?", "Yes. md2slides is open source. If it saves you time, you can support development through GitHub Sponsors, Buy Me a Coffee or Open Collective."],
  ["Where are my decks stored?", "In your own GitHub repositories. md2slides reads and commits through the GitHub API; there is no md2slides database."],
  ["Do share links upload my deck?", "No. The deck is compressed into the link itself (the part after #, which browsers never send to servers). Add a password to encrypt it."],
  ["Is it just Markdown?", "Yes, plus a few readable extensions: :::cards, :::stats, :::timeline, Mermaid diagrams, <!-- layout: … --> and front matter for themes. See the syntax reference."],
  ["Can AI generate decks?", "Yes. In the app, or from Claude with the md2slides MCP server (npx -y md2slides-mcp), which writes validated .md files into your repo."],
  ["Does it work offline?", "The HTML export is a single offline file with the full presenter. The VS Code extension renders locally too."],
];
