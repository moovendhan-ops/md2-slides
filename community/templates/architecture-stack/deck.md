<!-- layout: custom:architecture-stack -->
^ Architecture
# Four layers, one binary
The same Rust core runs in the browser and on the server.
:::cards
- browser | UI | Next.js, React, Tailwind
- plugs-connected | API | Route handlers on the edge
- cpu | Engine | Rust compiled to WebAssembly
- git-branch | Storage | Your GitHub repo
:::
