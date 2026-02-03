# Contributing to Snapgen

Thank you for your interest in contributing to Snapgen! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/snapgen.git
cd snapgen
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and DATABASE_URL
```

4. **Build the project**

```bash
npm run build
```

5. **Run in development mode**

```bash
npm run dev -- generate --schema ./examples/prisma/schema.prisma
```

## Project Structure

```
snapgen/
├── src/
│   ├── cli/              # CLI commands and entry point
│   │   ├── commands/     # Individual commands (generate, init)
│   │   └── index.ts      # CLI setup
│   ├── parsers/          # Schema parsers
│   │   ├── prisma.ts     # Prisma schema parser
│   │   ├── drizzle.ts    # Drizzle schema parser
│   │   └── index.ts      # Parser orchestration
│   ├── generators/       # Data generators
│   │   ├── ai.ts         # OpenAI generation
│   │   └── faker.ts      # Faker fallback
│   ├── engine/           # Core logic
│   │   ├── topo-sort.ts  # Dependency resolution
│   │   ├── transformer.ts # FK transformation
│   │   └── inserter.ts   # Database insertion
│   ├── templates/        # Code generation templates
│   │   └── seed-template.ts
│   ├── types/            # TypeScript type definitions
│   │   └── schema.ts
│   ├── utils/            # Utilities
│   │   ├── config.ts
│   │   └── logger.ts
│   └── index.ts          # Main programmatic API
├── examples/             # Example schemas
│   └── prisma/
│       └── schema.prisma
└── tests/                # Tests (to be added)
```

## Making Changes

### Adding a New Feature

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style

3. Test your changes:
   ```bash
   npm run build
   npm run dev -- generate --schema ./examples/prisma/schema.prisma --dry-run
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add your feature description"
   ```

5. Push and create a pull request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names

## Testing

Currently, the project uses manual testing with example schemas. We welcome contributions to add automated tests!

To test manually:

```bash
# Test with Prisma schema
npm run dev -- generate --schema ./examples/prisma/schema.prisma --count 10 --dry-run

# Test specific tables
npm run dev -- generate --schema ./examples/prisma/schema.prisma --tables User,Post --count 5

# Test output mode
npm run dev -- generate --schema ./examples/prisma/schema.prisma --output test-seed.ts
```

## Adding Support for New Features

### Adding a New ORM

1. Create a new parser in `src/parsers/your-orm.ts`
2. Implement the parsing logic to return `ParsedSchema`
3. Add detection logic in `src/parsers/index.ts`
4. Add documentation in README

### Adding a New AI Provider

1. Add provider type to `src/types/schema.ts`
2. Implement generation logic in `src/generators/ai.ts`
3. Update config schema
4. Add documentation

### Adding a New Data Type

1. Add type to `FieldType` enum in `src/types/schema.ts`
2. Add AI prompt guidance in `src/generators/ai.ts`
3. Add Faker fallback in `src/generators/faker.ts`
4. Add type mapping in parsers

## Questions?

- Open an issue for bugs or feature requests
- Join our Discord community (coming soon)
- Email: maintainer@snapgen.dev (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
