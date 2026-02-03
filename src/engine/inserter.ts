import { Pool, PoolClient } from 'pg';
import { GeneratedRow, InsertResult } from '../types/schema';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
function getPool(connectionString: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Test database connection
 */
export async function testConnection(connectionString: string): Promise<void> {
  const testPool = new Pool({
    connectionString,
    max: 1,
  });

  try {
    const client = await testPool.connect();
    await client.query('SELECT NOW()');
    client.release();
  } finally {
    await testPool.end();
  }
}

/**
 * Insert data into a table with batching
 */
export async function insertData(
  tableName: string,
  rows: GeneratedRow[],
  connectionString: string,
  batchSize = 500
): Promise<InsertResult> {
  const pool = getPool(connectionString);
  const result: InsertResult = {
    tableName,
    inserted: 0,
    failed: 0,
    errors: [],
    ids: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // Split into batches
  const batches: GeneratedRow[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    for (const batch of batches) {
      try {
        const batchResult = await insertBatch(client, tableName, batch);
        result.inserted += batchResult.inserted;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);
        result.ids.push(...batchResult.ids);
      } catch (error) {
        result.failed += batch.length;
        result.errors.push(`Batch failed: ${error}`);
        logger.debug(`Batch insert failed for ${tableName}: ${error}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return result;
}

/**
 * Insert a single batch of rows
 */
async function insertBatch(
  client: PoolClient,
  tableName: string,
  rows: GeneratedRow[]
): Promise<InsertResult> {
  const result: InsertResult = {
    tableName,
    inserted: 0,
    failed: 0,
    errors: [],
    ids: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // Get column names from first row
  const columns = Object.keys(rows[0]);

  // Build INSERT query with ON CONFLICT DO NOTHING for safety
  const placeholders: string[] = [];
  const values: any[] = [];

  rows.forEach((row, rowIndex) => {
    const rowPlaceholders: string[] = [];

    columns.forEach((col, colIndex) => {
      const paramIndex = rowIndex * columns.length + colIndex + 1;
      rowPlaceholders.push(`$${paramIndex}`);

      let value = row[col];

      // Handle special types
      if (value !== null && value !== undefined) {
        // Convert objects to JSON strings
        if (typeof value === 'object' && !Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        // Convert dates to ISO strings
        else if (value instanceof Date) {
          value = value.toISOString();
        }
      }

      values.push(value);
    });

    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  });

  const query = `
    INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT DO NOTHING
    RETURNING *
  `;

  try {
    const queryResult = await client.query(query, values);
    result.inserted = queryResult.rowCount || 0;
    result.failed = rows.length - result.inserted;

    // Extract IDs from returned rows
    if (queryResult.rows.length > 0) {
      const firstRow = queryResult.rows[0];
      const idField = Object.keys(firstRow).find(
        (key) => key === 'id' || key.endsWith('_id')
      );

      if (idField) {
        result.ids = queryResult.rows.map((r) => r[idField]);
      }
    }

    if (result.failed > 0) {
      result.errors.push(
        `${result.failed} rows skipped due to conflicts (likely duplicates)`
      );
    }
  } catch (error: any) {
    result.failed = rows.length;
    result.errors.push(error.message);

    // Log detailed error for debugging
    logger.debug(`Insert query: ${query.substring(0, 200)}...`);
    logger.debug(`Values: ${JSON.stringify(values.slice(0, 10))}...`);
    logger.debug(`Error: ${error.message}`);

    throw error;
  }

  return result;
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute raw SQL query (for advanced use cases)
 */
export async function executeQuery(
  connectionString: string,
  query: string,
  params: any[] = []
): Promise<any> {
  const pool = getPool(connectionString);
  const result = await pool.query(query, params);
  return result;
}

/**
 * Truncate a table (for testing/reset)
 */
export async function truncateTable(
  connectionString: string,
  tableName: string,
  cascade = false
): Promise<void> {
  const pool = getPool(connectionString);
  const cascadeClause = cascade ? 'CASCADE' : '';
  await pool.query(`TRUNCATE TABLE "${tableName}" ${cascadeClause}`);
}
