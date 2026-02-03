#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('snapgen')
  .description('AI-powered database seeding CLI tool')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(generateCommand);

program.parse(process.argv);
