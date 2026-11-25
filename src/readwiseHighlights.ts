export type ReadwiseCategory = "articles" | "books" | "tweets" | "podcasts";

export interface ReadwiseFile {
  path: string;
  basename: string;
  stat: { ctime: number };
}

export interface ExtractedBlock {
  file: ReadwiseFile;
  cleanedText: string;
  blockId: string;
  dotTags: string[];
}

export interface ReadwiseHighlight {
  text: string;
  title: string;
  author?: string;
  source_url?: string;
  highlight_url?: string;
  category: ReadwiseCategory;
  highlighted_at: string;
  note?: string;
}

export interface ReadwiseHighlightMetadata {
  title: string;
  author: string;
  sourceUrl: string;
  category: ReadwiseCategory;
  buildHighlightUrl: (file: ReadwiseFile, blockId: string) => string;
}

/** Keeps leading indentation visible in Readwise's rendered highlight text. */
export function preserveLeadingSpaces(text: string): string {
  return text.replace(/(^|\n)( +)/g, (_match, lineStart: string, spaces: string) =>
    lineStart + "\u00a0".repeat(spaces.length),
  );
}

/** Replaces Markdown unordered-list markers with bullets Readwise displays as text. */
export function renderBulletMarkers(text: string): string {
  return text.replace(/(^|\n)([ \t]*)([-*+])([ \t]+)/g, "$1$2•$4");
}

/** Converts extracted Obsidian blocks into the shape expected by Readwise. */
export function convertBlocksToReadwiseHighlights(
  blocks: ExtractedBlock[],
  metadata: ReadwiseHighlightMetadata,
): ReadwiseHighlight[] {
  return blocks.map(({ file, cleanedText, blockId, dotTags }) => ({
    text: `${preserveLeadingSpaces(renderBulletMarkers(cleanedText))}\n\n(${file.basename})`,
    title: metadata.title,
    ...(metadata.author ? { author: metadata.author } : {}),
    source_url: metadata.sourceUrl,
    highlight_url: metadata.buildHighlightUrl(file, blockId),
    category: metadata.category,
    highlighted_at: new Date(file.stat.ctime).toISOString(),
    ...(dotTags.length > 0
      ? { note: dotTags.map((tag) => `.${tag}`).join(" ") }
      : {}),
  }));
}
