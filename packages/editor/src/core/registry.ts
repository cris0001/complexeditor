import { z } from 'zod';
import type { Block, ContentDocument } from '../schema/types';
import type { ValidationIssue } from '../schema/validate';
import { STYLE_RULES } from './responsive-css';
import type { AnyBlockDefinition, BlockDefinition, Registry } from './types';

export interface RegistryOptions {
  /**
   * How many nesting containers may sit inside another nesting container.
   * Default 1: `section > columns` is fine, `section > columns > column > grid` is not.
   */
  maxNestingDepth?: number;
}

export function createRegistry(
  definitions: readonly AnyBlockDefinition[],
  { maxNestingDepth = 1 }: RegistryOptions = {},
): Registry {
  const byType = new Map<string, BlockDefinition>();
  for (const def of definitions) {
    // Later definitions replace earlier ones, so projects can override built-ins.
    byType.set(def.type, def as BlockDefinition);
  }

  return {
    get: (type) => byType.get(type),
    has: (type) => byType.has(type),
    all: () => [...byType.values()],
    validateOptions() {
      const blockProps: Record<string, z.ZodType> = {};
      // Props are validated after defaults are applied, exactly as the renderer sees them.
      for (const def of byType.values()) {
        blockProps[def.type] = z.preprocess(
          (value) => ({ ...def.defaultProps, ...(value as Record<string, unknown>) }),
          def.props,
        );
      }
      return { blockProps, knownTypes: [...byType.keys()] };
    },
    textProps() {
      const result: Record<string, readonly string[]> = {};
      for (const def of byType.values()) if (def.textProps?.length) result[def.type] = def.textProps;
      return result;
    },
    responsiveRules() {
      const rules = [...STYLE_RULES];
      for (const def of byType.values()) if (def.responsive) rules.push(...def.responsive);
      return rules;
    },
    maxNestingDepth,
  };
}

/** Number of nesting containers among the ancestors. */
function nestingLevel(registry: Registry, ancestors: readonly Block[]): number {
  return ancestors.filter((a) => registry.get(a.type)?.container?.nests).length;
}

/**
 * Whether a block of `childType` may be placed inside `parent` (or at the top level when `parent` is null).
 * `ancestors` lists the parent's own ancestors, outermost first.
 */
export function canContain(
  registry: Registry,
  parent: Block | null,
  childType: string,
  ancestors: readonly Block[] = [],
): boolean {
  const child = registry.get(childType);
  if (!child) return false;
  if (child.parents) {
    if (!parent || !child.parents.includes(parent.type)) return false;
  }
  if (parent) {
    const rules = registry.get(parent.type)?.container;
    if (!rules) return false;
    if (rules.allowedChildren && !rules.allowedChildren.includes(childType)) return false;
    if (!rules.allowedChildren && child.parents) return false;
  }
  if (child.container?.nests) {
    const chain = parent ? [...ancestors, parent] : [];
    if (nestingLevel(registry, chain) > registry.maxNestingDepth) return false;
  }
  return true;
}

/** Checks placement rules (allowed children, structural parents, nesting depth). */
export function validateStructure(registry: Registry, doc: ContentDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visit = (blocks: readonly Block[], parent: Block | null, ancestors: Block[], prefix: string) => {
    blocks.forEach((block, i) => {
      const path = `${prefix}[${i}]`;
      const def = registry.get(block.type);
      if (!def) return;
      if (!canContain(registry, parent, block.type, ancestors)) {
        issues.push({
          path,
          blockId: block.id,
          message: parent
            ? `Block "${block.type}" is not allowed inside "${parent.type}"`
            : `Block "${block.type}" is not allowed at this position`,
        });
      }
      if (block.children?.length && !def.container) {
        issues.push({
          path: `${path}.children`,
          blockId: block.id,
          message: `Block "${block.type}" cannot have children`,
        });
      }
      const rules = def.container;
      const count = block.children?.length ?? 0;
      if (rules?.minChildren !== undefined && count < rules.minChildren) {
        issues.push({
          path: `${path}.children`,
          blockId: block.id,
          message: `At least ${rules.minChildren} children required`,
        });
      }
      if (rules?.maxChildren !== undefined && count > rules.maxChildren) {
        issues.push({
          path: `${path}.children`,
          blockId: block.id,
          message: `At most ${rules.maxChildren} children allowed`,
        });
      }
      if (block.children) {
        visit(block.children, block, parent ? [...ancestors, parent] : ancestors, `${path}.children`);
      }
    });
  };
  visit(doc.blocks, null, [], 'blocks');
  return issues;
}
