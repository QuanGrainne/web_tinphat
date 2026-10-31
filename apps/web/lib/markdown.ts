import MarkdownIt from "markdown-it";

// Raw HTML in the source is escaped, and markdown-it already refuses javascript:/vbscript:/data: links.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const renderLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("rel", "nofollow noopener");
  return renderLinkOpen(tokens, idx, options, env, self);
};

/** Product description (staff-authored markdown) -> safe HTML string. */
export function renderMarkdown(source: string): string {
  return md.render(source);
}
