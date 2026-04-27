import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("TutorMessageContent", () => {
  it("renders markdown and inline math instead of raw syntax", async () => {
    const { TutorMessageContent } = await import(
      "@/components/tutor-message-content"
    );

    const html = renderToStaticMarkup(
      <TutorMessageContent
        text={`A vector can be:\n- a feature list\n- a direction\n\n\\(x = [\\text{height}, \\text{weight}]\\)`}
      />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain("katex");
    expect(html).not.toContain("\\(");
    expect(html).toContain(">height<");
    expect(html).toContain(">weight<");
  });
});
