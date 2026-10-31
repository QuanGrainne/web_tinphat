import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("escapes raw html instead of rendering it", () => {
    const html = renderMarkdown("Xin chào <script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks links nofollow noopener", () => {
    const html = renderMarkdown("[DNA](https://example.com/a)");
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain('rel="nofollow noopener"');
  });

  it("does not turn javascript: urls into links", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("<a ");
  });

  it("renders lists and emphasis", () => {
    const html = renderMarkdown("- một\n- **hai**");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>hai</strong>");
  });
});
