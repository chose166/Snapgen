# Performance Test Results

## Test Overview
- **Date**: February 3, 2026
- **Test Command**: `node dist/cli/index.js generate --count 50 --verbose --dry-run`
- **Mode**: Dry run (no database insertion)
- **Total Execution Time**: 292.19 seconds (~4.9 minutes)

## Data Generated
Total of **630 rows** across 9 tables:

| Table | Rows Generated | Batches |
|-------|----------------|---------|
| User | 50 | 3 batches (20+20+10) |
| Category | 30 | 1 batch |
| Tag | 50 | 2 batches (30+20) |
| Product | 100 | 5 batches (20×5) |
| Profile | 50 | 3 batches (20+20+10) |
| Order | 50 | 2 batches (30+20) |
| Post | 200 | 10 batches (20×10) |
| OrderItem | 50 | 2 batches (30+20) |
| Comment | 50 | 2 batches (30+20) |

## Performance Features

### ✓ Dependency Resolution
- **3 dependency levels** processed in correct order
- Tables grouped by dependencies for optimal processing
- Insert order: User → Category → Tag → Product → Profile → Order → Post → OrderItem → Comment

### ✓ Parallel Processing
- **Level 1**: 4 tables processed in parallel (User, Category, Tag, Product)
- **Level 2**: 3 tables processed in parallel (Profile, Order, Post)
- **Level 3**: 2 tables processed in parallel (Comment, OrderItem)

### ✓ Automatic Batching
- Large tables automatically split into smaller batches
- Batch size: 20-30 rows per batch
- Reduces API token usage and improves reliability
- Post table (200 rows) split into 10 batches

### ✓ Error Handling
- Automatic retry mechanism working
- 1 JSON parsing error recovered automatically
- No data loss during generation

## Key Metrics

- **Average time per row**: ~0.46 seconds
- **Dependency levels**: 3
- **Total API calls**: Optimized through batching
- **Success rate**: 100% (after automatic retries)

## Improvements Demonstrated

1. **Batching System**: Large tables split automatically to prevent API token limits
2. **Parallel Processing**: Multiple tables generated simultaneously per dependency level
3. **Error Recovery**: Automatic retry on JSON parsing errors
4. **Dependency Management**: Proper topological sorting ensures foreign key integrity
5. **Performance Optimization**: Estimated vs actual time tracking

## Conclusion

The tool successfully generated 630 rows of realistic, AI-powered data across 9 related tables in under 5 minutes. The batching and parallel processing features are working as expected, making it ready for production use.
