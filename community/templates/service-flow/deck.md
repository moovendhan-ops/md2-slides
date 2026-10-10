<!-- layout: custom:service-flow -->
^ Request path
# What happens when you hit Share
:::flow
- browser | Browser | Deck encoded in the link
- cloud | Edge | Serves the static viewer
- cpu | Wasm engine | Parses Markdown in the tab
- presentation | Viewer | Renders slides, nothing stored
:::
