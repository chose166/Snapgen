# Quick Start Guide

Get started with Snapgen in 5 minutes!

## Prerequisites

- Node.js 20+
- PostgreSQL database
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Step 1: Install

```bash
npm install -g snapgen
```

Or use npx (no installation required):

```bash
npx snapgen --help
```

## Step 2: Prepare Your Environment

Create a `.env` file:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
OPENAI_API_KEY=sk-your-api-key-here
```

## Step 3: Initialize Configuration

```bash
snapgen init
```

This creates `snapgen.config.ts`:

```typescript
export default {
  schema: './prisma/schema.prisma',
  databaseUrl: process.env.DATABASE_URL,
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
  },
  defaults: {
    count: 50,
  },
};
```

## Step 4: Generate Data

```bash
snapgen generate
```

That's it! Snapgen will:
1. Parse your schema
2. Resolve table dependencies
3. Generate realistic data using AI
4. Insert data into your database

## Example Output

```
✓ Parsed 8 tables, 3 enums
✓ Sorted 8 tables by dependencies
✓ Connected to database
✓ Generated 10 rows for User
✓ Generated 50 rows for Post
✓ Generated 100 rows for Comment
✓ Inserted 160 total rows

✓ Completed in 12.34s
```

## Common Use Cases

### Generate Specific Tables

```bash
snapgen generate --tables User,Post,Comment
```

### Custom Row Counts

```bash
snapgen generate --count 200
```

### Generate TypeScript Seed File

```bash
snapgen generate --output seed.ts
tsx seed.ts
```

### Dry Run (Preview)

```bash
snapgen generate --dry-run --verbose
```

## Prisma Example

**schema.prisma:**

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

**Run:**

```bash
snapgen generate --schema ./prisma/schema.prisma --count 100
```

## Drizzle Example

**schema.ts:**

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Run:**

```bash
snapgen generate --schema ./src/db/schema.ts --count 100
```

## Customization

Edit `snapgen.config.ts` to customize generation:

```typescript
export default {
  tables: {
    User: {
      count: 10,
      aiPrompt: 'Generate diverse users from tech industry',
    },
    Post: {
      count: 50,
      aiPrompt: 'Generate blog posts about software engineering',
    },
  },
};
```

## Troubleshooting

### "Schema file not found"

Make sure the path in `snapgen.config.ts` is correct:

```typescript
schema: './prisma/schema.prisma',  // ✓ Correct
schema: 'prisma/schema.prisma',    // ✗ May not work
```

### "OpenAI API key not found"

Set the environment variable:

```bash
export OPENAI_API_KEY=sk-your-key
```

Or add to `.env` file.

### "Database connection failed"

Verify your `DATABASE_URL`:

```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Rate limit errors

Reduce concurrent requests in config:

```typescript
defaults: {
  parallel: 2,  // Reduce from 5 to 2
}
```

## Next Steps

- [Read the full documentation](README.md)
- [See advanced examples](examples/)
- [Contribute to the project](CONTRIBUTING.md)

## Get Help

- GitHub Issues: https://github.com/yourusername/snapgen/issues
- Documentation: https://github.com/yourusername/snapgen
