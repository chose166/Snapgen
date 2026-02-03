#!/bin/bash

# Test script for OpenRouter integration

echo "🚀 Testing Snapgen with OpenRouter"
echo "===================================="
echo ""

echo "1. Checking environment variables..."
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "⚠️  OPENROUTER_API_KEY not set in environment"
    echo "   Loading from .env file..."
    if [ -f .env ]; then
        export $(cat .env | grep OPENROUTER_API_KEY | xargs)
        echo "✓ Loaded from .env"
    else
        echo "❌ No .env file found"
        exit 1
    fi
else
    echo "✓ OPENROUTER_API_KEY is set"
fi
echo ""

echo "2. Running dry-run test (no database needed)..."
echo "   Generating 3 users with OpenRouter GPT-4o-mini"
echo ""

node dist/cli/index.js generate \
    --schema ./examples/prisma/schema.prisma \
    --count 3 \
    --tables User \
    --dry-run \
    --verbose

echo ""
echo "===================================="
echo "✓ Test complete!"
echo ""
echo "Next steps:"
echo "  - Review the output above"
echo "  - If successful, try without --dry-run to insert real data"
echo "  - Monitor usage at: https://openrouter.ai/activity"
