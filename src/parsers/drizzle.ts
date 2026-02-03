import { readFileSync } from 'fs';
import {
  ParsedSchema,
  TableDefinition,
  FieldDefinition,
  EnumDefinition,
  FieldType,
} from '../types/schema';

/**
 * Simplified Drizzle parser
 * Note: Full Drizzle parsing would require AST analysis
 * This version handles common patterns via regex
 */
export async function parseDrizzleSchema(
  schemaPath: string
): Promise<ParsedSchema> {
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  // Parse enums (pgEnum or mysqlEnum)
  const enums = parseDrizzleEnums(schemaContent);

  // Parse tables
  const tables = parseDrizzleTables(schemaContent);

  return {
    tables,
    enums,
    metadata: {
      orm: 'drizzle',
      sourceFile: schemaPath,
    },
  };
}

function parseDrizzleEnums(content: string): EnumDefinition[] {
  const enums: EnumDefinition[] = [];

  // Match: export const statusEnum = pgEnum('status', ['active', 'inactive']);
  const enumRegex = /export\s+const\s+(\w+)\s*=\s*(?:pg|mysql)Enum\s*\(\s*['"](\w+)['"]\s*,\s*\[(.*?)\]\s*\)/gs;

  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[2]; // enum name in DB
    const valuesStr = match[3];
    const values = valuesStr
      .split(',')
      .map((v) => v.trim().replace(/['"]/g, ''))
      .filter((v) => v);

    enums.push({ name, values });
  }

  return enums;
}

function parseDrizzleTables(content: string): TableDefinition[] {
  const tables: TableDefinition[] = [];

  // Match: export const users = pgTable('users', { ... });
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:pg|mysql)Table\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\([\s\S]*?\))?\s*\)/g;

  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[2];
    const fieldsContent = match[3];

    const fields = parseDrizzleFields(fieldsContent);

    // Try to find primary key
    const primaryKey = fields.filter((f) => f.isId).map((f) => f.name);

    tables.push({
      name: tableName,
      fields,
      primaryKey: primaryKey.length > 0 ? primaryKey : ['id'],
      uniqueConstraints: [],
    });
  }

  return tables;
}

function parseDrizzleFields(fieldsContent: string): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  // Split by field definitions (basic approach)
  const fieldLines = fieldsContent.split('\n').filter((line) => line.trim());

  for (const line of fieldLines) {
    // Match: fieldName: type('name').options()
    const fieldMatch = line.match(/(\w+)\s*:\s*(\w+)\(['"](\w+)['"]\)/);

    if (!fieldMatch) continue;

    const fieldName = fieldMatch[1];
    const drizzleType = fieldMatch[2];

    // Check for modifiers
    const isId = line.includes('.primaryKey()');
    const isUnique = line.includes('.unique()');
    const isRequired = !line.includes('.notNull()') ? false : true;
    const hasDefault = line.includes('.default(');

    const fieldType = mapDrizzleType(drizzleType);

    fields.push({
      name: fieldName,
      type: fieldType,
      isArray: false,
      isRequired: isRequired || isId,
      isUnique: isUnique || isId,
      isId,
      default: hasDefault ? true : undefined,
    });
  }

  return fields;
}

function mapDrizzleType(drizzleType: string): FieldType {
  const typeMap: Record<string, FieldType> = {
    text: 'String',
    varchar: 'String',
    char: 'String',
    integer: 'Int',
    int: 'Int',
    smallint: 'Int',
    bigint: 'BigInt',
    serial: 'Int',
    bigserial: 'BigInt',
    boolean: 'Boolean',
    real: 'Float',
    doublePrecision: 'Float',
    decimal: 'Decimal',
    numeric: 'Decimal',
    timestamp: 'DateTime',
    date: 'Date',
    time: 'Time',
    json: 'Json',
    jsonb: 'Json',
    uuid: 'Uuid',
  };

  return typeMap[drizzleType] || 'String';
}
