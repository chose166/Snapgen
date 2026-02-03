import { z } from 'zod';

/**
 * Core schema types for representing database schemas
 */

export type FieldType =
  | 'String'
  | 'Int'
  | 'BigInt'
  | 'Float'
  | 'Decimal'
  | 'Boolean'
  | 'DateTime'
  | 'Date'
  | 'Time'
  | 'Json'
  | 'Bytes'
  | 'Uuid'
  | 'Enum';

export interface EnumDefinition {
  name: string;
  values: string[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  isArray: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  default?: any;
  enumName?: string; // Reference to enum definition
  relation?: RelationInfo;
}

export interface RelationInfo {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  relatedTable: string;
  foreignKeyField?: string; // Field in this table
  referencedField?: string; // Field in related table (usually 'id')
  isNullable: boolean;
}

export interface TableDefinition {
  name: string;
  fields: FieldDefinition[];
  primaryKey: readonly string[];
  uniqueConstraints: readonly (readonly string[])[]; // Array of field name arrays
}

export interface ParsedSchema {
  tables: TableDefinition[];
  enums: EnumDefinition[];
  metadata: {
    orm: 'prisma' | 'drizzle';
    sourceFile: string;
  };
}

/**
 * Configuration types
 */

export const ConfigSchema = z.object({
  schema: z.string().optional(),
  databaseUrl: z.string().optional(),
  ai: z
    .object({
      provider: z.enum(['openai']).default('openai'),
      model: z.string().default('gpt-4o-mini'),
      apiKey: z.string().optional(),
      maxRetries: z.number().default(3),
      timeout: z.number().default(30000),
    })
    .optional(),
  defaults: z
    .object({
      count: z.number().default(50),
      parallel: z.number().default(5),
      batchSize: z.number().default(500),
    })
    .optional(),
  tables: z
    .record(
      z.object({
        count: z.number().optional(),
        aiPrompt: z.string().optional(),
        skip: z.boolean().optional(),
      })
    )
    .optional(),
});

export type SnapgenConfig = z.infer<typeof ConfigSchema>;

/**
 * Generation context types
 */

export interface GenerationContext {
  tableName: string;
  tableSchema: TableDefinition;
  count: number;
  relationships: RelationInfo[];
  enums: EnumDefinition[];
  customPrompt?: string;
  existingIds?: Record<string, any[]>; // For FK resolution
}

export interface GeneratedRow {
  [key: string]: any;
}

export interface GenerationResult {
  tableName: string;
  rows: GeneratedRow[];
  ids: any[]; // Generated IDs for FK references
}

/**
 * Dependency graph types
 */

export interface DependencyNode {
  table: string;
  dependencies: string[]; // Tables this one depends on
  dependents: string[]; // Tables that depend on this one
}

export interface TopologicalOrder {
  order: string[]; // Table names in insert order
  cycles: string[][]; // Any circular dependencies detected
}

/**
 * Insert operation types
 */

export interface InsertBatch {
  tableName: string;
  rows: GeneratedRow[];
  order: number; // Execution order
}

export interface InsertResult {
  tableName: string;
  inserted: number;
  failed: number;
  errors: string[];
  ids: any[]; // Generated/returned IDs
}

/**
 * CLI option types
 */

export interface GenerateOptions {
  schema?: string;
  count?: number;
  tables?: string;
  connection?: string;
  dryRun?: boolean;
  aiProvider?: 'openai' | 'anthropic';
  output?: string;
  config?: string;
  verbose?: boolean;
}
