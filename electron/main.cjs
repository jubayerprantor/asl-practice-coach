const {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  shell,
  session,
  screen,
  Menu,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 1. Register custom privileged protocol before app is ready
// Pick origin once: app://asl (persists IndexedDB and localStorage partitions)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      allowServiceWorkers: false,
    },
  },
]);

let mainWindow = null;
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json');

function getDistDir() {
  const candidates = [
    path.join(__dirname, '..', 'dist'),
    path.join(process.resourcesPath, 'app', 'dist'),
    path.join(process.resourcesPath, 'dist'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.join(__dirname, '..', 'dist');
}

function getSavedWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      const data = JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
      const displays = screen.getAllDisplays();
      const onScreen = displays.some((d) => {
        const b = d.bounds;
        return (
          data.x >= b.x &&
          data.x + 100 <= b.x + b.width &&
          data.y >= b.y &&
          data.y + 100 <= b.y + b.height
        );
      });
      if (onScreen) {
        return data;
      }
    }
  } catch {
    // Ignore invalid window state
  }
  return null;
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getNormalBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };
    fs.writeFileSync(windowStatePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Ignore write failure
  }
}

async function createWindow() {
  const savedState = getSavedWindowState();
  const width = Math.max(1024, savedState?.width ?? 1280);
  const height = Math.max(700, savedState?.height ?? 800);

  // Hide default menu bar
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width,
    height,
    x: savedState?.x,
    y: savedState?.y,
    minWidth: 1024,
    minHeight: 700,
    frame: true, // Native title bar
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#FAF9F5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: !app.isPackaged,
    },
  });

  if (savedState?.isMaximized) {
    mainWindow.maximize();
  }

  // Security: Block all navigation away from the app origin
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const url = new URL(navigationUrl);
    if (url.origin !== 'app://asl') {
      event.preventDefault();
    }
  });

  // Security: Block opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Security: In production builds, disable DevTools completely
  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Window bounds persistence listeners
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  await mainWindow.loadURL('app://asl/index.html');
}

app.whenReady().then(async () => {
  const distDir = getDistDir();

  // 2. Custom protocol handler for app://asl
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'asl') {
      return new Response('Not Found', { status: 404 });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const safeRelative = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const targetFile = path.join(distDir, safeRelative);

    // Security: ensure targetFile is within distDir
    if (!targetFile.startsWith(distDir) || !fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      return new Response('Not Found', { status: 404 });
    }

    const fileUrl = pathToFileURL(targetFile).toString();
    const response = await net.fetch(fileUrl);
    const headers = new Headers(response.headers);

    // MIME type overrides for MediaPipe Wasm, Task model, and Web Fonts
    if (targetFile.endsWith('.wasm')) {
      headers.set('Content-Type', 'application/wasm');
    } else if (targetFile.endsWith('.woff2')) {
      headers.set('Content-Type', 'font/woff2');
    } else if (targetFile.endsWith('.task')) {
      headers.set('Content-Type', 'application/octet-stream');
    } else if (targetFile.endsWith('.js') || targetFile.endsWith('.mjs')) {
      headers.set('Content-Type', 'text/javascript; charset=utf-8');
    } else if (targetFile.endsWith('.css')) {
      headers.set('Content-Type', 'text/css; charset=utf-8');
    } else if (targetFile.endsWith('.html')) {
      headers.set('Content-Type', 'text/html; charset=utf-8');
    }

    // Strict Content-Security-Policy
    headers.set(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none';"
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });

  // 3. Permissions: allow only "media" permission for origin "app://asl", deny all others
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingOrigin = new URL(
        details.requestingUrl || webContents.getURL()
      ).origin;
      if (permission === 'media' && requestingOrigin === 'app://asl') {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) => {
      return permission === 'media' && requestingOrigin === 'app://asl';
    }
  );

  // 4. Preload IPC: strictly allowlisted shell.openExternal for camera settings
  ipcMain.handle('open-camera-settings', async () => {
    await shell.openExternal('ms-settings:privacy-webcam');
  });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
