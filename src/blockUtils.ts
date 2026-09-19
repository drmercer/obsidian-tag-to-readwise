/**
 * Parses a single line of markdown text to determine if it contains the target tag
 * and whether it already has an Obsidian block ID.
 */
export function parseLine(
  line: string,
  tagName: string,
): { hasTag: boolean; blockId?: string } {
  const cleanTag = tagName.trim().replace(/^#/, "");
  const escapedTag = cleanTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagRegex = new RegExp(`#${escapedTag}(?![A-Za-z0-9_/-])`);
  const blockIdRegex = /(?:^|\s)\^([A-Za-z0-9-]{4,})[ \t]*$/;

  const hasTag = tagRegex.test(line);
  const match = line.match(blockIdRegex);
  const blockId = match?.[1];

  return {
    hasTag,
    ...(blockId ? { blockId } : {}),
  };
}

/**
 * Generates a short, random block ID (7 characters).
 */
export function randomBlockId(): string {
  return Math.random().toString(36).slice(2).padEnd(7, "0").slice(0, 7);
}

/**
 * Pure non-destructive function that ensures all lines containing a given tag
 * end with a block ID. Non-tagged lines or lines that already have a block ID
 * are preserved verbatim.
 */
export function ensureTaggedBlocksHaveIds(
  markdown: string,
  tagName: string,
  generateBlockId: () => string = randomBlockId,
): { newMarkdown: string; containedTag: boolean } {
  let containedTag = false;
  const newMarkdown = markdown
    .split("\n")
    .map((line) => {
      const parsed = parseLine(line, tagName);
      if (parsed.hasTag) {
        containedTag = true;
      }
      if (!parsed.hasTag || !!parsed.blockId) {
        return line;
      }
      return `${line} ^${generateBlockId()}`;
    })
    .join("\n");

  return { newMarkdown, containedTag };
}

export interface Highlight {
  cleanedText: string;
  blockId: string;
}

export interface FileWithStat {
  stat: {
    mtime: number;
  };
}

/**
 * Filters files based on last synced timestamp.
 * Returns files modified at or after `lastSyncedTime`.
 * If `lastSyncedTime` is 0 or negative, returns all files.
 */
export function filterFilesByModifiedTime<T extends FileWithStat>(
  files: T[],
  lastSyncedTime: number,
): T[] {
  if (!lastSyncedTime || lastSyncedTime <= 0) {
    return files;
  }
  return files.filter((file) => file.stat.mtime >= lastSyncedTime);
}

export interface ExtractHighlightsOptions {
  stripTagFromText?: boolean;
}

/**
 * Pure function that extracts highlights from markdown content for lines that contain
 * the target tag and a block ID. Uses parseLine under the hood.
 */
export function extractHighlights(
  markdown: string,
  tagName: string,
  options: ExtractHighlightsOptions = {},
): Highlight[] {
  const stripTag = options.stripTagFromText ?? true;
  const cleanTag = tagName.trim().replace(/^#/, "");
  const escapedTag = cleanTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagRegex = new RegExp(`#${escapedTag}(?![A-Za-z0-9_/-])`, "g");
  const blockIdRegex = /(?:^|\s)\^([A-Za-z0-9-]{4,})[ \t]*$/;

  const highlights: Highlight[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const parsed = parseLine(line, tagName);
    if (parsed.hasTag && parsed.blockId) {
      const withoutId = line.replace(blockIdRegex, "").trim();
      const cleanedText = stripTag
        ? withoutId.replace(tagRegex, "").trim().replace(/[ \t]{2,}/g, " ")
        : withoutId;

      if (cleanedText) {
        highlights.push({
          cleanedText,
          blockId: parsed.blockId,
        });
      }
    }
  }

  return highlights;
}
