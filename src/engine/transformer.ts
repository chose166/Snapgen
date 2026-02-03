import { TableDefinition, GeneratedRow } from '../types/schema';

/**
 * Transform foreign key placeholder values to actual IDs
 * Handles cases where AI generates placeholders like "{{User_1}}"
 */
export function transformForeignKeys(
  rows: GeneratedRow[],
  tableSchema: TableDefinition,
  idMappings: Record<string, any[]>
): GeneratedRow[] {
  return rows.map((row) => {
    const transformedRow = { ...row };

    tableSchema.fields.forEach((field) => {
      if (!field.relation) return;

      const foreignKeyField = field.relation.foreignKeyField;
      if (!foreignKeyField) return;

      const value = transformedRow[foreignKeyField];
      if (value === null || value === undefined) return;

      // Check if it's a placeholder pattern
      if (typeof value === 'string' && value.includes('{{')) {
        // Extract table name and index from placeholder
        // Pattern: {{TableName_index}} or {{TableName.id}}
        const match = value.match(/\{\{(\w+)[_.](\d+)\}\}/);
        if (match) {
          const [, tableName, indexStr] = match;
          const index = parseInt(indexStr, 10) - 1; // Convert to 0-based

          const availableIds = idMappings[tableName];
          if (availableIds && availableIds[index] !== undefined) {
            transformedRow[foreignKeyField] = availableIds[index];
          }
        }
      }

      // Validate that FK value exists in the related table
      const relatedTable = field.relation.relatedTable;
      const availableIds = idMappings[relatedTable];

      if (availableIds && availableIds.length > 0) {
        // If value is not in available IDs, pick a random one
        if (!availableIds.includes(value)) {
          const randomId =
            availableIds[Math.floor(Math.random() * availableIds.length)];
          transformedRow[foreignKeyField] = randomId;
        }
      }
    });

    return transformedRow;
  });
}

/**
 * Validate referential integrity
 * Returns array of errors if any FK constraints are violated
 */
export function validateReferentialIntegrity(
  rows: GeneratedRow[],
  tableSchema: TableDefinition,
  idMappings: Record<string, any[]>
): string[] {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    tableSchema.fields.forEach((field) => {
      if (!field.relation) return;

      const foreignKeyField = field.relation.foreignKeyField;
      if (!foreignKeyField) return;

      const value = row[foreignKeyField];

      // Skip null values if field is nullable
      if ((value === null || value === undefined) && !field.isRequired) {
        return;
      }

      // Check if FK value exists
      const relatedTable = field.relation.relatedTable;
      const availableIds = idMappings[relatedTable];

      if (!availableIds || availableIds.length === 0) {
        errors.push(
          `Row ${index}: ${foreignKeyField} references ${relatedTable} but no IDs available`
        );
        return;
      }

      if (!availableIds.includes(value)) {
        errors.push(
          `Row ${index}: ${foreignKeyField}=${value} not found in ${relatedTable} IDs`
        );
      }
    });
  });

  return errors;
}

/**
 * Generate sequential IDs for a set of rows
 * Used when inserting data and getting actual database IDs
 */
export function generateSequentialIds(
  rows: GeneratedRow[],
  tableSchema: TableDefinition,
  startId = 1
): any[] {
  const idField = tableSchema.fields.find((f) => f.isId);

  if (!idField) {
    return rows.map((_, i) => startId + i);
  }

  if (idField.type === 'Uuid') {
    return rows.map(() => crypto.randomUUID());
  }

  // Integer IDs
  return rows.map((_, i) => startId + i);
}
