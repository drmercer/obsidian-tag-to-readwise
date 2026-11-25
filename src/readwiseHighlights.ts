export type ReadwiseCategory = "articles" | "books" | "tweets" | "podcasts";

const OBSIDIAN_URL_REDIRECT_PREFIX = "https://danmercer.net/tools/obsidianurl#";

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
  vaultName: string;
  convertRelativeLinks: boolean;
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

/** Separates adjacent closing parentheses so Readwise keeps Markdown link URLs intact. */
export function separateConsecutiveClosingParentheses(text: string): string {
  return text.replace(/\)+/g, (parentheses) =>
    parentheses.split("").join("\u200b"),
  );
}

/** Converts relative Markdown links to links that open their target in Obsidian. */
export function convertRelativeMarkdownLinks(
  text: string,
  sourcePath: string,
  vaultName: string,
  enabled: boolean,
): string {
  if (!enabled) return text;
  const sourceDirectory = sourcePath.split("/").slice(0, -1);
  return text.replace(/(\]\()([^)]*)(\))/g, (_match, prefix: string, target: string, suffix: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) {
      return `${prefix}${target}${suffix}`;
    }

    const [relativePath, ...fragmentParts] = target.split("#");
    const segments = !relativePath
      ? sourcePath.split("/")
      : relativePath.startsWith("/")
      ? []
      : [...sourceDirectory];
    for (const segment of (relativePath ?? "").replace(/^\//, "").split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === "..") segments.pop();
      else segments.push(segment);
    }
    const fileTarget = `${segments.join("/")}${fragmentParts.length ? `#${fragmentParts.join("#")}` : ""}`;
    const uri = `${OBSIDIAN_URL_REDIRECT_PREFIX}obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fileTarget)}`;
    return `${prefix}${uri}${suffix}`;
  });
}

/** Converts Obsidian wiki links to Markdown links using the configured web redirect. */
export function convertWikiLinks(
  text: string,
  enabled: boolean,
  vaultName: string,
): string {
  if (!enabled) return text;
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => {
    const label = alias?.trim() || target.trim();
    const uri = `${OBSIDIAN_URL_REDIRECT_PREFIX}obsidian://open?vault=${encodeURIComponent(vaultName)}&name=${encodeURIComponent(target.trim())}`;
    return `[${label}](${uri})`;
  });
}

/** Converts extracted Obsidian blocks into the shape expected by Readwise. */
export function convertBlocksToReadwiseHighlights(
  blocks: ExtractedBlock[],
  metadata: ReadwiseHighlightMetadata,
): ReadwiseHighlight[] {
  return blocks.map(({ file, cleanedText, blockId, dotTags }) => {
    const highlightUrl = metadata.buildHighlightUrl(file, blockId);
    const noteTitle = metadata.convertRelativeLinks
      ? `[${file.basename}](${OBSIDIAN_URL_REDIRECT_PREFIX}${highlightUrl})`
      : file.basename;

    return {
      text: `${noteTitle}:\n\n${preserveLeadingSpaces(
        renderBulletMarkers(
          separateConsecutiveClosingParentheses(
            convertRelativeMarkdownLinks(
              convertWikiLinks(
                cleanedText,
                metadata.convertRelativeLinks,
                metadata.vaultName,
              ),
              file.path,
              metadata.vaultName,
              metadata.convertRelativeLinks,
            ),
          ),
        ),
      )}`,
      title: metadata.title,
      ...(metadata.author ? { author: metadata.author } : {}),
      source_url: metadata.sourceUrl,
      highlight_url: highlightUrl,
      category: metadata.category,
      highlighted_at: new Date(file.stat.ctime).toISOString(),
      ...(dotTags.length > 0
        ? { note: dotTags.map((tag) => `.${tag}`).join(" ") }
        : {}),
    };
  });
}
