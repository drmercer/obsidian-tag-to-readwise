# "Tag to Readwise" Obsidian plugin

An Obsidian plugin that syncs all blocks tagged with a certain tag to Readwise as highlights.

> [!IMPORTANT]
> If you want to sync your highlights **from** Readwise **to** Obsidian, use theofficial Readwise Obsidian plugin. This plugin does the opposite: syncs your own notes into Readwise so you can review them as "highlights".

## Features

- Syncs all blocks tagged with `#review` (configurable) into Readwise as highlights.
- By default, syncs only the notes that have changed since the last sync.
- Readwise's "View Original highlight" action will take you straight to the note in your Obsidian vault (using an `obsidian://` URL). The plugin adds a block ID to all tagged blocks to enable this deep linking (something like `^abc123` at the end of the line). 

> [!WARNING] If you rename or move a note in Readwise, any already-synced highlights from that notes will be duplicated in Readwise, because the highlight URL will be different. Deleting the `^abc123` marker from a synced block has the same effect, since a new ID gets generated next time it's scanned.

## Setup

1. Copy `manifest.json` and `main.js` (built from `src/main.ts`) into
   `<your-vault>/.obsidian/plugins/tag-to-readwise/`.
2. Reload Obsidian and enable the plugin under Settings → Community plugins.
3. Open the plugin settings and paste in your Readwise API token
   (find it at https://readwise.io/access_token). Click "Validate" to
   confirm it works.
4. Set the book title and author in the plugin settings. Optionally change
   the tag name (default `review`), the Readwise category assigned to the
   highlights, or toggle whether automatic syncs happen on vault load (enabled
   by default).

## Usage

- Command palette → "Sync all #review blocks to Readwise" (syncs files modified since the last synced time)
- Command palette → "Re-sync ALL highlights to Readwise" (ignores the last synced time and syncs all files)
- Command palette → "Sync #review blocks in current file to Readwise"
- Or click the "book with up arrow" icon in the ribbon (leftmost sidebar on desktop)
