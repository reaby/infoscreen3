const { spawn } = require('child_process');
const path = require('path');

console.log('Starting infoscreen3...');
console.log('CWD:', process.cwd());
console.log('Executable path:', path.resolve('./infoscreen3.exe'));

const child = spawn('./infoscreen3.exe', [], {
    stdio: 'inherit',
    shell: true
});

child.on('error', (error) => {
    console.error('Failed to start:', error);
});

child.on('exit', (code, signal) => {
    console.log(`Process exited with code ${code} and signal ${signal}`);
});

process.on('SIGINT', () => {
    child.kill('SIGINT');
});
