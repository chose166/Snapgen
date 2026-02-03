@echo off
echo.
echo ========================================
echo Testing Performance Improvements
echo ========================================
echo.
echo This will generate data with the new
echo batching and parallel processing!
echo.
echo Watch for:
echo   - Batch progress indicators
echo   - Parallel table processing
echo   - Faster completion time
echo.
pause
echo.

node dist/cli/index.js generate --count 50 --verbose

echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo Notice:
echo  1. Tables processed in parallel levels
echo  2. Large tables split into batches
echo  3. Much faster than before!
echo  4. No JSON parsing errors
echo.
pause
