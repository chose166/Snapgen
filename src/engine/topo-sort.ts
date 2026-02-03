import {
  TableDefinition,
  DependencyNode,
  TopologicalOrder,
} from '../types/schema';

/**
 * Build dependency graph from table definitions
 */
export function buildDependencyGraph(
  tables: TableDefinition[]
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  // Initialize nodes
  tables.forEach((table) => {
    graph.set(table.name, {
      table: table.name,
      dependencies: [],
      dependents: [],
    });
  });

  // Build edges based on foreign key relationships
  tables.forEach((table) => {
    const node = graph.get(table.name)!;

    table.fields.forEach((field) => {
      if (field.relation && field.relation.foreignKeyField) {
        const relatedTable = field.relation.relatedTable;

        // Skip self-references for now (handle them specially)
        if (relatedTable === table.name) {
          return;
        }

        // This table depends on the related table
        if (!node.dependencies.includes(relatedTable)) {
          node.dependencies.push(relatedTable);
        }

        // The related table has this table as a dependent
        const relatedNode = graph.get(relatedTable);
        if (relatedNode && !relatedNode.dependents.includes(table.name)) {
          relatedNode.dependents.push(table.name);
        }
      }
    });
  });

  return graph;
}

/**
 * Topological sort using Kahn's algorithm
 * Returns both the sort order and any cycles detected
 */
export function topologicalSort(
  graph: Map<string, DependencyNode>
): TopologicalOrder {
  const order: string[] = [];
  const cycles: string[][] = [];

  // Create a copy of the graph for manipulation
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  graph.forEach((node, tableName) => {
    inDegree.set(tableName, node.dependencies.length);
    adjList.set(tableName, [...node.dependents]);
  });

  // Find all nodes with no dependencies
  const queue: string[] = [];
  inDegree.forEach((degree, table) => {
    if (degree === 0) {
      queue.push(table);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    // Reduce in-degree for dependents
    const dependents = adjList.get(current) || [];
    dependents.forEach((dependent) => {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    });
  }

  // Check for cycles (remaining nodes with non-zero in-degree)
  const remaining: string[] = [];
  inDegree.forEach((degree, table) => {
    if (degree > 0) {
      remaining.push(table);
    }
  });

  if (remaining.length > 0) {
    // Detect cycle paths
    cycles.push(detectCycle(graph, remaining));

    // Add remaining nodes to order anyway (best effort)
    // Sort by number of dependencies (fewer first)
    remaining.sort((a, b) => {
      const aDeps = graph.get(a)?.dependencies.length || 0;
      const bDeps = graph.get(b)?.dependencies.length || 0;
      return aDeps - bDeps;
    });

    order.push(...remaining);
  }

  return { order, cycles };
}

/**
 * Detect a cycle in the graph starting from given nodes
 */
function detectCycle(
  graph: Map<string, DependencyNode>,
  startNodes: string[]
): string[] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycle: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    const dependencies = graph.get(node)?.dependencies || [];

    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep)) {
          cycle.unshift(node);
          return true;
        }
      } else if (recStack.has(dep)) {
        // Found cycle
        cycle.push(dep);
        cycle.unshift(node);
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const startNode of startNodes) {
    if (!visited.has(startNode)) {
      if (dfs(startNode)) {
        break;
      }
    }
  }

  return cycle;
}

/**
 * Handle self-referencing tables
 * These should be inserted with nullable FKs first, then updated
 */
export function identifySelfReferences(
  tables: TableDefinition[]
): string[] {
  return tables
    .filter((table) =>
      table.fields.some(
        (field) =>
          field.relation && field.relation.relatedTable === table.name
      )
    )
    .map((table) => table.name);
}
