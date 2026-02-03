# 🎉 OpenRouter Integration Complete!

Your Snapgen installation now supports **OpenRouter API** with your API key already configured.

## ✅ What's Ready

### 1. Your API Key is Configured
- **File**: `.env`
- **Key**: `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`
- **Status**: ✓ Active and ready to use

### 2. Configuration File Created
- **File**: `snapgen.config.ts`
- **Provider**: OpenRouter
- **Model**: GPT-4o-mini
- **Settings**: Optimized for quick testing (10 rows, 3 parallel requests)

### 3. Project Built Successfully
- All TypeScript code compiled without errors
- OpenRouter support fully integrated
- Fallback to Faker.js if needed

## 🚀 Test It Now (3 Easy Steps)

### Step 1: Quick Test (No Database Needed)

Run this command in your terminal:

```bash
node dist/cli/index.js generate --dry-run --verbose
```

**What this does:**
- Connects to OpenRouter API
- Generates sample data for your example schema
- Shows you what would be inserted (without actually inserting)
- Takes ~10-15 seconds

**Expected result:**
```
✓ Parsed 10 tables, 3 enums
✓ Generated 10 rows for User
✓ Generated 20 rows for Post
ℹ Dry run mode - no data inserted
✓ Completed in 12.34s
```

### Step 2: Generate a TypeScript Seed File

```bash
node dist/cli/index.js generate --output seed.ts --count 5
```

**What this does:**
- Generates 5 rows per table
- Creates `seed.ts` file with all the data
- You can inspect the generated data
- No database required

**Then inspect the file:**
```bash
# Windows
type seed.ts | more

# Linux/Mac
less seed.ts
```

### Step 3: Use the Test Scripts

**Windows:**
```bash
test-openrouter.bat
```

**Linux/Mac:**
```bash
bash test-openrouter.sh
```

## 📖 Documentation Available

| File | Description |
|------|-------------|
| **OPENROUTER_SETUP.md** | Complete setup guide with model options |
| **OPENROUTER_INTEGRATION.md** | Technical details of what was changed |
| **README.md** | Full Snapgen documentation (updated) |
| **QUICKSTART.md** | 5-minute quick start guide |

## 🎯 Common Commands

### Generate with Defaults
```bash
node dist/cli/index.js generate --dry-run
```

### Generate Specific Tables
```bash
node dist/cli/index.js generate --tables User,Post --count 20 --dry-run
```

### Generate for Real Database
```bash
# First, set your DATABASE_URL in .env
node dist/cli/index.js generate --count 50
```

### Verbose Output (for debugging)
```bash
node dist/cli/index.js generate --dry-run --verbose
```

## 💰 Cost Tracking

Monitor your OpenRouter usage at:
👉 https://openrouter.ai/activity

Current setup uses GPT-4o-mini:
- **Cost**: ~$0.15 per 1M input tokens
- **Estimate**: ~$0.01 per 1,000 records
- **Your balance**: Check OpenRouter dashboard

## 🔄 Switching Models

Edit `snapgen.config.ts` to use different models:

```typescript
// Current (default)
model: 'openai/gpt-4o-mini'  // Fast & cheap

// Alternatives
model: 'openai/gpt-3.5-turbo'  // Even cheaper
model: 'anthropic/claude-3-haiku'  // Anthropic's fast model
model: 'google/gemini-flash-1.5'  // Google's model
```

See **OPENROUTER_SETUP.md** for full model list.

## 🛠 Configuration Files

### .env (Your API Key)
```env
OPENROUTER_API_KEY=sk-or-v1-a3d001f1ed5f...
DATABASE_URL=postgresql://user:pass@localhost/db  # Add when ready
```

### snapgen.config.ts (Settings)
```typescript
{
  schema: './examples/prisma/schema.prisma',
  ai: {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  },
  defaults: {
    count: 10,  // Rows per table
    parallel: 3,  // Concurrent requests
  }
}
```

## 🎯 Next Steps

1. **Test the connection** (no database needed):
   ```bash
   node dist/cli/index.js generate --dry-run
   ```

2. **Generate a sample file** to see the data:
   ```bash
   node dist/cli/index.js generate --output sample.ts --count 3
   ```

3. **Set up your database** (when ready):
   - Add `DATABASE_URL` to `.env`
   - Point `schema` in config to your actual schema
   - Run: `node dist/cli/index.js generate`

4. **Monitor costs**:
   - Visit https://openrouter.ai/activity
   - Check your usage and spending

## 🐛 Troubleshooting

### Issue: "API key not provided"
**Solution**: Check `.env` file exists and has your key

### Issue: Generation is slow
**Solution**: Reduce `parallel` in config from 3 to 2

### Issue: Want to see detailed logs
**Solution**: Add `--verbose` flag to any command

### Issue: Model not found
**Solution**: Make sure model name includes provider (e.g., `openai/gpt-4o-mini`)

## 📊 Example Schema Included

The example schema has:
- **10 tables**: User, Profile, Post, Comment, Category, Tag, Order, OrderItem, Product
- **All relationship types**: 1:1, 1:N, N:N, self-referencing
- **Complex types**: JSON, decimals, enums, UUIDs
- **Perfect for testing**

## ✨ Benefits of OpenRouter

✅ **Better rate limits** than direct OpenAI
✅ **Unified billing** for all AI providers
✅ **Cost tracking** dashboard
✅ **Multiple models** with single API key
✅ **Competitive pricing**

## 🎊 You're All Set!

Everything is configured and ready to use. Start with:

```bash
node dist/cli/index.js generate --dry-run --verbose
```

No database needed for testing!

---

## 📞 Quick Reference

| Need | Command |
|------|---------|
| Test connection | `node dist/cli/index.js generate --dry-run` |
| Generate sample file | `node dist/cli/index.js generate --output test.ts` |
| See detailed logs | Add `--verbose` to any command |
| Check OpenRouter usage | Visit https://openrouter.ai/activity |
| Read full docs | Open `OPENROUTER_SETUP.md` |

---

**Ready to generate realistic database seed data! 🚀**

Your OpenRouter API key is configured and the system is ready to use.
