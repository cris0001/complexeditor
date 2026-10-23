import type { z } from 'zod';
import { documentSchema } from './zod';
import type { Block, ContentDocument } from './types';

export interface ValidationIssue {
  /** Human-readable path, e.g. `blocks[2].children[0].props.level`. */
  path: string;
  message: string;
  blockId?: string;
}

export interface ValidateOptions {
  /** Prop schemas per block type. Blocks of other types only get the generic check. */
  blockProps?: Record<string, z.ZodType>;
  /** Known block types. Unknown types produce a warning (the renderer shows a fallback), not an error. */
  knownTypes?: Iterable<string>;
}

export type ValidationResult =
  | { success: true; document: ContentDocument; warnings: ValidationIssue[] }
  | { success: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export function formatPath(path: readonly PropertyKey[], prefix = ''): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === 'number') return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, prefix);
}

/** Validates a document (already migrated to the current version) and reports every issue with its path. */
export function validateDocument(input: unknown, options: ValidateOptions = {}): ValidationResult {
  const warnings: ValidationIssue[] = [];
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      warnings,
      errors: parsed.error.issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
    };
  }

  const doc = parsed.data;
  const errors: ValidationIssue[] = [];
  const known = options.knownTypes ? new Set(options.knownTypes) : undefined;
  const seen = new Set<string>();

  const visit = (blocks: readonly Block[], prefix: string) =>
    blocks.forEach((block, i) => {
      const path = `${prefix}[${i}]`;
      if (seen.has(block.id)) {
        errors.push({ path: `${path}.id`, message: `Duplicate block id "${block.id}"`, blockId: block.id });
      }
      seen.add(block.id);

      if (known && !known.has(block.type)) {
        warnings.push({
          path: `${path}.type`,
          message: `Unknown block type "${block.type}"`,
          blockId: block.id,
        });
      } else {
        const result = options.blockProps?.[block.type]?.safeParse(block.props);
        if (result && !result.success) {
          for (const issue of result.error.issues) {
            errors.push({
              path: formatPath(issue.path, `${path}.props`),
              message: issue.message,
              blockId: block.id,
            });
          }
        }
      }
      if (block.children) visit(block.children, `${path}.children`);
    });
  visit(doc.blocks, 'blocks');

  return errors.length ? { success: false, errors, warnings } : { success: true, document: doc, warnings };
}

export class DocumentValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(`Invalid document:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`);
    this.name = 'DocumentValidationError';
  }
}
