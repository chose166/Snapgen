# 🚀 Snapgen

**AI-powered database seeding CLI tool** - The open-source Snaplet alternative

Generate realistic, relational seed data for your PostgreSQL database using AI. Supports Prisma and Drizzle schemas.

## Features

- **AI-Powered Generation**: Uses GPT-4o-mini via OpenAI to generate realistic, contextually appropriate data
- **Prisma & Drizzle Support**: Parse schemas from both popular ORMs
- **Referential Integrity**: Automatically handles foreign key relationships and dependencies
- **Topological Sorting**: Inserts data in the correct order based on table dependencies
- **Enum Support**: Respects enum constraints and generates valid values
- **Type Safety**: Validates data types (Int, String, DateTime, JSON, UUID, etc.)
- **Batch Inserts**: Efficient bulk inserts with configurable batch sizes
- **Fallback to Faker**: If AI fails or is unavailable, falls back to Faker.js
- **Multiple Output Modes**: Insert directly to DB, generate SQL, or create TypeScript seed files
- **Customizable**: Configure row counts, custom prompts, and table-specific settings

## Installation

```bash
npm install -g snapgen
```

Or use directly with npx:

```bash
npx snapgen generate --schema ./prisma/schema.prisma --count 100
```

## Quick Start

### 1. Initialize Configuration

```bash
snapgen init
```

This creates `snapgen.config.ts` in your project root.

### 2. Set Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# OpenAI API Key (required)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Generate and Seed Data

```bash
# Basic usage
snapgen generate

# With custom count
snapgen generate --count 200

# Specific tables only
snapgen generate --tables User,Post,Comment

# Generate TypeScript seed file instead of inserting
snapgen generate --output seed.ts

# Dry run (see what would be generated)
snapgen generate --dry-run
```

## CLI Options

### `snapgen generate [options]`

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path>` | Path to Prisma or Drizzle schema | Auto-detect |
| `-c, --count <number>` | Rows per table | 100 |
| `-t, --tables <list>` | Comma-separated list of tables | All tables |
| `--connection <url>` | PostgreSQL connection string | `DATABASE_URL` env var |
| `--dry-run` | Generate without inserting | false |
| `--ai-provider <provider>` | AI provider (openai\|anthropic) | openai |
| `-o, --output <path>` | Generate TypeScript seed file | - |
| `--config <path>` | Path to config file | Auto-detect |
| `-v, --verbose` | Verbose logging | false |

## Configuration

### `snapgen.config.ts`

```typescript
import { SnapgenConfig } from 'snapgen';

export default {
  // Schema path (Prisma or Drizzle)
  schema: './prisma/schema.prisma',

  // Database connection
  databaseUrl: process.env.DATABASE_URL,

  // AI configuration
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000,
  },

  // Default settings
  defaults: {
    count: 50,        // Rows per table
    parallel: 5,      // Concurrent AI requests
    batchSize: 500,   // Insert batch size
  },

  // Table-specific overrides
  tables: {
    User: {
      count: 10,
      aiPrompt: 'Generate diverse users from different countries and backgrounds',
    },
    Post: {
      count: 100,
      aiPrompt: 'Generate blog posts about technology, programming, and AI',
    },
    Product: {
      count: 50,
      aiPrompt: 'Generate realistic e-commerce products with prices between $10-$500',
    },
    Tag: {
      skip: true,  // Skip this table entirely
    },
  },
} satisfies SnapgenConfig;
```

## How It Works

### 1. Schema Parsing

Snapgen reads your Prisma or Drizzle schema and extracts:
- Table names and fields
- Data types and constraints
- Foreign key relationships
- Enums and default values

### 2. Dependency Resolution

Uses topological sorting (Kahn's algorithm) to determine the correct insert order:

```
User → Post → Comment
     → Order → OrderItem
Category → Post
Product → OrderItem
```

### 3. AI Data Generation

Sends structured prompts to OpenAI GPT-4o-mini:

```
Generate 50 realistic records for the "User" table.

Schema:
  - id: Int (PRIMARY KEY)
  - email: String (UNIQUE, REQUIRED)
  - username: String (UNIQUE, REQUIRED)
  - role: Enum (ADMIN, USER, GUEST)
  ...

Rules:
1. Respect data types strictly
2. Generate diverse, realistic data
3. Ensure temporal consistency (createdAt <= updatedAt)
4. For foreign keys, use existing IDs from available list
...
```

### 4. Foreign Key Transformation

Replaces placeholder values with actual generated IDs:

```typescript
// AI generates:
{ userId: "{{User_1}}", postId: "{{Post_5}}" }

