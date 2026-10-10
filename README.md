# md2slides

Markdown slide decks synced to GitHub. One `.md` file = one deck. Write Markdown, restyle any block
visually, present with a full presenter view, and push changes as commits.

Built with **Next.js (App Router)**, **shadcn/ui**, **Zustand**, **TanStack Query + Table**, and a
**Rust core compiled to WebAssembly** that runs in the browser and in Cloudflare Workers / server runtimes.

## Quick start

```bash
cp .env.example .env.local   # fill in GitHub OAuth + AI keys (never commit .env.local)
npm install
npm run dev                  # http://localhost:3000 (landing) · /app (editor)
```

**GitHub OAuth App:** set the *Authorization callback URL* to `<your app URL>/api/auth/github/callback`
(e.g. `http://localhost:3000/api/auth/github/callback` locally, and your Cloudflare domain in production).

The compiled engine (`public/wasm/slide_engine_bg.wasm` + `src/engine/wasm/pkg/`) is committed, so
no Rust toolchain is needed to run or deploy. To change the engine:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.100
npm run wasm:build   # rebuilds the .wasm and JS bindings
```

| Script | What it does |
| --- | --- |
| `npm run typecheck` / `lint` | TypeScript + ESLint |
| `npm test` | Vitest unit tests for the source-editing domain layer |
| `npm run test:engine` | Rust unit tests for the parser, template store and slot renderer |
| `npm run build` | Production build |

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App used for sign-in, reading repos and pushing commits. |
| `SESSION_SECRET` | Encrypts the http-only session cookie that holds the GitHub token (AES-256-GCM). |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | The one AI endpoint, in the OpenAI-compatible format. It works with OpenAI, Gemini, Cloudflare Workers AI, OpenRouter, Groq, Ollama and others (examples in `.env.example`). `AI_PROVIDER_NAME` optionally sets the name shown in the UI. |
| `DISCORD_WEBHOOK_URL` | Optional alerts: AI failures, OAuth failures, GitHub rate limits, pushes. No secrets or prompt text are sent. |
| `NEXT_PUBLIC_TEMPLATE_SOURCE=remote` | Read/write templates through the Wasm-backed `/api/templates` function instead of the in-browser store. |

## Features

- **GitHub sign-in** (OAuth), then pick the repositories to work with — only those are shown, and trees/files load on demand. Live repository browser, per-file dirty state, commit dialog with line diffs — pushes a real commit or opens a pull request.
- **Editor**: colour-coded Markdown, `/` block inserter with live previews, ⌘K palette, problems panel, format, `.md`/PDF export.
- **Auto-split**: a slide whose content would overflow continues on the next one, numbered 1a, 1b, 1c (display only — the Markdown is unchanged; opt out per slide with `<!-- split: false -->`). Long code, lists, tables and terminals are cut between rows.
- **Live preview** (all slides or focus mode) — click any block to restyle it, transform it into another block type, or edit images.
- **Customizer**: 4 palettes × dark/light, accents, 6 backgrounds, 5 font pairings, glass, radius, density, aspect ratio, per-slide layouts / colours / padding, 21 transitions and 8 block animations.
- **Templates**: decks, single slides and community templates — searched and paged inside the Wasm store; save any deck as a template.
- **Template studio**: author HTML + Tailwind layouts with `{{slots}}`, live preview, validation, and publish as `<!-- layout: custom:id -->`.
- **Presenter**: timer + limit, notes, next slide, pen, laser, blackout, zoom, overview, click-to-reveal, code step-through, share link settings.
- **AI**:
  - Uses one server-side, OpenAI-compatible endpoint (base URL, key and model come from env), so users never enter keys.
  - The AI dialog pings the endpoint and shows whether it is reachable, along with the provider, model and latency. `GET /api/ai/health` returns the same check.
  - Output is validated by the Wasm parser and retried once if it contains no slides.

The full Markdown syntax is in [`public/llms-full.txt`](public/llms-full.txt).

## Landing page and brand

- **Routes:** `/` is the landing page, `/app` is the editor (GitHub sign-in returns there), and `/v#…` is the share viewer.
- **Audience and message:** the landing page is written for developers: the deck is a Markdown file in your repo, and updating it updates what the client sees.
- **Live demo:** its hero is a real editor-plus-preview. The Markdown types itself and the md2slides engine re-renders the slide on every keystroke, with a static version for reduced motion.
- **Sections:** the pain → fix grid, workflow, features, the MCP server, export, community templates, contribute and donate, and FAQ.
- **Where things live:**
  - All copy is in `src/features/landing/content.ts`.
  - Donation links (GitHub Sponsors, Buy Me a Coffee via `NEXT_PUBLIC_BMC_HANDLE`, Open Collective) are in `src/lib/brand.ts`.
  - The logo is `public/logo.svg`. `node scripts/brand-icons.mjs` regenerates the favicon set and the VS Code icon.
  - `node scripts/landing-assets.mjs` regenerates the workflow slide images and the demo link from `src/features/landing/showcase.md`.

