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
): string {
  // Non-destructive design: splits content line-by-line and maps each line so that untagged lines
  // or lines that already have block IDs are returned unchanged, preserving original content and formatting.
  return markdown
    .split("\n")
    .map((line) => {
      const parsed = parseLine(line, tagName);
      if (!parsed.hasTag || !!parsed.blockId) {
        return line;
      }
      return `${line} ^${generateBlockId()}`;
    })
    .join("\n");
}
