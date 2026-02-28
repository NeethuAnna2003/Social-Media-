const { spawn } = require('child_process');
const path = require('path');

// Change to frontend directory
process.chdir(path.join(__dirname, 'frontend'));

// Start the dev server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

devServer.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
});

devServer.on('error', (err) => {
  console.error('Failed to start development server:', err);
});
