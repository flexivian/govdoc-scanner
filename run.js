#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const commands = {
  govdoc: 'Run the interactive CLI tool for full workflow (recommended)',
  crawler: 'Start the GEMI crawler to search and download documents',
  scanner: 'Run the document scanner to extract metadata', 
  help: 'Show this help message'
};

function showHelp() {
  console.log('\n🇬🇷 GovDoc Scanner - Greek Government Document Processing Tool\n');
  console.log('Usage: npm start <command> [-- <args>]\n');
  console.log('Available commands:');
  
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  });
  
  console.log('\nExamples:');
  console.log('  npm start govdoc                     # Interactive CLI workflow');
  console.log('  npm start govdoc -- --input file.gds # Process specific file');
  console.log('  npm start govdoc -- --help           # Show govdoc help');
  console.log('  npm start crawler                    # Search and download documents'); 
  console.log('  npm start scanner                    # Process existing documents');
  console.log('\nNote: The govdoc command supports both interactive and command-line modes');
  console.log('Use -- before arguments when using npm start (e.g., npm start govdoc -- --input file.gds)');
  console.log('For more information, see README.md\n');
}

function runCommand(command, args = []) {
  if (command === 'govdoc' && args.length > 0) {
    // For govdoc with arguments, run directly to pass args through
    const child = spawn('node', ['cli/src/main.mjs', ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('error', (error) => {
      console.error(`Error running command: ${error.message}`);
      process.exit(1);
    });

    child.on('close', (code) => {
      process.exit(code);
    });
  } else {
    // For other commands or govdoc without args, use npm run
    const child = spawn('npm', ['run', command], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('error', (error) => {
      console.error(`Error running command: ${error.message}`);
      process.exit(1);
    });

    child.on('close', (code) => {
      process.exit(code);
    });
  }
}

const command = process.argv[2];
const args = process.argv.slice(3); // Get all arguments after the command

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`\n❌ Unknown command: ${command}\n`);
  showHelp();
  process.exit(1);
}

console.log(`\n🚀 Starting ${command}...\n`);
runCommand(command, args);
