#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);

const logStep = (step) => {
  log(`\n${'='.repeat(50)}`, colors.cyan);
  log(`${step}`, colors.cyan);
  log(`${'='.repeat(50)}`, colors.cyan);
};

const logProject = (project) => {
  log(`\n${'─'.repeat(30)}`, colors.blue);
  log(`Testing: ${project}`, colors.blue);
  log(`${'─'.repeat(30)}`, colors.blue);
};

const runCommand = (command, cwd = process.cwd(), options = {}) => {
  try {
    log(`Running: ${command}`, colors.yellow);
    const result = execSync(command, {
      cwd,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    log(`Error running command: ${command}`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return { success: false, error };
  }
};

const checkPrerequisites = async () => {
  logStep('Checking Prerequisites');

  // Check if lib folder exists and is not empty
  const libPath = path.join(process.cwd(), 'lib');

  if (!fs.existsSync(libPath)) {
    log('Error: lib folder is missing', colors.red);
    log('Please run the build process first', colors.yellow);
    process.exit(1);
  }

  const libContents = fs.readdirSync(libPath);
  if (libContents.length === 0) {
    log('Error: lib folder is empty', colors.red);
    log('Please run the build process first', colors.yellow);
    process.exit(1);
  }

  log('✓ lib folder exists and contains files', colors.green);

  // check if tarball exists
  const tarballPath = path.join(process.cwd(), 'build', 'cspark-sdk-latest.tgz');
  if (!fs.existsSync(tarballPath)) {
    log('Error: tarball is missing', colors.red);
    log('Please run the postbuild process first', colors.yellow);
    process.exit(1);
  }
};

const testProject = async (manager, folder) => {
  logProject(`${manager}:${folder}`);

  const projectPath = path.join(process.cwd(), 'ecosystem', folder);

  if (!fs.existsSync(projectPath)) {
    log(`Warning: Project folder ${folder} does not exist`, colors.yellow);
    return false;
  }

  process.chdir(projectPath);

  try {
    // Install dependencies
    log(`Installing dependencies for ${folder}...`, colors.magenta);
    const installResult = runCommand(`${manager} install`);

    if (!installResult.success) {
      log(`Failed to install dependencies for ${folder}`, colors.red);
      return false;
    }

    log(`✓ Dependencies installed for ${folder}`, colors.green);
    log(`Running tests for ${folder}...`, colors.magenta);
    const testResult = runCommand(`${manager} test`);

    if (!testResult.success) {
      log(`Tests failed for ${folder}`, colors.red);
      return false;
    }

    log(`✓ Tests passed for ${folder}`, colors.green);
    return true;
  } catch (error) {
    log(`Unexpected error testing ${folder}: ${error.message}`, colors.red);
    return false;
  } finally {
    process.chdir(path.join(dirname, '..'));
  }
};

const main = async () => {
  const startTime = Date.now();

  log(`${colors.bright}${colors.cyan}Spark TypeScript SDK -Ecosystem Tests${colors.reset}`);
  log(`Started at: ${new Date().toISOString()}`, colors.cyan);

  process.chdir(path.join(dirname, '..'));

  try {
    await checkPrerequisites();

    const projects = [
      { manager: 'deno', folder: 'deno' },
      { manager: 'bun', folder: 'bun' },
      { manager: 'npm', folder: 'node-js' },
      { manager: 'npm', folder: 'node-ts' },
      { manager: 'npm', folder: 'browser' },
    ];

    logStep('Running Ecosystem Tests');

    const results = [];
    for (const project of projects) {
      const success = await testProject(project.manager, project.folder);
      results.push({ project: `${project.manager}:${project.folder}`, success });
    }

    logStep('Test Results Summary');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    log(`Total Projects: ${results.length}`, colors.bright);
    log(`Successful: ${successful.length}`, colors.green);
    log(`Failed: ${failed.length}`, failed.length > 0 ? colors.red : colors.green);

    if (successful.length > 0) {
      log('\n✓ Successful projects:', colors.green);
      successful.forEach((r) => log(`  - ${r.project}`, colors.green));
    }

    if (failed.length > 0) {
      log('\n✗ Failed projects:', colors.red);
      failed.forEach((r) => log(`  - ${r.project}`, colors.red));
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log(`\nCompleted in ${duration}s`, colors.cyan);

    if (failed.length > 0) {
      log('\nEcosystem tests completed with failures', colors.red);
      process.exit(1);
    } else {
      log('\nAll ecosystem tests completed successfully! 🎉', colors.bright + colors.green);
      process.exit(0);
    }
  } catch (error) {
    log(`Fatal error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
};

// Handle process termination gracefully
process.on('SIGINT', () => {
  log('\nReceived SIGINT, cleaning up...', colors.yellow);
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\nReceived SIGTERM, cleaning up...', colors.yellow);
  process.exit(143);
});

main().catch((error) => {
  log(`Unhandled error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
