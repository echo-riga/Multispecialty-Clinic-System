// Error handling - keep console open on Windows if there's an error
if (process.platform === 'win32') {
  process.on('uncaughtException', (error) => {
    // Special case: port already in use. Treat this as "server already running"
    // and delegate to the same behavior used elsewhere in the app.
    if (error && error.code === 'EADDRINUSE') {
      // handlePortInUse is defined later in this file; as a function declaration
      // it is hoisted and safe to call here.
      try {
        handlePortInUse();
        return;
      } catch (e) {
        // If something goes wrong in the special handler, fall through to
        // the generic logging/keypress behavior below.
        console.error('Error while handling EADDRINUSE in uncaughtException:', e);
      }
    }

    console.error('Uncaught Exception:', error);
    console.error(error.stack);
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
  });
}

const express = require('express');
const path = require('path');
const http = require('http');
const { getStaticDir } = require('./utils/paths');
const { spawn } = require('child_process');

async function openBrowserInKiosk(url) {
  const launchAttempts = [
    {
      label: 'Microsoft Edge kiosk mode (default path)',
      command: 'msedge.exe',
      args: ['--kiosk', url, '--edge-kiosk-type=fullscreen', '--no-first-run']
    },
    {
      label: 'Microsoft Edge kiosk mode (Program Files)',
      command: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      args: ['--kiosk', url, '--edge-kiosk-type=fullscreen', '--no-first-run']
    },
    {
      label: 'Microsoft Edge kiosk mode (Program Files x86)',
      command: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: ['--kiosk', url, '--edge-kiosk-type=fullscreen', '--no-first-run']
    },
    {
      label: 'Google Chrome kiosk mode (default path)',
      command: 'chrome.exe',
      args: ['--kiosk', url, '--start-fullscreen', '--no-first-run']
    },
    {
      label: 'Google Chrome kiosk mode (Program Files)',
      command: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--kiosk', url, '--start-fullscreen', '--no-first-run']
    },
    {
      label: 'Google Chrome kiosk mode (Program Files x86)',
      command: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--kiosk', url, '--start-fullscreen', '--no-first-run']
    },
    {
      label: 'default browser',
      command: 'cmd.exe',
      args: ['/c', 'start', '', url]
    }
  ];

  for (const attempt of launchAttempts) {
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(attempt.command, attempt.args, {
          detached: true,
          stdio: 'ignore'
        });

        let settled = false;

        child.once('error', (err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });

        child.once('spawn', () => {
          if (!settled) {
            settled = true;
            child.unref();
            resolve();
          }
        });
      });

      console.log(`Opening browser via ${attempt.label}...`);
      return;
    } catch (err) {
      console.warn(`Failed to launch ${attempt.label}:`, err && err.message ? err.message : err);
    }
  }

  console.log(`Server is running. Please open your browser and navigate to: ${url}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization (SQLite)
try {
  const { initDb } = require('./data/db');
  initDb();
  console.log('Database initialized successfully');
} catch (e) {
  console.error('Database initialization failed:', e && e.message ? e.message : e);
  console.error('Stack:', e.stack);
  if (process.pkg && process.platform === 'win32') {
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
  } else {
    process.exit(1);
  }
}

// Static files - use path utility to handle packaged vs development
try {
  const staticDir = getStaticDir();
  const clientPath = path.join(staticDir, 'client');
  const dizPath = path.join(staticDir, 'Doc Dizon');

  console.log('Static directory:', staticDir);
  console.log('Client path:', clientPath);
  console.log('Doc Dizon path:', dizPath);

  app.use(express.static(clientPath));
  // Serve Doc Dizon forms so dashboards can open generators directly
  app.use('/forms/diz', express.static(dizPath));
} catch (e) {
  console.error('Failed to setup static files:', e);
  console.error('Stack:', e.stack);
  if (process.pkg && process.platform === 'win32') {
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
  } else {
    process.exit(1);
  }
}

// Routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const appointmentsRouter = require('./routes/appointments');
const doctorsRouter = require('./routes/doctors');
const miscRouter = require('./routes/misc');
const patientsDocsRouter = require('./routes/patients-docs');
const adminRouter = require('./routes/admin');

app.use('/api', authRouter); // /login, /signup
app.use('/api/users', usersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api', miscRouter); // /tasks, /diagnoses, /settings/*, /stats
app.use('/api', patientsDocsRouter); // /patients*, /patients/:patientName/documents*
app.use('/api/admin', adminRouter); // Super admin database management

// Fallback to index.html for unknown routes (client-side routing support)
app.get('*', (req, res) => {
  const staticDir = getStaticDir();
  res.sendFile(path.join(staticDir, 'client', 'index.html'));
});

// HTTP server
const server = http.createServer(app);

// WebSocket initialization
const { initWebsocket } = require('./websocket');
initWebsocket(server);

// Helper: behavior when the port is already in use
function handlePortInUse() {
  const url = `http://localhost:${PORT}`;

  // When packaged on Windows, behave like "reuse" of the existing server:
  // open the browser to the existing instance in kiosk mode and exit cleanly.
  if (process.pkg && process.platform === 'win32' && !process.env.NO_BROWSER) {
    openBrowserInKiosk(url)
      .catch((error) => {
        console.warn('Failed to launch browser automatically for existing server instance:', error && error.message ? error.message : error);
        console.log(`Please open your browser and navigate to: ${url}`);
      })
      .finally(() => {
        process.exit(0);
      });
  } else {
    // Non-packaged / development mode: just log a minimal hint and exit quietly.
    console.log(`Port ${PORT} is already in use. Assuming the server is already running at ${url}.`);
    process.exit(0);
  }
}

// Handle server "error" events (e.g., port already in use)
server.on('error', (err) => {
  console.error('Server error:', err);
  console.error('Stack:', err.stack);

  // Special handling when the port is already in use.
  // This typically means another instance of the server is already running.
  if (err && err.code === 'EADDRINUSE') {
    handlePortInUse();
    return;
  }

  if (process.pkg && process.platform === 'win32') {
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 1));
  } else {
    process.exit(1);
  }
});

// Wrap listen in try/catch so synchronous EADDRINUSE is also handled cleanly
try {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);

    // Auto-open browser when packaged (optional, can be disabled with NO_BROWSER env var)
    if (process.pkg && !process.env.NO_BROWSER) {
      setTimeout(() => {
        const url = `http://localhost:${PORT}`;
        openBrowserInKiosk(url).catch((error) => {
          console.warn('Failed to launch browser automatically:', error && error.message ? error.message : error);
          console.log(`Server is running. Please open your browser and navigate to: ${url}`);
        });
      }, 1000); // Wait 1 second for server to be ready
    }
  });
} catch (err) {
  // Handle the case where listen throws synchronously
  if (err && err.code === 'EADDRINUSE') {
    handlePortInUse();
  } else {
    console.error('Server listen error:', err);
    console.error('Stack:', err.stack);

    if (process.pkg && process.platform === 'win32') {
      console.log('\nPress any key to exit...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', process.exit.bind(process, 1));
    } else {
      process.exit(1);
    }
  }
}