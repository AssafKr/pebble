import {marked} from 'marked';

marked.use({
  breaks: true,
  renderer: {
    link({href, title, tokens}) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    },
  },
});

export function renderMarkdown(text: string): string {
  return marked.parse(text, {async: false}) as string;
}
