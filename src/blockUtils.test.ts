import { describe, expect, it } from "vitest";
import { ensureTaggedBlocksHaveIds, parseLine, randomBlockId } from "./blockUtils";

describe("parseLine", () => {
  it("detects when a tag is present in a line", () => {
    const res = parseLine("This line has #review tag", "review");
    expect(res).toEqual({ hasTag: true });
  });

  it("handles leading hash in tagName argument", () => {
    const res = parseLine("This line has #review tag", "#review");
    expect(res).toEqual({ hasTag: true });
  });

  it("returns hasTag false when tag is not present", () => {
    const res = parseLine("This line has no tag", "review");
    expect(res).toEqual({ hasTag: false });
  });

  it("does not match partial tag names like #reviewed for #review", () => {
    const res = parseLine("This is #reviewed code", "review");
    expect(res).toEqual({ hasTag: false });
  });

  it("extracts block ID when present at the end of the line", () => {
    const res = parseLine("Some text #review ^abc1234", "review");
    expect(res).toEqual({ hasTag: true, blockId: "abc1234" });
  });

  it("extracts block ID even when tag is not present", () => {
    const res = parseLine("Some text ^xyz9876", "review");
    expect(res).toEqual({ hasTag: false, blockId: "xyz9876" });
  });

  it("handles special characters in tag name safely", () => {
    const res = parseLine("Testing #tag-name.special", "tag-name.special");
    expect(res).toEqual({ hasTag: true });
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
    expect(result).toBe("First line #review ^test123\nSecond line without tag");
  });

  it("preserves lines that already have a block ID", () => {
    const input = "Existing #review ^already123\nAnother line #review";
    const result = ensureTaggedBlocksHaveIds(input, "review", () => "newid789");
    expect(result).toBe("Existing #review ^already123\nAnother line #review ^newid789");
  });

  it("is non-destructive to untagged content and original structure", () => {
    const input = "Header\n\nParagraph 1\n\nParagraph 2 #review\n\nFooter";
    const result = ensureTaggedBlocksHaveIds(input, "review", () => "fixedid");
    expect(result).toBe("Header\n\nParagraph 1\n\nParagraph 2 #review ^fixedid\n\nFooter");
  });

  it("handles empty markdown strings", () => {
    expect(ensureTaggedBlocksHaveIds("", "review")).toBe("");
  });
});
