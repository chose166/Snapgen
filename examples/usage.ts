/**
 * Example: Using snapgen programmatically
 */

import { generate } from '../src';

async function main() {
  try {
    console.log('Starting snapgen generation...');

    await generate({
      schema: './examples/prisma/schema.prisma',
      count: 10,
      connection: process.env.DATABASE_URL,
      verbose: true,
    });

    console.log('Generation completed!');
  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

main();
