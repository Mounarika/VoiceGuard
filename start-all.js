import { spawn } from 'child_process';
import path from 'path';

console.log('Starting VoiceGuard AI Backend & Frontend...\n');

// Start Express Backend
const server = spawn('npm', ['start'], {
  cwd: path.resolve('./server'),
  stdio: 'inherit',
  shell: true
});

// Start Vite Client
const client = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve('./client'),
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit();
});
