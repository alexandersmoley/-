// Turns the approved article into the block list the vc.ru editor has to end up containing,
// and into the checklist the draft is verified against afterwards.
//
// This is deliberately separate from the browser driving: the conversion is pure logic and can
// be tested without a network, so when a draft comes out wrong it is clear whether the article
// was read wrong or the editor was filled wrong.

const HEADING = /^(#{1,6})\s+(.*)$/u;
const LIST_ITEM = /^[-*]\s+(.*)$/u;
const QUOTE = /^>\s?(.*)$/u;
const FENCE_LINE = /^`([^`]+)`$/u;

// The editor takes plain text, so inline markdown is stripped — but the words themselves must
// survive untouched, because they are what the verification compares.
export function stripInline(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/gsu, '$1')
    .replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*(?=[\s.,;:!?)]|$)/gsu, '$1$2')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, '$1 $2')
    .trim();
}

export function parseArticle(markdown) {
  const withoutFrontMatter = markdown.replace(/^---\n[\s\S]*?\n---\n\n?/u, '');
  const lines = withoutFrontMatter.split('\n');

  let title = null;
  const blocks = [];
  let paragraph = [];
  let list = null;
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'paragraph', text: stripInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ type: 'list', items: list });
    list = null;
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push({ type: 'quote', text: stripInline(quote.join(' ')) });
    quote = [];
  };
  const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') { flushAll(); continue; }

    const heading = line.match(HEADING);
    if (heading) {
      flushAll();
      const [, hashes, text] = heading;
      if (hashes.length === 1 && title === null) title = stripInline(text);
      else blocks.push({ type: 'heading', level: hashes.length, text: stripInline(text) });
      continue;
    }

    const quoted = line.match(QUOTE);
    if (quoted) { flushParagraph(); flushList(); quote.push(quoted[1]); continue; }

    const item = line.match(LIST_ITEM);
    if (item) {
      flushParagraph(); flushQuote();
      list ??= [];
      // The article writes list items ending in a semicolon; that punctuation is the author's
      // and is kept, so the verification compares like with like.
      list.push(stripInline(item[1]));
      continue;
    }

    // A line that is nothing but a backticked chain is one of the article's schema lines. The
    // channel contract says it becomes its own paragraph when the editor has no safe code block.
    const fenced = line.match(FENCE_LINE);
    if (fenced) { flushAll(); blocks.push({ type: 'schema', text: fenced[1].trim() }); continue; }

    flushList(); flushQuote();
    paragraph.push(line.trim());
  }
  flushAll();

  if (!title) throw new Error('The article has no H1 title');
  return { title, blocks };
}

// Everything the finished draft must contain, in order. The channel contract names these:
// title, every heading, every paragraph, every list, the Telegram link, the Instagram footnote.
export function expectedContent(article) {
  const headings = article.blocks.filter((b) => b.type === 'heading').map((b) => b.text);
  const paragraphs = article.blocks.filter((b) => b.type === 'paragraph').map((b) => b.text);
  const lists = article.blocks.filter((b) => b.type === 'list').map((b) => b.items);
  const quotes = article.blocks.filter((b) => b.type === 'quote').map((b) => b.text);
  const schemas = article.blocks.filter((b) => b.type === 'schema').map((b) => b.text);
  const all = article.blocks.flatMap((b) => (b.type === 'list' ? b.items : [b.text]));
  return {
    title: article.title,
    headings,
    paragraphs,
    lists,
    quotes,
    schemas,
    telegramLink: all.find((text) => text.includes('t.me/a_smoley')) ?? null,
    instagramFootnote: quotes.find((text) => text.includes('Instagram')) ?? null,
    blockCount: article.blocks.length
  };
}

// Compares what the editor ended up holding against what the article says it must hold.
// Reports what is missing rather than a pass/fail, because a draft that lost one paragraph
// needs to say which one.
export function verifyDraft(expected, renderedText) {
  const haystack = renderedText.replace(/\s+/gu, ' ');
  const contains = (needle) => haystack.includes(String(needle).replace(/\s+/gu, ' ').trim());
  const missing = [];
  if (!contains(expected.title)) missing.push({ kind: 'title', text: expected.title });
  for (const text of expected.headings) if (!contains(text)) missing.push({ kind: 'heading', text });
  for (const text of expected.paragraphs) if (!contains(text)) missing.push({ kind: 'paragraph', text });
  for (const items of expected.lists) {
    for (const text of items) if (!contains(text)) missing.push({ kind: 'list-item', text });
  }
  for (const text of expected.quotes) if (!contains(text)) missing.push({ kind: 'quote', text });
  for (const text of expected.schemas) if (!contains(text)) missing.push({ kind: 'schema', text });
  if (expected.telegramLink && !contains('t.me/a_smoley')) {
    missing.push({ kind: 'telegram-link', text: expected.telegramLink });
  }
  return { ok: missing.length === 0, missing };
}
