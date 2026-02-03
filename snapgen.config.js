// Snapgen Configuration File
// This file is loaded at runtime, so use JavaScript (not TypeScript)

// Load environment variables
require('dotenv').config();

module.exports = {
  // Path to your Prisma or Drizzle schema
  schema: './examples/prisma/schema.prisma',

  // Database connection (optional, can use DATABASE_URL env var)
  databaseUrl: process.env.DATABASE_URL,

  // AI configuration - Using Direct OpenAI with GPT-4o-mini
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000,
  },

  // Default generation settings
  defaults: {
    count: 100,       // Rows per table (now optimized with batching!)
    parallel: 5,      // Concurrent AI batch requests (increased for speed)
    batchSize: 500,   // Database insert batch size
  },

  // Table-specific overrides
  tables: {
    User: {
      count: 50,
      aiPrompt: 'Generate diverse users from different countries and backgrounds',
    },
    Post: {
      count: 200,
      aiPrompt: 'Generate blog posts about technology, programming, and AI',
    },
    Product: {
      count: 100,
      aiPrompt: 'Generate realistic e-commerce products with prices between $10-$500',
    },
    Category: {
      count: 30,
      aiPrompt: 'Generate product categories and subcategories',
    },
    Tag: {
      count: 50,
      aiPrompt: 'Generate common blog post tags',
    },
    // Example: Skip a table
    // SomeTable: {
    //   skip: true,
    // },
  },
};
