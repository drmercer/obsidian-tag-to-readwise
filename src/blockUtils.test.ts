import { describe, expect, it } from "vitest";
import {
  ensureTaggedBlocksHaveIds,
  extractHighlights,
  filterFilesByModifiedTime,
  parseLine,
  randomBlockId,
} from "./blockUtils";

describe("parseLine", () => {
  it("detects when a tag is present in a line", () => {
    const res = parseLine("This line has #review tag", "review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "This line has #review tag",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("handles leading hash in tagName argument", () => {
    const res = parseLine("This line has #review tag", "#review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "This line has #review tag",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("returns hasTag false when tag is not present", () => {
    const res = parseLine("This line has no tag", "review");
    expect(res).toEqual({
      hasTag: false,
      cleanedText: "This line has no tag",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("does not match partial tag names like #reviewed for #review", () => {
    const res = parseLine("This is #reviewed code", "review");
    expect(res).toEqual({
      hasTag: false,
      cleanedText: "This is #reviewed code",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("includes tag when followed by punctuation", () => {
    const res = parseLine("This is #review!", "review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "This is #review!",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("extracts block ID when present at the end of the line", () => {
    const res = parseLine("Some text #review ^abc1234", "review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "Some text",
      dotTags: [],
      blockId: "abc1234",
    });
  });

  it("extracts block ID even when tag is not present", () => {
    const res = parseLine("Some text ^xyz9876", "review");
    expect(res).toEqual({
      hasTag: false,
      cleanedText: "Some text",
      dotTags: [],
      blockId: "xyz9876",
    });
  });

  it("handles special characters in tag name safely", () => {
    const res = parseLine("Testing #tag-name.special", "tag-name.special");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "Testing",
      dotTags: [],
      blockId: undefined,
    });
    const res2 = parseLine(
      "Testing #tag-name.special with more text",
      "tag-name.special",
    );
    expect(res2).toEqual({
      hasTag: true,
      cleanedText: "Testing #tag-name.special with more text",
      dotTags: [],
      blockId: undefined,
    });
  });

  it("handles lines with dot tags correctly", () => {
    const res = parseLine("Some text #review .dot1 .dot2", "review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "Some text",
      dotTags: ["dot1", "dot2"],
      blockId: undefined,
    });
  });

  it("does not extract dot tags when they are not all dot tags", () => {
    const res = parseLine("Some text #review .dot1 notadot", "review");
    expect(res).toEqual({
      hasTag: true,
      cleanedText: "Some text #review .dot1 notadot",
      dotTags: [],
      blockId: undefined,
    });
  });
});

describe("randomBlockId", () => {
  it("generates a 7 character alphanumeric string", () => {
    const id = randomBlockId();
    expect(id).toMatch(/^[a-z0-9]{7}$/);
  });
});

describe("ensureTaggedBlocksHaveIds", () => {
  it("appends block ID to lines containing the tag when ID is missing", () => {
    const input = "First line #review\nSecond line without tag";
    const result = ensureTaggedBlocksHaveIds(input, "review", () => "test123");
    expect(result).toEqual({
      newMarkdown: "First line #review ^test123\nSecond line without tag",
      containedTag: true,
    });
  });

  it("preserves lines that already have a block ID and correctly sets containedTag", () => {
    const input = "Existing #review ^already123\nAnother line #review";
    const result = ensureTaggedBlocksHaveIds(input, "review", () => "newid789");
    expect(result).toEqual({
      newMarkdown:
        "Existing #review ^already123\nAnother line #review ^newid789",
      containedTag: true,
    });
  });

  it("is non-destructive to untagged content and original structure", () => {
    const input = "Header\n\nParagraph 1\n\nParagraph 2 #review\n\nFooter";
    const result = ensureTaggedBlocksHaveIds(input, "review", () => "fixedid");
    expect(result).toEqual({
      newMarkdown:
        "Header\n\nParagraph 1\n\nParagraph 2 #review ^fixedid\n\nFooter",
      containedTag: true,
    });
  });

  it("handles markdown strings without the tag", () => {
    const input = "Header\n\nParagraph 1\n\nFooter";
    const result = ensureTaggedBlocksHaveIds(input, "review");
    expect(result).toEqual({
      newMarkdown: input,
      containedTag: false,
    });
  });

  it("handles empty markdown strings", () => {
    expect(ensureTaggedBlocksHaveIds("", "review")).toEqual({
      newMarkdown: "",
      containedTag: false,
    });
  });
});

describe("filterFilesByModifiedTime", () => {
  const file1 = { path: "f1.md", stat: { mtime: 1000 } };
  const file2 = { path: "f2.md", stat: { mtime: 2000 } };
  const file3 = { path: "f3.md", stat: { mtime: 3000 } };
  const files = [file1, file2, file3];

  it("returns all files when lastSyncedTime is 0 or unassigned", () => {
    expect(filterFilesByModifiedTime(files, 0)).toEqual(files);
  });

  it("filters out files modified strictly before lastSyncedTime", () => {
    expect(filterFilesByModifiedTime(files, 2000)).toEqual([file2, file3]);
  });

  it("returns empty array if no files modified since lastSyncedTime", () => {
    expect(filterFilesByModifiedTime(files, 4000)).toEqual([]);
  });
});

describe("extractHighlights", () => {
  it("extracts tagged lines that have block IDs", () => {
    const input =
      "Line 1 #review ^id12345\nUntagged line ^id67890\nLine 2 #review ^idabcde";
    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      { cleanedText: "Line 1", blockId: "id12345", dotTags: [] },
      { cleanedText: "Line 2", blockId: "idabcde", dotTags: [] },
    ]);
  });

  it("ignores lines containing the tag if block ID is missing", () => {
    const input = "Line 1 #review";
    const res = extractHighlights(input, "review");
    expect(res).toEqual([]);
  });

  it("handles tag names provided with leading hash", () => {
    const input = "Line 1 #review ^id12345";
    const res = extractHighlights(input, "#review");
    expect(res).toEqual([{ cleanedText: "Line 1", blockId: "id12345", dotTags: [] }]);
  });

  it("extracts highlights when tag is in the middle of the line with tag stripping enabled", () => {
    const input = "A line with #review in the middle ^123456";
    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      { cleanedText: "A line with #review in the middle", blockId: "123456", dotTags: [] },
    ]);
  });

  it("includes nested list items with normalized indentation when a list item is tagged", () => {
    const input = [
      "- Parent item #review ^item123",
      "  - Child item 1",
      "  - Child item 2",
      "    - Grandchild item #other",
      "- Sibling item",
    ].join("\n");

    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      {
        cleanedText: "- Parent item\n  - Child item 1\n  - Child item 2\n    - Grandchild item #other",
        blockId: "item123",
        dotTags: [],
      },
    ]);
  });

  it("normalizes indentation when the tagged list item itself is indented", () => {
    const input = [
      "  - Indented parent #review ^item456",
      "    - Child line 1",
      "      - Grandchild line",
      "  - Indented sibling",
    ].join("\n");

    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      {
        cleanedText: "- Indented parent\n  - Child line 1\n    - Grandchild line",
        blockId: "item456",
        dotTags: [],
      },
    ]);
  });

  it("stops nested inclusion on a blank line or sibling/parent list item", () => {
    const input = [
      "1. First numbered item #review ^num123",
      "   - Nested item",
      "",
      "   - Item after blank line",
    ].join("\n");

    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      {
        cleanedText: "1. First numbered item\n   - Nested item",
        blockId: "num123",
        dotTags: [],
      },
    ]);
  });

  it("does not include subsequent lines for tagged non-list items", () => {
    const input = [
      "Regular paragraph line #review ^para123",
      "  Indented line under paragraph",
      "  Another line",
    ].join("\n");

    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      {
        cleanedText: "Regular paragraph line",
        blockId: "para123",
        dotTags: [],
      },
    ]);
  });

  it("does not apply cleaning to additional nested lines", () => {
    const input = [
      "- Main list item #review .tag1 ^main123",
      "  - Nested line with #review .tag2 ^nested456",
    ].join("\n");

    const res = extractHighlights(input, "review");
    expect(res).toEqual([
      {
        cleanedText: "- Main list item\n  - Nested line with #review .tag2 ^nested456",
        blockId: "main123",
        dotTags: ["tag1"],
      },
    ]);
  });
});