## MCP server (`npx -y md2slides-mcp`)

`packages/mcp` is an MCP server that lets Claude write decks into your repo:

```bash
claude mcp add md2slides -- npx -y md2slides-mcp
```

- **Tools:** `get_syntax`, `list_blocks`, `list_templates`, `validate_deck`, `create_deck`, `update_deck`, `read_deck`, `preview_link`, plus a `new_deck` prompt.
- **Where decks go:** no path to configure. The server writes into the project the client has open (its working folder or MCP workspace roots). Claude Desktop has no project, so its decks go into `~/md2slides`; `--root` overrides both.
- **How decks are written:** each deck is validated by the same Wasm engine, then written inside the workspace. It refuses paths outside the workspace and won't overwrite by accident. Claude gets back a `/v#…` preview link.
- **To the dashboard:** push the file and it appears in the dashboard.
- **Build and release:** `npm run mcp:build` builds it. Pushing an `mcp-v*` tag publishes to npm when the `NPM_TOKEN` secret is set. Details are in [packages/mcp/README.md](packages/mcp/README.md).

## Community templates

- **Adding one:** community templates live in `community/templates/<id>/` as `deck.md` plus `meta.json`, with the author's GitHub username.
- **From the app:** **Submit to community** (Template studio, or Customize → Deck) opens the pull request for you, forking the repo when needed.
- **Validation:** `npm run community` validates them with the engine and regenerates `src/data/community.generated.json`. PR CI validates; after merge, CI (and every build) regenerates the catalog.
- **Credit:** in the app and on the landing page, each template shows its author's avatar, name and a link to their GitHub profile. A contributors wall lists everyone, including people in `community/CONTRIBUTORS.json`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Share links (no server storage)

**Share** (editor toolbar, presenter, ⌘K) creates a view-only link that carries the deck itself:
- The Markdown and any imported files are compressed into the URL fragment (`/v#…`). Browsers never send the fragment to the server, so nothing is uploaded, stored or logged.
- **Password:** optional. The deck is encrypted in the browser (AES-GCM with a PBKDF2-derived key) and decrypted in the viewer's browser.
- **Expiry:** 1 hour to 30 days, or never. The viewer enforces it. Add a password if the content must stay private after expiry.
- **Viewer options:** show speaker notes, allow `.md` download, open straight into present mode.
- **The `/v` viewer** is a static page:
  - Read-only slides and the full presenter: transitions, reveals, code steps, overview, pen, laser, timer.
  - `?slide=N` deep links.
  - A speaker window kept in sync over `BroadcastChannel`.
- **Link size:** typical decks produce links of a few KB. The dialog warns when a link gets long enough that chat apps may cut it off, and a QR code is available for rooms.
- **Images:** images with relative repo paths are not included; the dialog lists them.

## Export

**Export** (editor toolbar or ⌘K) generates files in the browser:
- **HTML presentation:** one offline `.html` file you can double-click to open.
  - It contains the full presenter: transitions, reveals, code steps, overview, pen, laser, timer and speaker view.
  - Mermaid diagrams are pre-rendered, and the file can optionally be password-encrypted.
  - It inlines the standalone player built from `src/player` by `scripts/build-player.mjs`, which runs automatically before `dev` and `build`.
