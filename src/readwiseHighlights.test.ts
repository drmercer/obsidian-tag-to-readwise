import { describe, expect, it } from "vitest";
import {
  convertBlocksToReadwiseHighlights,
  ExtractedBlock,
  preserveLeadingSpaces,
  renderBulletMarkers,
  separateConsecutiveClosingParentheses,
} from "./readwiseHighlights";

describe("preserveLeadingSpaces", () => {
  it("replaces indentation at the start of each line with nonbreaking spaces", () => {
    expect(preserveLeadingSpaces("  first\n    second\nthird")).toBe(
      "\u00a0\u00a0first\n\u00a0\u00a0\u00a0\u00a0second\nthird",
    );
  });

  it("leaves spaces inside lines unchanged", () => {
    expect(preserveLeadingSpaces("first  second")).toBe("first  second");
  });
});

describe("renderBulletMarkers", () => {
  it("replaces unordered Markdown list markers at the start of lines", () => {
    expect(renderBulletMarkers("- first\n  * nested\n+ another")).toBe(
      "• first\n  • nested\n• another",
    );
  });

  it("leaves inline hyphens and horizontal rules unchanged", () => {
    expect(renderBulletMarkers("word - word\n---")).toBe("word - word\n---");
  });
});

describe("separateConsecutiveClosingParentheses", () => {
  it("inserts a zero-width space between consecutive closing parentheses", () => {
    expect(
      separateConsecutiveClosingParentheses(
        "([Some link](https://example.com))",
      ),
    ).toBe("([Some link](https://example.com)\u200b)");
  });

  it("separates every parenthesis in longer runs and preserves isolated ones", () => {
    expect(separateConsecutiveClosingParentheses("(one) and (two)))")).toBe(
      "(one) and (two)\u200b)\u200b)",
    );
  });
});

describe("convertBlocksToReadwiseHighlights", () => {
  it("converts extracted blocks to Readwise highlights", () => {
    const blocks: ExtractedBlock[] = [
      {
        file: {
          path: "Folder/Note.md",
          basename: "Note",
          stat: { ctime: Date.UTC(2026, 0, 2) },
        },
        cleanedText: "  - [Highlight text](https://example.com))",
        blockId: "block123",
        dotTags: ["idea", "important"],
      },
    ];

    expect(
      convertBlocksToReadwiseHighlights(blocks, {
        title: "My Notes",
        author: "Author",
        sourceUrl: "obsidian://open?vault=Vault",
        category: "articles",
        buildHighlightUrl: (file, blockId) => `${file.path}#^${blockId}`,
      }),
    ).toEqual([
      {
        text: "\u00a0\u00a0• [Highlight text](https://example.com)\u200b)\n\n(Note)",
        title: "My Notes",
        author: "Author",
        source_url: "obsidian://open?vault=Vault",
        highlight_url: "Folder/Note.md#^block123",
        category: "articles",
        highlighted_at: "2026-01-02T00:00:00.000Z",
        note: ".idea .important",
      },
    ]);
  });

  it("omits an empty author and empty tag note", () => {
    const block: ExtractedBlock = {
      file: { path: "Note.md", basename: "Note", stat: { ctime: 0 } },
      cleanedText: "Text",
      blockId: "block123",
      dotTags: [],
    };

    const [highlight] = convertBlocksToReadwiseHighlights([block], {
      title: "My Notes",
      author: "",
      sourceUrl: "source",
      category: "books",
      buildHighlightUrl: () => "highlight",
    });
    expect(highlight).toMatchObject({ title: "My Notes", category: "books" });
    expect(highlight).not.toHaveProperty("author");
    expect(highlight).not.toHaveProperty("note");
  });
});
