import { Command } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import ora from 'ora';
import { loadConfig, validateConfig } from '../../utils/config';
import { logger } from '../../utils/logger';
import { GenerateOptions } from '../../types/schema';
import { detectORM, parseSchema } from '../../parsers';
import { buildDependencyGraph, topologicalSort } from '../../engine/topo-sort';
import { generateDataForTable } from '../../generators/ai';
import { transformForeignKeys } from '../../engine/transformer';
import { insertData, testConnection } from '../../engine/inserter';
import { generateSeedFile } from '../../templates/seed-template';

export const generateCommand = new Command('generate')
  .description('Generate and seed realistic data')
  .option('-s, --schema <path>', 'Path to Prisma or Drizzle schema')
  .option('-c, --count <number>', 'Number of rows per table', '100')
  .option('-t, --tables <list>', 'Comma-separated list of specific tables')
  .option('--connection <url>', 'PostgreSQL connection string')
  .option('--dry-run', 'Generate SQL file instead of inserting', false)
  .option(
    '--ai-provider <provider>',
    'AI provider (openai)',
    'openai'
  )
  .option('-o, --output <path>', 'Generate TypeScript seed file')
  .option('--config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose logging', false)
  .action(async (options: GenerateOptions) => {
    const startTime = Date.now();

    if (options.verbose) {
      logger.setVerbose(true);
    }

    try {
      // Load configuration
      const config = await loadConfig(options.config);

      // Override config with CLI options
      if (options.schema) config.schema = options.schema;
      if (options.connection) config.databaseUrl = options.connection;
      if (options.aiProvider) config.ai!.provider = options.aiProvider as any;
      if (options.count) config.defaults!.count = parseInt(options.count.toString());

      validateConfig(config);

      // Find and validate schema file
      if (!config.schema) {
        logger.error('Schema path not provided!');
        logger.info('Please specify --schema or set it in snapgen.config.ts');
        logger.info('Run "snapgen init" to create a config file');
        process.exit(1);
      }

      const schemaPath = resolve(process.cwd(), config.schema);
      if (!existsSync(schemaPath)) {
        logger.error(`Schema file not found: ${schemaPath}`);
        process.exit(1);
      }

      logger.info(`Using schema: ${schemaPath}`);

      // Step 1: Parse schema
      const spinner = ora('Parsing schema...').start();
      const orm = detectORM(schemaPath);
      logger.debug(`Detected ORM: ${orm}`);

      const parsedSchema = await parseSchema(schemaPath, orm);
      spinner.succeed(
        `Parsed ${parsedSchema.tables.length} tables, ${parsedSchema.enums.length} enums`
      );

      // Filter tables if specified
      let tablesToGenerate = parsedSchema.tables;
      if (options.tables) {
        const tableNames = options.tables.split(',').map((t) => t.trim());
        tablesToGenerate = parsedSchema.tables.filter((t) =>
          tableNames.includes(t.name)
        );
        logger.info(`Filtering to ${tablesToGenerate.length} tables`);
      }

      // Apply config skip rules
      tablesToGenerate = tablesToGenerate.filter(
        (t) => !config.tables?.[t.name]?.skip
      );

      // Step 2: Build dependency graph and sort
      spinner.start('Building dependency graph...');
      const graph = buildDependencyGraph(tablesToGenerate);
      const { order, cycles } = topologicalSort(graph);

      if (cycles.length > 0) {
        spinner.warn('Detected circular dependencies:');
        cycles.forEach((cycle) => logger.warn(`  ${cycle.join(' -> ')}`));
      }

      spinner.succeed(`Sorted ${order.length} tables by dependencies`);
      logger.debug(`Insert order: ${order.join(' -> ')}`);

      // Step 3: Test database connection (unless output mode)
      if (!options.output && !options.dryRun) {
        if (!config.databaseUrl) {
          logger.error('Database URL not provided!');
          logger.info('Set DATABASE_URL env var or use --connection flag');
          process.exit(1);
        }

        spinner.start('Testing database connection...');
        try {
          await testConnection(config.databaseUrl);
          spinner.succeed('Connected to database');
        } catch (error) {
          spinner.fail('Failed to connect to database');
          logger.error(String(error));
          process.exit(1);
        }
      }

      // Step 4: Generate data with parallel processing
      const generatedData: Record<string, any[]> = {};
      const idMappings: Record<string, any[]> = {};

      // Import parallel grouping
      const { groupTablesByLevel, estimateGenerationTime } = await import('../../engine/parallel');
      const levels = groupTablesByLevel(tablesToGenerate);

      logger.info(`Processing ${levels.length} dependency levels`);
      const totalRows = order.reduce((sum, name) => {
        return sum + (config.tables?.[name]?.count || config.defaults?.count || 50);
      }, 0);
      const estimatedTime = estimateGenerationTime(
        order.length,
        config.defaults?.count || 50,
        config.defaults?.parallel || 3
      );
      logger.debug(`Estimated time: ~${Math.ceil(estimatedTime / 60)} minutes for ${totalRows} total rows`);

      for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
        const level = levels[levelIdx];
        logger.info(`Level ${levelIdx + 1}/${levels.length}: Processing ${level.length} tables in parallel (${level.length} API calls)`);

        try {
          // Build contexts for all tables in this level
          const contexts = level.map((tableName) => {
            const table = tablesToGenerate.find((t) => t.name === tableName);
            if (!table) throw new Error(`Table ${tableName} not found`);

            const count =
              config.tables?.[tableName]?.count || config.defaults?.count || 50;
            const customPrompt = config.tables?.[tableName]?.aiPrompt;

            return {
              tableName,
              tableSchema: table,
              count,
              relationships: table.fields
                .filter((f) => f.relation)
                .map((f) => f.relation!),
              enums: parsedSchema.enums,
              customPrompt,
              existingIds: idMappings,
            };
          });

          spinner.start(`Generating ${level.length} tables in parallel...`);

          // Generate all tables in this level with ONE API call
          const { generateLevelBatch } = await import('../../generators/ai');
          const results = await generateLevelBatch(contexts, config);

          // Process results for each table
          for (const tableName of level) {
            const result = results[tableName];
            if (!result) {
              logger.warn(`No result for ${tableName}`);
              continue;
            }

            const table = tablesToGenerate.find((t) => t.name === tableName);
            if (!table) continue;

            // Transform foreign keys
            const transformedRows = transformForeignKeys(
              result.rows,
              table,
              idMappings
            );

            generatedData[tableName] = transformedRows;
            idMappings[tableName] = result.ids;
          }

          spinner.succeed(`Generated ${level.length} tables in parallel`);
        } catch (error) {
          spinner.fail(`Failed to generate level ${levelIdx + 1}`);
          logger.error(String(error));

          logger.error('Level generation failed, aborting...');
          process.exit(1);
        }
      }

      // Step 5: Insert data or generate output
      if (options.output) {
        // Generate TypeScript seed file
        spinner.start('Generating seed file...');
        const outputPath = resolve(process.cwd(), options.output);
        await generateSeedFile(
          outputPath,
          generatedData,
          order,
          parsedSchema
        );
        spinner.succeed(`Seed file generated: ${outputPath}`);
      } else if (options.dryRun) {
        // Generate SQL file
        logger.info('Dry run mode - no data inserted');
        logger.info('Generated data summary:');
        Object.entries(generatedData).forEach(([table, rows]) => {
          logger.info(`  ${table}: ${rows.length} rows`);
        });
      } else {
        // Insert into database
        spinner.start('Inserting data into database...');

        let totalInserted = 0;
        for (const tableName of order) {
          if (!generatedData[tableName]) continue;

          const result = await insertData(
            tableName,
            generatedData[tableName],
            config.databaseUrl!,
            config.defaults?.batchSize || 500
          );

          totalInserted += result.inserted;

          if (result.failed > 0) {
            logger.warn(
              `${tableName}: inserted ${result.inserted}, failed ${result.failed}`
            );
            result.errors.forEach((err) => logger.debug(`  ${err}`));
          }
        }

        spinner.succeed(`Inserted ${totalInserted} total rows`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`\nCompleted in ${duration}s`);

    } catch (error) {
      logger.error(`Fatal error: ${error}`);
      process.exit(1);
    }
  });
