import type { ElementContent, Root, RootContent } from 'hast';
import { common, createLowlight } from 'lowlight';
import type { CodeHighlighter, CodeToken } from './types';

let lowlight: ReturnType<typeof createLowlight> | undefined;

function flatten(nodes: (RootContent | ElementContent)[], classes: string[], out: CodeToken[]): void {
  for (const node of nodes) {
    if (node.type === 'text') out.push({ text: node.value, classes });
    else if (node.type === 'element') {
      const own = node.properties?.className;
      const next = Array.isArray(own) ? [...classes, ...own.map(String)] : classes;
      flatten(node.children, next, out);
    }
  }
}

/**
 * Default highlighter: highlight.js grammars (the "common" set, ~35 languages) through lowlight.
 * Returns plain tokens so the renderer builds React elements itself (no HTML strings).
 */
export const defaultHighlighter: CodeHighlighter = (code, language) => {
  if (!language || language === 'text' || language === 'plain') return null;
  lowlight ??= createLowlight(common);
  if (!lowlight.registered(language)) return null;
  const tree: Root = lowlight.highlight(language, code);
  const tokens: CodeToken[] = [];
  flatten(tree.children, [], tokens);
  return tokens;
};

/** Languages offered by the editor's language picker. */
export const CODE_LANGUAGES = [
  'text',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'go',
  'graphql',
  'java',
  'javascript',
  'json',
  'kotlin',
  'markdown',
  'php',
  'python',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml',
] as const;

/** Splits token runs into lines (for line numbers). */
export function splitLines(tokens: CodeToken[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1]!.push({ text: part, classes: token.classes });
    });
  }
  return lines;
}
