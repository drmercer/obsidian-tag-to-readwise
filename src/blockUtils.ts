export interface ParsedLine {
  hasTag: boolean;
  blockId?: string;
  cleanedText: string;
  dotTags: string[];
}

/**
 * Parses a single line of markdown text to determine if it contains the target tag
 * and whether it already has an Obsidian block ID.
 *
 * Format: line words here #tagName .dotTag1 .dotTag2 ^blockId
 */
export function parseLine(line: string, tagName: string): ParsedLine {
  const cleanTag = tagName.trim().replace(/^#/, "");
  const escapedTag = escapeForRegex(cleanTag);
  const parseRegex = new RegExp(`^(.*?\\s)?#${escapedTag}\\b(.*?)$`);
  const blockIdRegex = /\s+\^([A-Za-z0-9-]{4,})\s*$/;

  const match = line.match(parseRegex);
  if (!match) {
    return {
      hasTag: false,
      cleanedText: line.replace(blockIdRegex, ""),
      dotTags: [],
      blockId: line.match(blockIdRegex)?.[1] || undefined,
    };
  }
  const [, beforeTag = "", afterTag = ""] = match;

  // Extract the block ID from the afterTag text if it exists.
  const blockId = afterTag.match(blockIdRegex)?.[1];
  // Remove the block ID from the afterTag text if it exists.
  let afterTagText = afterTag.replace(blockIdRegex, "");

  // If the afterTagText is all Readwise-style dot tags, extract them into
  // the dotTags array and clear afterTagText
  let dotTags: string[] = [];
  const afterTagWords = afterTagText.trim().split(/\s+/);
  if (afterTagWords.every((word) => word.startsWith(".") && word.length > 1)) {
    dotTags = afterTagWords.map((word) => word.slice(1));
    afterTagText = "";
  }

  // Only include the tag in the reconstructed line if there is text both
  // before and after it.
  // Never include the block ID.
  const cleanedText =
    !!afterTagText && !!beforeTag
      ? beforeTag + "#" + cleanTag + afterTagText
      : afterTagText
        ? afterTagText
        : beforeTag;
  const cleanedTrimmedText = cleanedText.trim();

  return {
    // debug: {
    //   beforeTag,
    //   afterTag,
    // },
    hasTag: true,
    blockId: blockId || undefined,
    cleanedText: cleanedTrimmedText,
    dotTags,
  };
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  function newBlockIdSuffixIfMissing(line: string): string {
    const parsed = parseLine(line, tagName);
    if (parsed.hasTag) {
      containedTag = true;
    }
    if (!parsed.hasTag || !!parsed.blockId) {
      return "";
    }
    return ` ^${generateBlockId()}`;
  }

  // This code structure ensures the processing is non-destructive: we only ever append block IDs to lines that need them.
  const newMarkdown = markdown
    .split("\n")
    .map((line) => {
      return line + newBlockIdSuffixIfMissing(line);
    })
    .join("\n");

  return { newMarkdown, containedTag };
}

export interface Highlight {
  cleanedText: string;
  blockId: string;
  dotTags: string[];
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

/**
 * Pure function that extracts highlights from markdown content for lines that contain
 * the target tag and a block ID. Uses parseLine under the hood.
 */
export function extractHighlights(
  markdown: string,
  tagName: string,
): Highlight[] {
  const highlights: Highlight[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const parsed = parseLine(line, tagName);
    if (parsed.hasTag && parsed.blockId) {
      let cleanedText = parsed.cleanedText;

      const isListItem = /^\s*([-*+]|\d+[.)])(\s|$)/.test(line);
      if (isListItem) {
        const indentMatch = line.match(/^(\s*)/);
        const baseIndentLength =
          indentMatch && indentMatch[1] ? indentMatch[1].length : 0;

        let j = i + 1;
        while (j < lines.length) {
          const subLine = lines[j];
          if (subLine === undefined || subLine.trim() === "") {
            break;
          }
          const subIndentMatch = subLine.match(/^(\s*)/);
          const subIndentLength =
            subIndentMatch && subIndentMatch[1] ? subIndentMatch[1].length : 0;
          if (subIndentLength <= baseIndentLength) {
            break;
          }
          cleanedText += "\n" + subLine.slice(baseIndentLength);
          j++;
        }
        i = j - 1;
      }

      highlights.push({
        cleanedText,
        blockId: parsed.blockId,
        dotTags: parsed.dotTags,
      });
    }
  }

  return highlights;
}