// Transformed to:
{ userId: 1, postId: 5 }
```

### 5. Batch Insertion

Inserts data in batches (default 500 rows) with:
- Transaction support
- Conflict handling (`ON CONFLICT DO NOTHING`)
- Automatic retry with exponential backoff

## Examples

### Example 1: Basic Seeding

```bash
npx snapgen generate \
  --schema ./prisma/schema.prisma \
  --count 100
```

### Example 2: Specific Tables with Custom Counts

```bash
npx snapgen generate \
  --tables User,Post,Comment \
  --count 50
```

### Example 3: Generate TypeScript Seed File

```bash
npx snapgen generate \
  --output ./prisma/seed.ts \
  --count 100
```

Then run the seed file:

```bash
tsx ./prisma/seed.ts
```

### Example 4: Dry Run (Preview)

```bash
npx snapgen generate \
  --dry-run \
  --verbose
```

## Supported Data Types

| Type | Example Generated Values |
|------|-------------------------|
| `String` | "john.doe@gmail.com", "Tech enthusiast" |
| `Int` | 1, 42, 1337 |
| `BigInt` | "9223372036854775807" |
| `Float` / `Decimal` | 19.99, 1234.56 |
| `Boolean` | true, false |
| `DateTime` | "2024-02-01T10:30:00.000Z" |
| `Date` | "2024-02-01" |
| `Json` | `{"key": "value", "count": 10}` |
| `Uuid` | "550e8400-e29b-41d4-a716-446655440000" |
| `Enum` | Values from your enum definition |

## Relationship Handling

### One-to-Many

```prisma
model User {
  id    Int    @id
  posts Post[]
}

model Post {
  id       Int  @id
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}
```

Users are inserted first, then Posts reference actual User IDs.

### Many-to-Many

```prisma
model Post {
  id   Int   @id
  tags Tag[]
}

model Tag {
  id    Int    @id
  posts Post[]
}
```

Both tables are inserted, then the junction table is populated.

### Self-Referencing

```prisma
model User {
  id           Int    @id
  referredById Int?
  referredBy   User?  @relation("UserReferrals", fields: [referredById], references: [id])
  referrals    User[] @relation("UserReferrals")
}
```

Handled by inserting with nullable FK first, ensuring no circular dependencies.

## Performance

- **GPT-4o-mini**: Fast and cost-effective (~$0.15 per 1M tokens)
- **Batch generation**: 20-30 rows per API call
- **Parallel processing**: Multiple tables per dependency level
- **Automatic batching**: Large tables split into smaller batches
- **Batch inserts**: 500 rows per query (configurable)

**Real-world test results:**
- **630 rows** across **9 tables** in **292 seconds** (~4.9 minutes)
- **3 dependency levels** with parallel processing
- **Automatic error recovery** with retry mechanism
- Tables processed: User (50), Category (30), Tag (50), Product (100), Profile (50), Order (50), Post (200), OrderItem (50), Comment (50)

See [PERFORMANCE_TEST_RESULTS.md](PERFORMANCE_TEST_RESULTS.md) for detailed metrics.

## Troubleshooting

### Rate Limit Errors

```
Error: OpenAI rate limit exceeded
```

**Solutions:**
1. Reduce `defaults.count` in config
2. Reduce `defaults.parallel` (concurrent requests)
3. Add delays between generations
4. Upgrade OpenAI plan

### Foreign Key Constraint Violations

```
Error: insert or update on table violates foreign key constraint
```

**Causes:**
- Incorrect dependency resolution
- Circular dependencies

**Solutions:**
- Check for self-referencing tables
- Verify schema relationships are correct
- Use `--verbose` to see insert order

### AI Generation Fails

Snapgen automatically falls back to Faker.js if AI generation fails. To force Faker:

```typescript
// In config
ai: {
  provider: 'faker',  // Forces Faker fallback
}
```

## Comparison to Alternatives

| Feature | Snapgen | Snaplet | Faker.js | Prisma Seed |
|---------|---------|---------|----------|-------------|
| AI-Powered | ✅ | ✅ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ✅ | ✅ |
| Prisma Support | ✅ | ✅ | ⚠️ Manual | ✅ |
| Drizzle Support | ✅ | ❌ | ⚠️ Manual | ❌ |
| Auto FK Resolution | ✅ | ✅ | ❌ | ⚠️ Manual |
| Batch Inserts | ✅ | ✅ | ❌ | ⚠️ Manual |
| Cost | Free* | $$ | Free | Free |

*Requires OpenAI API key (~$0.15 per 1M tokens)

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

## Credits

Built with:
- [OpenAI GPT-4o-mini](https://openai.com)
- [Prisma](https://prisma.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [Faker.js](https://fakerjs.dev)
- [Commander.js](https://github.com/tj/commander.js)

---

**Made with ❤️ by developers, for developers**

Star us on GitHub! ⭐
