<!-- layout: custom:api-endpoint -->
^ POST
# /v1/decks
Create a deck from Markdown. Returns the deck id and a preview link.
:::stats
- markdown | The deck source, required
- path | Where to save it in the repo
- theme | Optional theme override
:::
```json
{
  "markdown": "# Q3 review\n---\n# Results",
  "path": "decks/q3.md"
}
→ 201 { "id": "dk_42", "slides": 2 }
```
