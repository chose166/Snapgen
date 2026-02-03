# OpenRouter Setup Guide

## What is OpenRouter?

[OpenRouter](https://openrouter.ai) is a unified API that provides access to multiple AI models (GPT-4, Claude, Llama, etc.) through a single interface. It's often more cost-effective and provides better rate limits than direct OpenAI access.

## Why Use OpenRouter?

- **Unified API**: Access multiple AI models with one API key
- **Better Rate Limits**: Higher default rate limits
- **Cost Tracking**: Built-in cost tracking dashboard
- **Fallback Options**: Automatically switch models if one fails
- **Competitive Pricing**: Often cheaper than direct access

## Setup Instructions

### 1. Your API Key is Already Configured

Your OpenRouter API key has been added to `.env`:

```env
OPENROUTER_API_KEY=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
```

### 2. Configuration File

A `snapgen.config.ts` has been created with OpenRouter settings:

```typescript
export default {
  schema: './examples/prisma/schema.prisma',
  databaseUrl: process.env.DATABASE_URL,

  ai: {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',  // OpenRouter uses this format
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
};
```

## Usage

### Test with Dry Run (No Database Required)

```bash
node dist/cli/index.js generate --dry-run --verbose
```

This will:
- Parse the example schema
- Generate data using OpenRouter's GPT-4o-mini
- Show you what would be inserted (without actually inserting)

### Generate with Custom Count

```bash
node dist/cli/index.js generate --count 5 --dry-run
```

### Generate TypeScript Seed File

```bash
node dist/cli/index.js generate --output seed.ts --count 10
```

Then inspect `seed.ts` to see the generated data!

## Available Models on OpenRouter

You can use any of these models by changing the `model` in config:

### Recommended for Seeding (Fast & Cheap)
- `openai/gpt-4o-mini` - Fast, cheap, great for data generation (default)
- `openai/gpt-3.5-turbo` - Even cheaper alternative
- `google/gemini-flash-1.5` - Google's fast model

### Premium Options (Better Quality)
- `openai/gpt-4o` - More expensive but higher quality
- `anthropic/claude-3-haiku` - Fast Anthropic model
- `anthropic/claude-3.5-sonnet` - Premium Anthropic model

### Budget Options
- `meta-llama/llama-3-8b-instruct` - Free tier available
- `mistralai/mistral-7b-instruct` - Open source, very cheap

## Example: Using Different Models

Edit `snapgen.config.ts`:

```typescript
// Use Claude instead of GPT
ai: {
  provider: 'openrouter',
  model: 'anthropic/claude-3-haiku',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
}

// Or use Llama (free tier)
ai: {
  provider: 'openrouter',
  model: 'meta-llama/llama-3-8b-instruct',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
}
```

## Pricing Comparison

| Model | Provider | Input | Output | Best For |
|-------|----------|-------|--------|----------|
| gpt-4o-mini | OpenRouter | $0.15/1M | $0.60/1M | Data generation (recommended) |
| gpt-3.5-turbo | OpenRouter | $0.50/1M | $1.50/1M | Budget option |
| claude-3-haiku | OpenRouter | $0.25/1M | $1.25/1M | High quality, fast |
| llama-3-8b | OpenRouter | Free tier | Free tier | Testing, development |

**Estimated cost for 1,000 records:** ~$0.01 - $0.02

## Troubleshooting

### "API key not provided"

Make sure `.env` file exists and has your key:
```bash
cat .env
# Should show: OPENROUTER_API_KEY=sk-or-v1-...
```

### "Rate limit exceeded"

OpenRouter has generous limits, but if you hit them:
```typescript
defaults: {
  parallel: 2,  // Reduce from 3
}
```

### "Model not found"

Check the model name format:
- ✅ Correct: `openai/gpt-4o-mini`
- ❌ Wrong: `gpt-4o-mini`

OpenRouter uses `provider/model-name` format.

### Test Your Setup

```bash
# Quick test (no database needed)
node dist/cli/index.js generate \
  --schema ./examples/prisma/schema.prisma \
  --count 3 \
  --tables User \
  --dry-run \
  --verbose
```

Expected output:
```
ℹ Using schema: examples/prisma/schema.prisma
› Using custom base URL: https://openrouter.ai/api/v1
✓ Parsed 10 tables, 3 enums
✓ Sorted 10 tables by dependencies
⠹ Generating 3 rows for User...
✓ Generated 3 rows for User
ℹ Dry run mode - no data inserted
✓ Completed in 5.23s
```

## OpenRouter Dashboard

Monitor your usage at: https://openrouter.ai/activity

Features:
- Real-time cost tracking
- Request logs
- Model performance stats
- Rate limit status

## Benefits Over Direct OpenAI

1. **Better Rate Limits**: OpenRouter aggregates requests, providing higher limits
2. **Cost Tracking**: See exactly what you're spending
3. **Fallback Models**: Can configure automatic fallbacks
4. **Multiple Providers**: Switch between OpenAI, Anthropic, Google, etc.
5. **No Separate Billing**: One bill for all AI providers

## Next Steps

1. **Test the setup**:
   ```bash
   node dist/cli/index.js generate --dry-run
   ```

2. **Generate real data** (once you have a database):
   ```bash
   node dist/cli/index.js generate --count 10
   ```

3. **Customize** per table in `snapgen.config.ts`

4. **Monitor** usage at https://openrouter.ai/activity

---

**You're all set to use OpenRouter with Snapgen!** 🚀

The configuration is complete and ready to use. Start with `--dry-run` to test without a database connection.
