import OpenAI from 'openai';
import * as cliProgress from 'cli-progress';
import {
  GenerationContext,
  GenerationResult,
  SnapgenConfig,
  FieldDefinition,
} from '../types/schema';
import { generateWithFaker } from './faker';
import { logger } from '../utils/logger';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(apiKey?: string): OpenAI {
  if (!openaiClient) {
    if (!apiKey) {
      throw new Error('API key not provided');
    }

    logger.debug(`OpenAI client config: ${JSON.stringify({ hasApiKey: !!apiKey, apiKeyPrefix: apiKey?.substring(0, 10) })}`);
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate data for multiple tables in one API call (level-based batching)
 */
export async function generateLevelBatch(
  contexts: GenerationContext[],
  config: SnapgenConfig
): Promise<Record<string, GenerationResult>> {
  try {
    if (config.ai?.provider === 'openai') {
      return await generateLevelWithOpenAI(contexts, config);
    } else {
      throw new Error(`Unsupported AI provider: ${config.ai?.provider}`);
    }
  } catch (error) {
    logger.warn(`Level batch generation failed: ${error}`);
    logger.info(`Falling back to individual table generation...`);

    // Fallback to individual generation
    const results: Record<string, GenerationResult> = {};
    for (const context of contexts) {
      try {
        results[context.tableName] = await generateWithOpenAI(context, config);
      } catch (tableError) {
        logger.warn(`AI generation failed for ${context.tableName}, using Faker`);
        results[context.tableName] = generateWithFaker(context);
      }
    }
    return results;
  }
}

/**
 * Generate realistic data for a table using AI
 */
export async function generateDataForTable(
  context: GenerationContext,
  config: SnapgenConfig
): Promise<GenerationResult> {
  const { tableName, tableSchema, count } = context;

  try {
    // Use AI generation
    if (config.ai?.provider === 'openai') {
      return await generateWithOpenAI(context, config);
    } else {
      throw new Error(`Unsupported AI provider: ${config.ai?.provider}`);
    }
  } catch (error) {
    logger.warn(`AI generation failed for ${tableName}: ${error}`);
    logger.info(`Falling back to Faker for ${tableName}...`);

    // Fallback to Faker
    return generateWithFaker(context);
  }
}

/**
 * Generate data using OpenAI with automatic batching for large requests
 */
async function generateWithOpenAI(
  context: GenerationContext,
  config: SnapgenConfig
): Promise<GenerationResult> {
  const { tableName, count } = context;

  // Determine optimal batch size based on table complexity
  const batchSize = getOptimalBatchSize(context);

  // If count is small, generate in one go
  if (count <= batchSize) {
    return await generateBatch(context, count, config);
  }

  // Split into batches
  logger.debug(`Splitting ${count} rows into batches of ${batchSize}`);

  const batches: number[] = [];
  let remaining = count;
  while (remaining > 0) {
    const size = Math.min(remaining, batchSize);
    batches.push(size);
    remaining -= size;
  }

  logger.debug(`Generating ${batches.length} batches for ${tableName}`);

  // Generate batches in parallel (with concurrency limit)
  const maxParallel = config.defaults?.parallel || 3;
  const allRows: any[] = [];
  const allIds: any[] = [];

  for (let i = 0; i < batches.length; i += maxParallel) {
    const batchGroup = batches.slice(i, i + maxParallel);

    const promises = batchGroup.map(async (batchCount, idx) => {
      const batchNum = i + idx + 1;
      logger.debug(`Generating batch ${batchNum}/${batches.length} (${batchCount} rows) for ${tableName}`);

      try {
        const result = await generateBatch(
          { ...context, existingIds: { ...context.existingIds } },
          batchCount,
          config
        );
        return result;
      } catch (error) {
        logger.warn(`Batch ${batchNum} failed for ${tableName}, retrying once...`);
        // Retry once
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return await generateBatch(context, batchCount, config);
        } catch (retryError) {
          logger.error(`Batch ${batchNum} failed after retry for ${tableName}`);
          throw retryError;
        }
      }
    });

    const results = await Promise.all(promises);

    results.forEach((result) => {
      allRows.push(...result.rows);
      allIds.push(...result.ids);
    });
  }

  return {
    tableName,
    rows: allRows,
    ids: allIds,
  };
}

/**
 * Generate data for multiple tables in parallel (one API call per table, all in parallel)
 * Much faster than sequential or mega-batch approaches
 */
async function generateLevelWithOpenAI(
  contexts: GenerationContext[],
  config: SnapgenConfig
): Promise<Record<string, GenerationResult>> {
  const totalRows = contexts.reduce((sum, ctx) => sum + ctx.count, 0);
  logger.info(`🚀 Generating ${contexts.length} tables with ${contexts.length} parallel API calls (${totalRows} total rows)`);

  const startTime = Date.now();

  // Generate all tables in parallel using Promise.all
  const promises = contexts.map(async (ctx) => {
    const tableStartTime = Date.now();
    logger.debug(`Starting generation for ${ctx.tableName} (${ctx.count} rows)`);

    try {
      // Generate all rows in a single API call (100 rows per table)
      const result = await generateBatch(ctx, ctx.count, config);

      const tableTime = Date.now() - tableStartTime;
      logger.info(`✓ Generated ${ctx.count} rows for ${ctx.tableName} in ${(tableTime / 1000).toFixed(2)}s`);

      return { tableName: ctx.tableName, result };
    } catch (error) {
      logger.warn(`Failed to generate ${ctx.tableName}: ${error}`);
      logger.info(`Falling back to Faker for ${ctx.tableName}...`);

      const fakerResult = generateWithFaker(ctx);
      return { tableName: ctx.tableName, result: fakerResult };
    }
  });

  // Wait for all tables to complete
  const results = await Promise.all(promises);

  const totalTime = Date.now() - startTime;
  logger.info(`✅ Completed ${contexts.length} tables in ${(totalTime / 1000).toFixed(2)}s (parallel execution)`);

  // Convert results to the expected format
  const finalResults: Record<string, GenerationResult> = {};
  results.forEach(({ tableName, result }) => {
    finalResults[tableName] = result;
  });

  return finalResults;
}

/**
 * Determine optimal batch size based on table complexity
 */
function getOptimalBatchSize(context: GenerationContext): number {
  const { tableSchema } = context;
  const fieldCount = tableSchema.fields.length;

  // More fields = smaller batches to avoid token limits
  if (fieldCount > 15) return 10;  // Complex tables
  if (fieldCount > 10) return 20;  // Medium tables
  return 30;  // Simple tables
}

/**
 * Generate a single batch of data
 */
async function generateBatch(
  context: GenerationContext,
  count: number,
  config: SnapgenConfig
): Promise<GenerationResult> {
  const client = getOpenAIClient(config.ai?.apiKey);
  const { tableName, tableSchema } = context;

  // Build the prompt
  const prompt = buildPrompt({ ...context, count });

  // Log prompt size diagnostics
  const promptLength = prompt.length;
  const estimatedTokens = Math.ceil(promptLength / 4); // Rough estimate: 1 token ≈ 4 chars
  logger.debug(`${tableName} prompt: ${promptLength} chars, ~${estimatedTokens} tokens`);
  if (promptLength > 2000) {
    logger.warn(`${tableName} prompt is large (${promptLength} chars) - this may slow down generation`);
  }

  const maxRetries = config.ai?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.time(`${tableName}-Total`);

      const modelName = config.ai?.model || 'gpt-4o-mini';
      const isGPT5 = modelName.includes('gpt-5');

      // Build API params based on model
      const apiParams: any = {
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a data generation engine. Generate realistic, diverse data that matches the provided schema exactly. Return ONLY valid JSON array, no markdown, no explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      };

      // GPT-5 models use different parameters
      if (isGPT5) {
        apiParams.max_completion_tokens = 16384;
        // GPT-5 only supports temperature=1 (default), so omit it
      } else {
        apiParams.temperature = 0.8;
        apiParams.max_tokens = 16384; // Increased to support 100 rows per call
      }

      console.time(`${tableName}-API`);
      const response = await client.chat.completions.create(apiParams);
      console.timeEnd(`${tableName}-API`);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Parse response
      console.time(`${tableName}-Parse`);
      const parsed = JSON.parse(content);
      const rows = parsed.data || parsed.rows || parsed[tableName] || parsed;
      console.timeEnd(`${tableName}-Parse`);

      if (!Array.isArray(rows)) {
        throw new Error('Response is not an array');
      }

      if (rows.length === 0) {
        throw new Error('Generated 0 rows');
      }

      // Extract IDs
      console.time(`${tableName}-ExtractIDs`);
      const ids = extractIds(rows, tableSchema);
      console.timeEnd(`${tableName}-ExtractIDs`);

      console.timeEnd(`${tableName}-Total`);

      return {
        tableName,
        rows: rows.slice(0, count),
        ids,
      };
    } catch (error: any) {
      lastError = error;
      logger.debug(`Attempt ${attempt + 1} failed: ${error.message}`);

      if (error.status === 429 || error.message?.includes('rate limit')) {
        const waitTime = Math.pow(2, attempt) * 1000;
        logger.debug(`Rate limited, waiting ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Failed to generate batch');
}

/**
 * Build AI prompt for data generation
 */
function buildPrompt(context: GenerationContext): string {
  const {
    tableName,
    tableSchema,
    count,
    relationships,
    enums,
    customPrompt,
    existingIds,
  } = context;

  // Build schema description
  const schemaLines = tableSchema.fields.map((field) => {
    let desc = `  - ${field.name}: ${field.type}`;

    if (field.isId) desc += ' (PRIMARY KEY, auto-generated)';
    if (field.isUnique) desc += ' (UNIQUE)';
    if (field.isRequired) desc += ' (REQUIRED)';
    if (field.enumName) {
      const enumDef = enums.find((e) => e.name === field.enumName);
      if (enumDef) {
        desc += ` (ENUM: ${enumDef.values.join(', ')})`;
      }
    }
    if (field.relation) {
      desc += ` (FK -> ${field.relation.relatedTable}.${field.relation.referencedField})`;
    }

    return desc;
  });

  // Build relationship context
  let relationshipContext = '';
  if (relationships.length > 0) {
    relationshipContext = '\n\nRelationships:\n';
    relationships.forEach((rel) => {
      relationshipContext += `- ${rel.type} with ${rel.relatedTable}\n`;

      // Provide available IDs
      if (existingIds && existingIds[rel.relatedTable]) {
        const ids = existingIds[rel.relatedTable];
        relationshipContext += `  Available ${rel.relatedTable} IDs: [${ids.slice(0, 10).join(', ')}${ids.length > 10 ? '...' : ''}]\n`;
      }
    });
  }

  // Build field-specific rules
  const rules: string[] = [
    'Return ONLY a JSON object with a "data" key containing an array of records',
    'Respect data types strictly (dates as ISO strings, integers as numbers, booleans as true/false)',
    'Generate diverse, realistic data (varied names, locations, dates, etc.)',
    'Ensure temporal consistency (createdAt <= updatedAt if both exist)',
    'For foreign keys, use existing IDs from the available list above',
    'For email fields, use realistic email addresses with common domains (gmail.com, yahoo.com, company.com)',
    'For phone numbers, use valid formats for different countries',
    'For names, include diverse cultural backgrounds',
    'For IDs, use sequential integers starting from 1',
    'For UUIDs, generate valid UUID v4 format',
    'For JSON fields, create valid nested JSON objects',
  ];

  // Add enum rules
  enums.forEach((enumDef) => {
    rules.push(
      `For ${enumDef.name} enum, ONLY use these values: [${enumDef.values.join(', ')}]`
    );
  });

  // Add custom prompt if provided
  if (customPrompt) {
    rules.push(`Additional context: ${customPrompt}`);
  }

  const prompt = `Generate ${count} realistic records for the "${tableName}" table.

Schema:
${schemaLines.join('\n')}
${relationshipContext}

Rules:
${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return format:
{
  "data": [
    { ${tableSchema.fields.map((f) => `"${f.name}": <value>`).join(', ')} },
    ...
  ]
}`;

  return prompt;
}

/**
 * Extract IDs from generated rows for FK references
 */
function extractIds(rows: any[], tableSchema: any): any[] {
  const idFields = tableSchema.fields.filter((f: FieldDefinition) => f.isId);

  if (idFields.length === 0) {
    // No explicit ID field, try common names
    if (rows[0]?.id !== undefined) {
      return rows.map((r) => r.id);
    }
    return rows.map((_, i) => i + 1);
  }

  // Single ID field
  if (idFields.length === 1) {
    const idFieldName = idFields[0].name;
    return rows.map((r) => r[idFieldName]).filter((id) => id !== undefined);
  }

  // Composite key (rare)
  return rows.map((r) => {
    const compositeId: any = {};
    idFields.forEach((f: FieldDefinition) => {
      compositeId[f.name] = r[f.name];
    });
    return compositeId;
  });
}
