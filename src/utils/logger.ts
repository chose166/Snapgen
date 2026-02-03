import chalk from 'chalk';

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
  }

  info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string) {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string) {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string) {
    console.log(chalk.red('✖'), message);
  }

  debug(message: string) {
    if (this.verbose) {
      console.log(chalk.gray('›'), message);
    }
  }

  log(message: string) {
    console.log(message);
  }

  table(data: any[]) {
    console.table(data);
  }
}

export const logger = new Logger();
