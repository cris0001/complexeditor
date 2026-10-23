import type { ContentDocument } from './types';

/** Current version of the document format. Bump together with a new migration. */
export const DOCUMENT_VERSION = 1;

/** Upgrades a raw document from `from` to `from + 1`. Must be pure. */
export interface Migration {
  from: number;
  // Raw JSON of an older version: its shape is by definition unknown to the current types.
  migrate: (doc: Record<string, unknown>) => Record<string, unknown>;
}

/** Built-in migrations. Version 1 is the first public format, so the list starts empty. */
export const migrations: readonly Migration[] = [];

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export interface MigrateOptions {
  migrations?: readonly Migration[];
  targetVersion?: number;
}

export function needsMigration(doc: { version?: unknown }, targetVersion = DOCUMENT_VERSION): boolean {
  return doc.version !== targetVersion;
}

/**
 * Upgrades a stored document to the current format by applying migrations in sequence.
 * Does not validate; call `validateDocument` (or use `parseDocument`) afterwards.
 */
export function migrate(input: unknown, options: MigrateOptions = {}): ContentDocument {
  const list = options.migrations ?? migrations;
  const target = options.targetVersion ?? DOCUMENT_VERSION;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new MigrationError('Document must be an object');
  }
  let doc = input as Record<string, unknown>;
  if (typeof doc.version !== 'number' || !Number.isInteger(doc.version) || doc.version < 1) {
    throw new MigrationError('Document has no valid "version" field');
  }
  let version: number = doc.version;
  if (version > target) {
    throw new MigrationError(
      `Document version ${version} is newer than supported version ${target}; upgrade complexeditor`,
    );
  }
  while (version < target) {
    const from = version;
    const step = list.find((m) => m.from === from);
    if (!step) throw new MigrationError(`No migration from version ${from}`);
    version = from + 1;
    doc = { ...step.migrate(structuredClone(doc)), version };
  }
  return doc as unknown as ContentDocument;
}
