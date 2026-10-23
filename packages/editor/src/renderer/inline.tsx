import { Fragment, type ReactNode } from 'react';
import { sanitizeUrl } from '../schema/url';
import type { InlineContent, Mark, TextNode } from '../schema/types';
import { colorToCss } from '../core/style';
import type { RenderContext } from '../core/types';

type LinkMark = Extract<Mark, { type: 'link' }>;

/** Marks from outermost to innermost, so equal formatting always produces the same markup. */
const ORDER: Mark['type'][] = [
  'color',
  'highlight',
  'bold',
  'italic',
  'underline',
  'strike',
  'superscript',
  'subscript',
  'code',
];

function withLineBreaks(text: string): ReactNode {
  if (!text.includes('\n')) return text;
  const parts = text.split('\n');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {part}
    </Fragment>
  ));
}

function wrap(mark: Mark, node: ReactNode): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong>{node}</strong>;
    case 'italic':
      return <em>{node}</em>;
    case 'underline':
      return <u>{node}</u>;
    case 'strike':
      return <s>{node}</s>;
    case 'code':
      return <code className="ce-code-inline">{node}</code>;
    case 'superscript':
      return <sup>{node}</sup>;
    case 'subscript':
      return <sub>{node}</sub>;
    case 'highlight':
      return (
        <mark className="ce-mark" style={mark.color ? { '--ce-mark': colorToCss(mark.color) } : undefined}>
          {node}
        </mark>
      );
    case 'color':
      return (
        <span className="ce-color" style={{ '--ce-text-color': colorToCss(mark.color) }}>
          {node}
        </span>
      );
    case 'link':
      return node;
  }
}

function renderNode(node: TextNode): ReactNode {
  const marks = [...(node.marks ?? [])].filter((m) => m.type !== 'link');
  marks.sort((a, b) => ORDER.indexOf(b.type) - ORDER.indexOf(a.type));
  return marks.reduce<ReactNode>((acc, mark) => wrap(mark, acc), withLineBreaks(node.text));
}

const linkOf = (node: TextNode) => node.marks?.find((m): m is LinkMark => m.type === 'link');
const sameLink = (a?: LinkMark, b?: LinkMark) =>
  a === b || (!!a && !!b && a.href === b.href && !!a.newTab === !!b.newTab && a.rel === b.rel);

export function linkAttributes(mark: Pick<LinkMark, 'newTab' | 'rel'>): { target?: string; rel?: string } {
  const rel = new Set((mark.rel ?? '').split(/\s+/).filter(Boolean));
  if (mark.newTab) {
    rel.add('noopener');
    rel.add('noreferrer');
  }
  return { target: mark.newTab ? '_blank' : undefined, rel: rel.size ? [...rel].join(' ') : undefined };
}

/** Renders inline content. Consecutive runs with the same link become a single `<a>`. */
export function renderInlineContent(
  content: InlineContent | undefined,
  ctx: Pick<RenderContext, 'components'>,
): ReactNode {
  if (!content?.length) return null;
  const groups: { link?: LinkMark; nodes: TextNode[] }[] = [];
  for (const node of content) {
    const link = linkOf(node);
    const last = groups[groups.length - 1];
    if (last && sameLink(last.link, link)) last.nodes.push(node);
    else groups.push({ link, nodes: [node] });
  }
  const { Link } = ctx.components;
  return groups.map((group, i) => {
    const children = group.nodes.map((node, j) => <Fragment key={j}>{renderNode(node)}</Fragment>);
    const href = group.link && sanitizeUrl(group.link.href);
    if (!group.link || !href) return <Fragment key={i}>{children}</Fragment>;
    return (
      <Link key={i} href={href} className="ce-link" {...linkAttributes(group.link)}>
        {children}
      </Link>
    );
  });
}
