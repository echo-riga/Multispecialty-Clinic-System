# Building a Single Executable

This project can be built into a single executable file that users can run without installing Node.js or any dependencies.

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   cd server
   npm install
   ```

2. **Build the executable**:
   - On Windows: Run `build.bat` from the project root
   - Or manually: `cd server && npm run build:win`

3. **Find your executable**:
   - The executable will be in the `dist/` folder as `server.exe`

## How It Works

The build process uses [pkg](https://github.com/vercel/pkg) to package:
- Node.js runtime
- All dependencies
- Your application code
- Static files (client HTML/CSS/JS and Doc Dizon forms)

Into a single executable file.

## Distribution

When you distribute the executable:

1. **Single File**: Users only need the `server.exe` file
2. **No Installation Required**: No Node.js, npm, or any other dependencies needed
3. **Auto-Start**: The executable automatically:
   - Starts the server on port 3000
   - Opens the browser to the application
   - Creates a `data` folder next to the executable for:
     - Database (`app.db`)
     - Uploaded files (`uploads/`)

## Data Storage

When running as an executable:
- **Database**: Stored in `data/app.db` (next to the executable)
- **Uploads**: Stored in `data/uploads/` (next to the executable)
- **Static Files**: Served from the packaged snapshot (read-only)

## Building for Other Platforms

To build for multiple platforms:

```bash
cd server
npm run build:all
```

This creates executables for:
- Windows (x64)
- Linux (x64)
- macOS (x64)

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, the server will fail to start. You can:
- Close the application using port 3000
- Or set the PORT environment variable: `set PORT=3001 && server.exe`

### Browser Doesn't Open
If the browser doesn't open automatically:
- The server is still running
- Manually open: `http://localhost:3000`
- Or disable auto-open: `set NO_BROWSER=1 && server.exe`

### Antivirus Warnings
Some antivirus software may flag the executable as suspicious because it's a packaged Node.js application. This is a false positive. You may need to:
- Add an exception for the executable
- Or sign the executable with a code signing certificate

## Development vs Production

- **Development**: Run `npm start` in the `server` directory
- **Production**: Use the built executable from `dist/`

The application automatically detects if it's running as a packaged executable and adjusts file paths accordingly.

