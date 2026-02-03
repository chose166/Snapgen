import { TableDefinition } from '../types/schema';
import { buildDependencyGraph } from './topo-sort';

/**
 * Group tables into levels where each level can be generated in parallel
 * Level 0: Tables with no dependencies
 * Level 1: Tables that depend only on Level 0
 * Level 2: Tables that depend on Level 0 or 1, etc.
 */
export function groupTablesByLevel(
  tables: TableDefinition[]
): string[][] {
  const graph = buildDependencyGraph(tables);
  const levels: string[][] = [];
  const processed = new Set<string>();
  const tableMap = new Map<string, TableDefinition>();

  tables.forEach((t) => tableMap.set(t.name, t));

  while (processed.size < tables.length) {
    const currentLevel: string[] = [];

    // Find tables where all dependencies are already processed
    for (const table of tables) {
      if (processed.has(table.name)) continue;

      const node = graph.get(table.name);
      if (!node) continue;

      const allDepsProcessed = node.dependencies.every((dep) =>
        processed.has(dep)
      );

      if (allDepsProcessed) {
        currentLevel.push(table.name);
      }
    }

    if (currentLevel.length === 0) {
      // Circular dependency - add remaining tables to avoid infinite loop
      const remaining = tables
        .filter((t) => !processed.has(t.name))
        .map((t) => t.name);
      if (remaining.length > 0) {
        levels.push(remaining);
        remaining.forEach((t) => processed.add(t));
      }
      break;
    }

    levels.push(currentLevel);
    currentLevel.forEach((t) => processed.add(t));
  }

  return levels;
}

/**
 * Calculate estimated time for generation
 */
export function estimateGenerationTime(
  tableCount: number,
  rowsPerTable: number,
  parallelism: number
): number {
  // Rough estimate: 2 seconds per batch of 20 rows
  const batchSize = 20;
  const batchesPerTable = Math.ceil(rowsPerTable / batchSize);
  const secondsPerBatch = 2;

  // With parallelism, we can do multiple batches at once
  const totalBatches = tableCount * batchesPerTable;
  const parallelBatches = Math.ceil(totalBatches / parallelism);

  return parallelBatches * secondsPerBatch;
}
