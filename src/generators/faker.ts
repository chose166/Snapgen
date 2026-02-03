import { faker } from '@faker-js/faker';
import {
  GenerationContext,
  GenerationResult,
  FieldDefinition,
  FieldType,
} from '../types/schema';

/**
 * Generate data using Faker.js
 * Used as fallback when AI generation fails
 */
export function generateWithFaker(
  context: GenerationContext
): GenerationResult {
  const { tableName, tableSchema, count, enums, existingIds } = context;

  const rows: any[] = [];

  for (let i = 0; i < count; i++) {
    const row: any = {};

    tableSchema.fields.forEach((field) => {
      row[field.name] = generateFieldValue(field, enums, existingIds, i);
    });

    rows.push(row);
  }

  // Extract IDs
  const ids = extractIds(rows, tableSchema);

  return {
    tableName,
    rows,
    ids,
  };
}

/**
 * Generate a value for a single field using Faker
 */
function generateFieldValue(
  field: FieldDefinition,
  enums: any[],
  existingIds?: Record<string, any[]>,
  index?: number
): any {
  // Handle primary keys
  if (field.isId) {
    if (field.type === 'Uuid') {
      return faker.string.uuid();
    }
    return index !== undefined ? index + 1 : faker.number.int({ min: 1, max: 10000 });
  }

  // Handle foreign keys
  if (field.relation && existingIds) {
    const relatedIds = existingIds[field.relation.relatedTable];
    if (relatedIds && relatedIds.length > 0) {
      // Pick a random ID from available IDs
      return faker.helpers.arrayElement(relatedIds);
    }
  }

  // Handle enums
  if (field.enumName) {
    const enumDef = enums.find((e) => e.name === field.enumName);
    if (enumDef) {
      return faker.helpers.arrayElement(enumDef.values);
    }
  }

  // Handle by field name patterns
  const fieldName = field.name.toLowerCase();

  // Email
  if (fieldName.includes('email')) {
    return faker.internet.email();
  }

  // Name fields
  if (fieldName === 'name' || fieldName === 'fullname') {
    return faker.person.fullName();
  }
  if (fieldName === 'firstname' || fieldName === 'first_name') {
    return faker.person.firstName();
  }
  if (fieldName === 'lastname' || fieldName === 'last_name') {
    return faker.person.lastName();
  }

  // Username
  if (fieldName === 'username' || fieldName === 'user_name') {
    return faker.internet.userName();
  }

  // Phone
  if (fieldName.includes('phone')) {
    return faker.phone.number();
  }

  // Address fields
  if (fieldName.includes('address')) {
    return faker.location.streetAddress();
  }
  if (fieldName === 'city') {
    return faker.location.city();
  }
  if (fieldName === 'country') {
    return faker.location.country();
  }
  if (fieldName.includes('zip') || fieldName.includes('postal')) {
    return faker.location.zipCode();
  }

  // URL
  if (fieldName.includes('url') || fieldName.includes('website')) {
    return faker.internet.url();
  }

  // Description/Bio/Content
  if (
    fieldName.includes('description') ||
    fieldName.includes('bio') ||
    fieldName.includes('content') ||
    fieldName.includes('text')
  ) {
    return faker.lorem.paragraphs(2);
  }

  // Title
  if (fieldName === 'title') {
    return faker.lorem.sentence();
  }

  // Company
  if (fieldName.includes('company')) {
    return faker.company.name();
  }

  // Price/Amount
  if (fieldName.includes('price') || fieldName.includes('amount')) {
    return faker.number.float({ min: 1, max: 1000, multipleOf: 0.01 });
  }

  // Generate by type
  return generateByType(field.type, field.isRequired);
}

/**
 * Generate value based on field type
 */
function generateByType(type: FieldType, isRequired: boolean): any {
  if (!isRequired && faker.datatype.boolean()) {
    return null;
  }

  switch (type) {
    case 'String':
      return faker.lorem.word();

    case 'Int':
      return faker.number.int({ min: 1, max: 10000 });

    case 'BigInt':
      return faker.number.bigInt({ min: 1n, max: 1000000n }).toString();

    case 'Float':
    case 'Decimal':
      return faker.number.float({ min: 0, max: 1000, multipleOf: 0.01 });

    case 'Boolean':
      return faker.datatype.boolean();

    case 'DateTime':
      return faker.date.recent({ days: 30 }).toISOString();

    case 'Date':
      return faker.date.recent({ days: 30 }).toISOString().split('T')[0];

    case 'Time':
      return faker.date.recent().toISOString().split('T')[1];

    case 'Json':
      return {
        key: faker.lorem.word(),
        value: faker.lorem.sentence(),
        count: faker.number.int({ min: 1, max: 100 }),
      };

    case 'Uuid':
      return faker.string.uuid();

    case 'Bytes':
      return Buffer.from(faker.lorem.paragraph()).toString('base64');

    default:
      return faker.lorem.word();
  }
}

/**
 * Extract IDs from rows
 */
function extractIds(rows: any[], tableSchema: any): any[] {
  const idFields = tableSchema.fields.filter((f: FieldDefinition) => f.isId);

  if (idFields.length === 0) {
    return rows.map((r) => r.id || r.ID).filter((id) => id !== undefined);
  }

  if (idFields.length === 1) {
    const idFieldName = idFields[0].name;
    return rows.map((r) => r[idFieldName]);
  }

  // Composite key
  return rows.map((r) => {
    const compositeId: any = {};
    idFields.forEach((f: FieldDefinition) => {
      compositeId[f.name] = r[f.name];
    });
    return compositeId;
  });
}
