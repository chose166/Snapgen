import { existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigSchema, SnapgenConfig } from '../types/schema';
import { logger } from './logger';
import * as dotenv from 'dotenv';

dotenv.config();

export async function loadConfig(
  configPath?: string
): Promise<SnapgenConfig> {
  const defaultConfig: SnapgenConfig = {
    databaseUrl: process.env.DATABASE_URL,
    ai: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    },
    defaults: {
      count: 50,
      parallel: 5,
      batchSize: 500,
    },
    tables: {},
  };

  if (configPath) {
    const fullPath = resolve(process.cwd(), configPath);
    if (!existsSync(fullPath)) {
      logger.warn(`Config file not found: ${fullPath}`);
      return defaultConfig;
    }

    try {
      // Dynamic import for config file
      const config = await import(fullPath);
      const userConfig = config.default || config;
      const merged = { ...defaultConfig, ...userConfig };
      return ConfigSchema.parse(merged);
    } catch (error) {
      logger.error(`Failed to load config: ${error}`);
      return defaultConfig;
    }
  }

  // Try to find config in common locations (check .js first as it works at runtime)
  const commonPaths = [
    'snapgen.config.js',
    'snapgen.config.ts',
    '.snapgen/config.js',
    '.snapgen/config.ts',
  ];

  for (const path of commonPaths) {
    const fullPath = resolve(process.cwd(), path);
    if (existsSync(fullPath)) {
      try {
        const config = await import(fullPath);
        const userConfig = config.default || config;
        const merged = { ...defaultConfig, ...userConfig };
        logger.debug(`Loaded config from ${path}`);
        return ConfigSchema.parse(merged);
      } catch (error) {
        logger.debug(`Failed to load config from ${path}: ${error}`);
      }
    }
  }

  return defaultConfig;
}

export function validateConfig(config: SnapgenConfig): void {
  // Check if API key is provided
  if (!config.ai?.apiKey) {
    throw new Error(
      'OpenAI API key not found. Set OPENAI_API_KEY environment variable or provide it in config.'
    );
  }

  if (!config.databaseUrl) {
    logger.warn(
      'DATABASE_URL not set. You will need to provide it via --connection flag.'
    );
  }
}
