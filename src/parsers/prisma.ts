import { getDMMF } from '@prisma/internals';
import { readFileSync } from 'fs';
import {
  ParsedSchema,
  TableDefinition,
  FieldDefinition,
  EnumDefinition,
  FieldType,
  RelationInfo,
} from '../types/schema';

export async function parsePrismaSchema(
  schemaPath: string
): Promise<ParsedSchema> {
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  // Get DMMF (Data Model Meta Format) from Prisma
  const dmmf = await getDMMF({ datamodel: schemaContent });

  // Parse enums
  const enums: EnumDefinition[] = dmmf.datamodel.enums.map((enumDef) => ({
    name: enumDef.name,
    values: enumDef.values.map((v) => v.name),
  }));

  // Parse models (tables)
  const tables: TableDefinition[] = dmmf.datamodel.models.map((model) => {
    const fields: FieldDefinition[] = model.fields.map((field) => {
      // Handle relationships
      let relation: RelationInfo | undefined;

      if (field.kind === 'object') {
        // This is a relation field
        const relationType = field.isList
          ? 'one-to-many'
          : field.isRequired
          ? 'one-to-one'
          : 'many-to-one';

        relation = {
          type: relationType as any,
          relatedTable: field.type,
          foreignKeyField: field.relationFromFields?.[0],
          referencedField: field.relationToFields?.[0] || 'id',
          isNullable: !field.isRequired,
        };
      }

      // Map Prisma types to our FieldType
      const fieldType = mapPrismaType(field.type, field.kind);

      return {
        name: field.name,
        type: fieldType,
        isArray: field.isList,
        isRequired: field.isRequired,
        isUnique: field.isUnique,
        isId: field.isId,
        default: field.default,
        enumName: field.kind === 'enum' ? field.type : undefined,
        relation,
      };
    });

    // Find primary key fields
    const primaryKey =
      model.primaryKey?.fields ||
      fields.filter((f) => f.isId).map((f) => f.name);

    // Find unique constraints
    const uniqueConstraints = model.uniqueIndexes.map((idx) => idx.fields);

    return {
      name: model.name,
      fields: fields.filter((f) => !f.relation || f.relation.foreignKeyField), // Only keep scalar fields and FK fields
      primaryKey,
      uniqueConstraints,
    };
  });

  return {
    tables,
    enums,
    metadata: {
      orm: 'prisma',
      sourceFile: schemaPath,
    },
  };
}

function mapPrismaType(
  prismaType: string,
  kind: string
): FieldType {
  if (kind === 'enum') return 'Enum';
  if (kind === 'object') return 'String'; // Relations handled separately

  const typeMap: Record<string, FieldType> = {
    String: 'String',
    Int: 'Int',
    BigInt: 'BigInt',
    Float: 'Float',
    Decimal: 'Decimal',
    Boolean: 'Boolean',
    DateTime: 'DateTime',
    Date: 'Date',
    Time: 'Time',
    Json: 'Json',
    Bytes: 'Bytes',
  };

  return typeMap[prismaType] || 'String';
}
