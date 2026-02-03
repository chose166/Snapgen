import { Command } from 'commander';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../../utils/logger';

export const initCommand = new Command('init')
  .description('Initialize snapgen configuration file')
  .option('-d, --dir <directory>', 'Directory to create config', '.')
  .action(async (options) => {
    const configDir = resolve(process.cwd(), options.dir);
    const configPath = resolve(configDir, 'snapgen.config.ts');

    if (existsSync(configPath)) {
      logger.warn('Configuration file already exists!');
      return;
    }

    const configTemplate = `import { SnapgenConfig } from 'snapgen';

export default {
  // Path to your Prisma or Drizzle schema
  schema: './prisma/schema.prisma',

  // Database connection (optional, can use DATABASE_URL env var)
  databaseUrl: process.env.DATABASE_URL,

  // AI configuration
  ai: {
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000,
  },

  // Default generation settings
  defaults: {
    count: 50,        // Rows per table
    parallel: 5,      // Concurrent AI requests
    batchSize: 500,   // Insert batch size
  },

  // Table-specific overrides
  tables: {
    // User: {
    //   count: 10,
    //   aiPrompt: 'Generate diverse users from different countries',
    // },
    // Post: {
    //   count: 100,
    //   aiPrompt: 'Generate blog posts about technology and programming',
    // },
    // Tag: {
    //   skip: true,  // Skip this table
    // },
  },
} satisfies SnapgenConfig;
`;

    try {
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      writeFileSync(configPath, configTemplate, 'utf-8');
      logger.success(`Created configuration file: ${configPath}`);
      logger.info('');
      logger.info('Next steps:');
      logger.info('1. Edit snapgen.config.ts to match your needs');
      logger.info('2. Set OPENAI_API_KEY and DATABASE_URL in .env');
      logger.info('3. Run: snapgen generate');
    } catch (error) {
      logger.error(`Failed to create config file: ${error}`);
      process.exit(1);
    }
  });
