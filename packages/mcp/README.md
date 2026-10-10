# md2slides-mcp

An [MCP](https://modelcontextprotocol.io) server for **md2slides**. It lets Claude (or any MCP client) write Markdown slide decks straight into your repo. Every deck is validated by the same Rust/Wasm engine the md2slides app uses.

```bash
npx -y md2slides-mcp
```

## Connect it

**Claude Code**

```bash
claude mcp add md2slides -- npx -y md2slides-mcp
```

**Claude Desktop** (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "md2slides": { "command": "npx", "args": ["-y", "md2slides-mcp"] }
  }
}
```

**Cursor / VS Code:** add the same `command` and `args` to your MCP settings.

No path to configure: decks go into the project the client has open (its working folder, or its MCP workspace roots). Claude Desktop has no project, so its decks go into `~/md2slides`; pass `--root /path/to/repo` to write into a repo instead. Every write reports the full path of the file.

## Then ask

> Make a 6-slide deck about our Q3 platform migration in decks/q3.md, with a Mermaid diagram and a stats slide.

Claude reads the syntax, writes `decks/q3.md` with `create_deck`, fixes anything the engine reports, and gives you a **preview link**. Commit and push, and the deck shows up in the md2slides dashboard and the VS Code extension.

## Tools

| Tool | What it does |
| --- | --- |
| `get_syntax` | The full md2slides Markdown spec |
| `list_blocks` | Ready-made blocks (cards, stats, flows, code, charts, Mermaid…) |
| `list_templates` | Built-in and community templates, with author GitHub profiles |
| `validate_deck` | Parse with the engine: slide count, titles, problems |
| `create_deck` / `update_deck` | Validate, then write the `.md` inside the workspace (never outside it, never overwriting by accident) |
| `read_deck` | Read an existing deck |
| `preview_link` | A view-only link; the deck travels inside the link and nothing is uploaded |

The `new_deck` prompt runs the whole flow for a topic.

## Options

| Flag / env | Default | |
| --- | --- | --- |
| `--root` / `MD2SLIDES_ROOT` | the client's project (MCP roots or working folder); `~/md2slides` when that is `/` or your home folder | Workspace the decks are written under |
| `--app-url` / `MD2SLIDES_APP_URL` | `https://md2slides.cybertechmind.com` | App used for preview links (use your own deployment) |

Everything runs locally and needs Node 18.17+.
