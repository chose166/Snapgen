/**
 * Snapgen - AI-powered database seeding tool
 *
 * This is the programmatic API for snapgen.
 * For CLI usage, use the snapgen binary.
 */

export * from './types/schema';
export * from './parsers';
export * from './generators/ai';
export * from './generators/faker';
export * from './engine/topo-sort';
export * from './engine/transformer';
export * from './engine/inserter';
export * from './utils/config';
export * from './utils/logger';

/**
 * Main generation function for programmatic usage
 */
import { loadConfig } from './utils/config';
import { parseSchema, detectORM } from './parsers';
import { buildDependencyGraph, topologicalSort } from './engine/topo-sort';
import { generateDataForTable } from './generators/ai';
import { transformForeignKeys } from './engine/transformer';
import { insertData } from './engine/inserter';
import { GenerateOptions, SnapgenConfig } from './types/schema';

export async function generate(options: GenerateOptions = {}): Promise<void> {
  const config = await loadConfig(options.config);

  // Override with options
  if (options.schema) config.schema = options.schema;
  if (options.connection) config.databaseUrl = options.connection;
  if (options.count) config.defaults!.count = parseInt(options.count.toString());

  if (!config.schema) {
    throw new Error('Schema path is required');
  }

  // Parse schema
  const orm = detectORM(config.schema);
  const parsedSchema = await parseSchema(config.schema, orm);

  // Build dependency graph
  let tablesToGenerate = parsedSchema.tables;
  if (options.tables) {
    const tableNames = options.tables.split(',').map((t) => t.trim());
    tablesToGenerate = parsedSchema.tables.filter((t) =>
      tableNames.includes(t.name)
    );
  }

  const graph = buildDependencyGraph(tablesToGenerate);
  const { order } = topologicalSort(graph);

  // Generate data
  const generatedData: Record<string, any[]> = {};
  const idMappings: Record<string, any[]> = {};

  for (const tableName of order) {
    const table = tablesToGenerate.find((t) => t.name === tableName);
    if (!table) continue;

    const count = config.tables?.[tableName]?.count || config.defaults?.count || 50;
    const customPrompt = config.tables?.[tableName]?.aiPrompt;

    const result = await generateDataForTable(
      {
        tableName,
        tableSchema: table,
        count,
        relationships: table.fields
          .filter((f) => f.relation)
          .map((f) => f.relation!),
        enums: parsedSchema.enums,
        customPrompt,
        existingIds: idMappings,
      },
      config
    );

    const transformedRows = transformForeignKeys(result.rows, table, idMappings);
    generatedData[tableName] = transformedRows;
    idMappings[tableName] = result.ids;
  }

  // Insert data
  if (!options.dryRun && config.databaseUrl) {
    for (const tableName of order) {
      if (!generatedData[tableName]) continue;

      await insertData(
        tableName,
        generatedData[tableName],
        config.databaseUrl,
        config.defaults?.batchSize || 500
      );
    }
  }

  return;
}
