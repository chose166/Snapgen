# OpenRouter Integration - Complete Guide

## ✅ What Was Done

OpenRouter support has been fully integrated into Snapgen. You can now use OpenRouter's unified API to access GPT-4o-mini and other AI models with better rate limits and cost tracking.

## 🔧 Changes Made

### 1. Code Updates

**src/generators/ai.ts**
- Added `baseURL` parameter support to OpenAI client initialization
- Updated to support `openrouter` as a provider
- Client now accepts custom base URLs for OpenRouter or other compatible APIs

**src/types/schema.ts**
- Added `openrouter` to provider enum: `'openai' | 'anthropic' | 'openrouter'`
- Added `baseURL` field to AI config schema
- Fully typed with Zod validation

### 2. Configuration Files

**.env**
- Created with your OpenRouter API key
- Key: `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`

**snapgen.config.ts**
- Pre-configured for OpenRouter
- Uses `openai/gpt-4o-mini` model
- BaseURL set to `https://openrouter.ai/api/v1`
- Optimized defaults (count: 10, parallel: 3)

### 3. Documentation

- **OPENROUTER_SETUP.md**: Complete setup guide
- **README.md**: Updated with OpenRouter examples
- **.env.example**: Added OpenRouter key template

### 4. Test Scripts

- **test-openrouter.bat**: Windows test script
- **test-openrouter.sh**: Linux/Mac test script

## 🚀 Quick Start

### Test Without Database (Dry Run)

```bash
node dist/cli/index.js generate --dry-run --verbose
```

This will:
1. Load config from `snapgen.config.ts`
2. Connect to OpenRouter API
3. Generate sample data for all tables
4. Display what would be inserted (without actually inserting)

### Generate TypeScript Seed File

```bash
node dist/cli/index.js generate --output seed.ts --count 5
```

This creates a standalone TypeScript file with generated data that you can inspect.

### Generate with Custom Settings

```bash
node dist/cli/index.js generate \
  --count 10 \
  --tables User,Post,Comment \
  --dry-run \
  --verbose
```

## 📋 Configuration Details

### Current Config (snapgen.config.ts)

```typescript
{
  schema: './examples/prisma/schema.prisma',
  databaseUrl: process.env.DATABASE_URL,

  ai: {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    maxRetries: 3,
    timeout: 30000,
  },

  defaults: {
    count: 10,
    parallel: 3,
    batchSize: 500,
  },

  tables: {
    User: { count: 5, aiPrompt: '...' },
    Post: { count: 20, aiPrompt: '...' },
    Product: { count: 15, aiPrompt: '...' },
  },
}
```

### Environment Variables (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
OPENROUTER_API_KEY=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
```

## 🎯 Available Commands

### Basic Usage

```bash
# Use config file settings (recommended)
node dist/cli/index.js generate

# Dry run (no database needed)
node dist/cli/index.js generate --dry-run

# With verbose logging
node dist/cli/index.js generate --dry-run --verbose
```

### Advanced Usage

```bash
# Generate specific tables
node dist/cli/index.js generate --tables User,Post --count 20

# Generate TypeScript seed file
node dist/cli/index.js generate --output seed.ts

# Custom schema path
node dist/cli/index.js generate --schema ./path/to/schema.prisma

# Override row count
node dist/cli/index.js generate --count 50
```

## 💰 Cost Estimation

Using OpenRouter with GPT-4o-mini:

| Records | Estimated Tokens | Cost |
|---------|------------------|------|
| 100 | ~5,000 | ~$0.001 |
| 1,000 | ~50,000 | ~$0.008 |
| 10,000 | ~500,000 | ~$0.075 |

**Much cheaper than direct OpenAI access!**

## 🔍 Example Test Run

Run the test script:

```bash
# Windows
test-openrouter.bat

# Linux/Mac
bash test-openrouter.sh
```

Expected output:

```
ℹ Using schema: examples/prisma/schema.prisma
› Using custom base URL: https://openrouter.ai/api/v1
✓ Parsed 10 tables, 3 enums
✓ Sorted 10 tables by dependencies
⠹ Generating 3 rows for User...
› Prompt for User:
  Generate 3 realistic records for the "User" table...
✓ Generated 3 rows for User
ℹ Dry run mode - no data inserted
ℹ Generated data summary:
  User: 3 rows
✓ Completed in 4.52s
```

## 🌟 Alternative Models

You can switch to other models on OpenRouter:

### Fast & Cheap (Recommended)
```typescript
model: 'openai/gpt-4o-mini'  // Default
model: 'openai/gpt-3.5-turbo'  // Even cheaper
model: 'google/gemini-flash-1.5'  // Google's fast model
```

### High Quality
```typescript
model: 'openai/gpt-4o'  // Best quality
model: 'anthropic/claude-3.5-sonnet'  // Anthropic's best
model: 'anthropic/claude-3-haiku'  // Fast Anthropic
```

### Budget/Free Tier
```typescript
model: 'meta-llama/llama-3-8b-instruct'  // Free tier
model: 'mistralai/mistral-7b-instruct'  // Very cheap
```

## 📊 Monitoring

Track your usage at: https://openrouter.ai/activity

You can see:
- Real-time costs
- Request logs
- Model performance
- Rate limit status

## 🐛 Troubleshooting

### "API key not provided"

Check that `.env` exists and has your key:
```bash
cat .env
```

### "Model not found"

Make sure model name includes provider:
- ✅ `openai/gpt-4o-mini`
- ❌ `gpt-4o-mini`

### Rate Limit Issues

Reduce parallel requests:
```typescript
defaults: {
  parallel: 2,  // Reduce from 3
}
```

### Generation Fails

Check verbose logs:
```bash
node dist/cli/index.js generate --dry-run --verbose
```

Look for error messages about:
- Invalid API key
- Model not available
- Network issues

## ✅ Verification Checklist

- [x] OpenRouter API key configured in `.env`
- [x] Config file created (`snapgen.config.ts`)
- [x] Code updated to support `baseURL`
- [x] Provider enum includes `openrouter`
- [x] Project rebuilt successfully
- [x] Documentation updated
- [x] Test scripts created

## 🎊 You're Ready!

Everything is configured and ready to use. Start with:

```bash
node dist/cli/index.js generate --dry-run --verbose
```

This will test the OpenRouter connection without needing a database.

Once you're ready to generate real data:

1. Set up your PostgreSQL database
2. Update `DATABASE_URL` in `.env`
3. Run: `node dist/cli/index.js generate --count 10`

## 📚 Additional Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **OpenRouter Dashboard**: https://openrouter.ai/activity
- **Model Pricing**: https://openrouter.ai/models
- **Snapgen Docs**: See README.md

## 🤝 Support

If you encounter issues:

1. Check verbose logs: `--verbose`
2. Try with fewer records: `--count 3`
3. Test with dry run first: `--dry-run`
4. Review OpenRouter dashboard for API errors

---

**Happy seeding with OpenRouter! 🚀**

Your setup is complete and ready to generate realistic database seed data using OpenRouter's GPT-4o-mini.
