import { ParsedSchema } from '../types/schema';
import { parsePrismaSchema } from './prisma';
import { parseDrizzleSchema } from './drizzle';
import { extname } from 'path';

export function detectORM(schemaPath: string): 'prisma' | 'drizzle' {
  const ext = extname(schemaPath);

  // Prisma uses .prisma files
  if (ext === '.prisma') {
    return 'prisma';
  }

  // Drizzle typically uses .ts files
  // Check file name patterns
  if (
    schemaPath.includes('drizzle') ||
    schemaPath.includes('schema.ts') ||
    schemaPath.includes('db/schema')
  ) {
    return 'drizzle';
  }

  // Default to Prisma if uncertain
  return 'prisma';
}

export async function parseSchema(
  schemaPath: string,
  orm: 'prisma' | 'drizzle'
): Promise<ParsedSchema> {
  if (orm === 'prisma') {
    return parsePrismaSchema(schemaPath);
  } else {
    return parseDrizzleSchema(schemaPath);
  }
}
