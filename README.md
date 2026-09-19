# Review to Readwise

An Obsidian plugin that finds every block tagged `#review` in your vault
and sends it to Readwise as a highlight.

## What counts as a "block"

Any paragraph, list item, blockquote, etc. — basically any chunk of text
separated by a blank line — that contains the tag. The whole block is sent
as one highlight, with the tag itself stripped out (this is configurable).

## Setup

1. Copy `manifest.json` and `main.js` (built from `src/main.ts`) into
   `<your-vault>/.obsidian/plugins/review-to-readwise/`.
2. Reload Obsidian and enable the plugin under Settings → Community plugins.
3. Open the plugin settings and paste in your Readwise API token
   (find it at https://readwise.io/access_token). Click "Validate" to
   confirm it works.
4. Optionally change the tag name (default `review`) and the Readwise
   category assigned to the highlights.

## Usage

- Command palette → "Sync all #review blocks to Readwise" (whole vault)
- Command palette → "Sync #review blocks in current file to Readwise"
- Or click the book-up icon in the ribbon

## Building from source

```bash
npm install
npm run build   # outputs main.js
npm run dev      # watch mode while developing
```

## Notes on the Readwise API used

- Highlights are created via `POST https://readwise.io/api/v2/highlights/`,
  batched at 50 per request.
- Each highlight includes a `source_url` *and* `highlight_url`, both pointing
  at the specific block via an Obsidian block reference
  (`.../obsidian://open?vault=...&file=<path>#^blockid`), prefixed with
  `https://danmercer.net` (configurable, blank = raw link) since Readwise
  doesn't render custom URL schemes as clickable. The first time a `#review`
  block is scanned, the plugin appends a block ID (`^abc123`) to it in the
  file if it doesn't already have one — this is what keeps `highlight_url`
  stable across edits.
- All highlights are grouped under one fixed book/author (`Dan's Obsidian
  Notes` / `Dan Mercer` by default, editable in settings).
- The block's URL is also appended to the highlight text itself as a
  markdown link — `[Note Title](url)` — since Readwise's own "view source"
  affordance isn't always where you want the link; this can be turned off
  in settings.
- 429 responses are retried up to 3 times using the `Retry-After` header.
- Requests go through Obsidian's `requestUrl` (not `fetch`) so they aren't
  blocked by CORS.
- **Dedup and edit-syncing**: Readwise treats a highlight as a duplicate
  only when `title`, `author`, `text`, and `source_url` *all* match a
  previous highlight. Separately, Readwise supports updating a highlight
  by re-sending the same `highlight_url` with new `text` instead of
  creating a new highlight. Since the block ID (and therefore
  `highlight_url`) stays fixed even when you edit the block's wording,
  re-running the sync after an edit updates the existing Readwise
  highlight instead of creating a new one.
- **Caveat**: renaming or moving a note changes its vault path, which
  changes the block's URL — so `highlight_url` changes too, and the next
  sync creates a fresh highlight in Readwise rather than updating the old
  one (the old highlight is orphaned, not deleted). Deleting the `^abc123`
  marker from a block has the same effect, since a new ID gets generated
  next time it's scanned.

## Caveats worth knowing about

- Block splitting is done on blank lines, which matches how most people
  write `#review` tags at the end of a paragraph or bullet — but a tag
  placed alone on a blank-separated line will itself become a (probably
  empty) "block" and gets skipped since empty highlights aren't sent.
- This does not distinguish nested tags like `#review/urgent` from
  `#review` — only exact `#review` is matched (word-boundary aware), so
  `#review/urgent` is treated as a different tag and won't match unless
  you change the configured tag name.
