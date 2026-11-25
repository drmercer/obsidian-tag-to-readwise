import { describe, expect, it } from "vitest";
import {
  convertBlocksToReadwiseHighlights,
  ExtractedBlock,
  convertRelativeMarkdownLinks,
  convertWikiLinks,
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

describe("convertRelativeMarkdownLinks", () => {
  it("converts relative note links using the source note's directory", () => {
    expect(
      convertRelativeMarkdownLinks(
        "[Other](../Other Note.md#Part)",
        "Folder/Current.md",
        "My Vault",
        true,
      ),
    ).toBe(
      "[Other](https://danmercer.net/tools/obsidianurl#obsidian://open?vault=My%20Vault&file=Other%20Note.md%23Part)",
    );
  });

  it("leaves absolute links unchanged and converts same-note fragments", () => {
    expect(
      convertRelativeMarkdownLinks(
        "[Web](https://example.com) [Section](#heading)",
        "Folder/Current.md",
        "Vault",
        true,
      ),
    ).toBe(
      "[Web](https://example.com) [Section](https://danmercer.net/tools/obsidianurl#obsidian://open?vault=Vault&file=Folder%2FCurrent.md%23heading)",
    );
  });

  it("leaves relative links unchanged when conversion is disabled", () => {
    expect(
      convertRelativeMarkdownLinks(
        "[Other](../Other.md)",
        "Folder/Current.md",
        "Vault",
        false,
      ),
    ).toBe("[Other](../Other.md)");
  });
});

describe("convertWikiLinks", () => {
  it("converts wiki links and aliases to Markdown links with redirect URLs", () => {
    expect(convertWikiLinks("[[some note]] and [[target|display text]]", true, "My Vault")).toBe(
      "[some note](https://danmercer.net/tools/obsidianurl#obsidian://open?vault=My%20Vault&name=some%20note) and [display text](https://danmercer.net/tools/obsidianurl#obsidian://open?vault=My%20Vault&name=target)",
    );
  });

  it("leaves wiki links unchanged when rendering clickable links is disabled", () => {
    expect(convertWikiLinks("[[some note]]", false, "Vault")).toBe("[[some note]]");
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
        vaultName: "Vault",
        convertRelativeLinks: false,
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
      vaultName: "Vault",
      convertRelativeLinks: false,
      buildHighlightUrl: () => "highlight",
    });
    expect(highlight).toMatchObject({ title: "My Notes", category: "books" });
    expect(highlight).not.toHaveProperty("author");
    expect(highlight).not.toHaveProperty("note");
  });
});