- **PDF:** the browser's print dialog, one slide per page.
- **Markdown:** the deck source.

## VS Code extension

`vscode-extension/` packages the same app for VS Code. The webview bundles `src/embed/vscode/main.tsx`, which reuses the engine, preview, Components view, customizer and presenter from `src/`, and it is kept in sync with the open `.md` file. Opening a Markdown deck suggests "Open as Slides".

| Command | |
| --- | --- |
| `./scripts/vscode-dev.sh [deck.md]` | Build and open an Extension Development Host for testing (or press F5 in VS Code) |
| `./scripts/vscode-dev.sh --install` | Package a `.vsix` and install it into your VS Code |
| `npm run vscode:test` | Headless integration test in a downloaded VS Code |
| `./scripts/vscode-release.sh patch "notes"` | Bump the version, update CHANGELOG, commit and tag `vscode-vX.Y.Z` |

Pushing a `vscode-v*` tag runs `.github/workflows/vscode-extension.yml`:
- It builds, tests and packages the extension, then attaches the `.vsix` to a GitHub release.
- It publishes to the VS Code Marketplace when the `VSCE_PAT` secret is set, and to Open VSX when `OVSX_PAT` is set.
- The `publisher` in `vscode-extension/package.json` must match your Marketplace publisher ID.

## Architecture

```
crates/slide-engine/        Rust → Wasm: parser, TemplateStore (search, paging, SWT1 snapshots), mustache slots
src/
  engine/                   Typed facade over the Wasm bindings (browser loader, server loader, React provider)
  domain/                   Pure TS: look/theme tokens, slide layout maths, source transforms, file tree
  data/                     Built-in catalog JSON (templates, snippets, AI prompt ideas, code layouts)
  services/                 Interfaces + implementations: AuthProvider/GitProvider (GitHub), TemplateRepository, AiDeckService
  server/                   Server-only: env, encrypted session, GitHub client, OpenAI-compatible AI client + ping, Discord alerts, rate limit
  stores/                   Zustand slices: workspace, ui, editor, present, session, ai, studio, layouts
  hooks/                    TanStack Query hooks, deck/file actions, global shortcuts
  components/slide/         SlideView + block registry (one component per block family)
  components/shell/         Header, sidebar, file tree
  features/                 One folder per screen: auth, repo, editor, customize, templates, studio, present, ai, commit, palette, profile
  app/api/                  auth/github/{login,callback}, auth/{me,logout}, github/{repos,tree,file,commit}, ai, templates, parse
```

**Why WebAssembly.** Parsing runs on every keystroke and template search runs on every filter change,
so both live in Rust. The browser loads the 260 KB module once and parses decks with no network
round-trip. Server and API routes load the same binary, so CI, bots and the app all
use the same parser. Templates are stored in the Wasm `TemplateStore`. In the browser it is persisted
to IndexedDB as a compact `SWT1` binary snapshot. On the server it lives per worker/function instance. To
make it durable, save `store.snapshot()` bytes to Cloudflare KV or R2 in `src/server/template-store.ts`.

**Design principles.**
- *Single responsibility:* parsing (Rust), look tokens, layout maths, source edits and rendering each live in their own module.
- *Open/closed:* new block types register in `components/slide/blocks/registry.ts`. Screens and customizer tabs are registries too.
- *Dependency inversion:* UI depends on the `GitProvider`, `TemplateRepository` and `AiDeckService` interfaces. `app-shell/services.tsx` is the only place concrete classes are chosen.
- *DRY:* every document edit is a pure function in `domain/source`, shared by the toolbar, palette, preview and customizer through `useDeckActions`.

### Security notes

- The GitHub token never reaches the browser: it lives in an encrypted, http-only, SameSite=Lax cookie and every GitHub call goes through `/api/github/*`. OAuth uses a one-time `state` cookie against CSRF.
- The AI key stays on the server and is never sent to the browser or returned by `/api/ai/health`.
- `/api/ai` is rate limited to 10 requests/min per IP per instance, and `/api/ai/health` to 12 checks/min.
