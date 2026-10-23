import { DOCUMENT_VERSION, migrate, type MigrateOptions } from './migrate';
import {
  DocumentValidationError,
  validateDocument,
  type ValidateOptions,
  type ValidationResult,
} from './validate';
import type { ContentDocument } from './types';

export type ParseOptions = MigrateOptions & ValidateOptions;

/** Migrates and validates stored JSON. Never throws; migration failures are reported as errors. */
export function safeParseDocument(input: unknown, options: ParseOptions = {}): ValidationResult {
  let migrated: ContentDocument;
  try {
    migrated = migrate(input, options);
  } catch (error) {
    return { success: false, warnings: [], errors: [{ path: 'version', message: (error as Error).message }] };
  }
  return validateDocument(migrated, options);
}

/** Like `safeParseDocument`, but throws `DocumentValidationError` on failure. */
export function parseDocument(input: unknown, options: ParseOptions = {}): ContentDocument {
  const result = safeParseDocument(input, options);
  if (!result.success) throw new DocumentValidationError(result.errors);
  return result.document;
}

export function createEmptyDocument(): ContentDocument {
  return { version: DOCUMENT_VERSION, blocks: [] };
}
