# Contributing to md2slides

Thanks for helping! The easiest way to contribute is a **community template**. Your name, avatar and GitHub profile are shown on it in the app and on the landing page.

## Add a community template

### From the app (no setup)

1. Open https://md2slides.cybertechmind.com/app and sign in with GitHub.
2. Design your deck in the editor, or a layout in **Template studio**, and check it in the live preview (dark and light).
3. Click **Submit to community** (Template studio toolbar, or **Customize → Deck** for a deck; also in the ⌘K palette).
4. Fill in the name, id, category and description, then **Open pull request**. md2slides forks the repo for you if you can't push to it, commits `community/templates/<id>/` and opens the PR, credited to your GitHub account.

### From a clone

1. Fork the repo and create `community/templates/<your-template-id>/`. Use lowercase letters, digits and dashes, e.g. `quarterly-review`.
2. Add `deck.md`, written in md2slides Markdown ([syntax](public/llms-full.txt)). Slides are separated by `---`.
3. Add `meta.json`:

   ```json
   {
     "name": "Quarterly review",
     "description": "One line about when to use it.",
     "category": "Business",
     "author": { "github": "your-github-username", "name": "Your Name" },
     "look": { "theme": "zinc", "accent": "#3b82f6" }
   }
   ```

   `look` is optional and takes the same keys as a deck's front matter (theme, accent, bg, font, …).
   For an HTML + Tailwind layout, also add `template.html` (and `"slots": [...]` in `meta.json`); `deck.md` is then its sample slide, using `<!-- layout: custom:<your-template-id> -->`.
4. Check it with `npm run community`. This validates the metadata, parses the deck with the md2slides engine and regenerates `src/data/community.generated.json`. You don't need to commit that file: it is regenerated on `main` after your PR is merged.
5. Preview it with `npm run dev`, then open **Templates → Community** at http://localhost:3000/app.
6. Open a pull request. CI re-runs the check.

**Checklist**
- No secrets, private data or copyrighted images. Use full image URLs you have the right to use.
- The deck has no parser errors and looks good in both dark and light mode.
- It's one template per folder, and `author.github` is your real GitHub username.

## Code contributions

- `npm run typecheck && npm run lint && npm test` must pass. Engine changes also need `npm run test:engine`.
- Keep files focused (under 300 lines) and put pure logic in `src/domain` with tests.
- See the README for the architecture.

Contributors are credited on the landing page. Add yourself to `community/CONTRIBUTORS.json` in your PR.
