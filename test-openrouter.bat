@echo off
echo.
echo ========================================
echo Testing Snapgen with OpenRouter
echo ========================================
echo.

echo 1. Running dry-run test (no database needed)...
echo    Generating 3 users with OpenRouter GPT-4o-mini
echo.

node dist/cli/index.js generate --schema ./examples/prisma/schema.prisma --count 3 --tables User --dry-run --verbose

echo.
echo ========================================
echo Test complete!
echo ========================================
echo.
echo Next steps:
echo   - Review the output above
echo   - If successful, try without --dry-run to insert real data
echo   - Monitor usage at: https://openrouter.ai/activity
echo.
pause
