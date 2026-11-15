import http from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, extname, dirname } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\DSU\\AppData\\Local\\Temp\\chrome-smoke-test-profile';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.task': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

class CDPClient {
  private ws: WebSocket | null = null;
  private msgId = 1;
  private callbacks = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private eventListeners = new Map<string, Array<(params: any) => void>>();

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id)!;
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        } else if (msg.method) {
          const listeners = this.eventListeners.get(msg.method) || [];
          for (const l of listeners) l(msg.params);
        }
      };
    });
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws?.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event: string, listener: (params: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  close(): void {
    this.ws?.close();
  }
}

function startStaticServer(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';

      const filePath = join(distDir, reqPath);

      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const fileContent = readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        });
        res.end(fileContent);
      } else {
        // Fallback to index.html for SPA routing
        const indexPath = join(distDir, 'index.html');
        if (existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(readFileSync(indexPath));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

export async function runSmokeTest(): Promise<boolean> {
  console.log('\n[smoke-test] Starting headless production smoke test...');

  if (!existsSync(distDir)) {
    console.error('FAIL: dist/ directory does not exist. Run "vite build" first.');
    return false;
  }

  const { server, port } = await startStaticServer();
  const localOrigin = `http://127.0.0.1:${port}`;
  console.log(`  ✓ Local static server started at ${localOrigin}`);

  const cdpPort = 9223;
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--headless=new',
    'about:blank',
  ], { stdio: 'ignore' });

  let success = true;

  try {
    // 1. Connect to Chrome CDP
    let tab = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        if (res.ok) {
          const pages = await res.json();
          if (pages.length > 0) {
            tab = pages[0];
            break;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!tab) {
      throw new Error('Could not connect to headless Chrome via CDP.');
    }

    const client = new CDPClient(tab.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Runtime.enable');

    const consoleErrors: string[] = [];
    const nonLocalRequests: string[] = [];

    // Intercept network requests
    client.on('Network.requestWillBeSent', (params) => {
      const url: string = params.request?.url || '';
      if (!url.startsWith(localOrigin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        nonLocalRequests.push(url);
      }
    });

    // Intercept console errors
    client.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const msg = params.args.map((a: any) => a.value ?? JSON.stringify(a)).join(' ');
        consoleErrors.push(msg);
      }
    });

    client.on('Runtime.exceptionThrown', (params) => {
      const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text;
      consoleErrors.push(desc || 'Uncaught runtime exception');
    });

    // 2. Navigate to local build
    console.log(`  ✓ Navigating headless Chrome to ${localOrigin}/ ...`);
    await client.send('Page.navigate', { url: `${localOrigin}/` });

    // Wait for bundle execution & React render
    await new Promise((r) => setTimeout(r, 2500));

    // 3. Confirm IndexedDB opens
    console.log('  ✓ Verifying IndexedDB initialization in production runtime...');
    const idbResult = await client.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve, reject) => {
          if (!window.indexedDB) {
            return reject('indexedDB is not available');
          }
          const req = window.indexedDB.open('asl_practice_coach_db', 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('attempts')) {
              db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
            }
          };
          req.onsuccess = () => {
            const db = req.result;
            db.close();
            resolve({ success: true });
          };
          req.onerror = () => reject(req.error?.message || 'Failed to open IndexedDB');
        })
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    if (idbResult.result?.value?.success) {
      console.log('  ✓ IndexedDB "asl_practice_coach_db" opened successfully.');
    } else {
      console.error('  ✗ IndexedDB check failed:', idbResult);
      success = false;
    }

    // 4. Assert zero non-local requests
    if (nonLocalRequests.length === 0) {
      console.log('  ✓ Zero non-local network requests detected (100% offline isolated).');
    } else {
      console.error(`  ✗ Detected ${nonLocalRequests.length} non-local network requests:`);
      for (const reqUrl of nonLocalRequests) {
        console.error(`     - ${reqUrl}`);
      }
      success = false;
    }

    // 5. Assert zero console errors
    if (consoleErrors.length === 0) {
      console.log('  ✓ Zero console errors or uncaught exceptions.');
    } else {
      console.error(`  ✗ Detected ${consoleErrors.length} console errors:`);
      for (const err of consoleErrors) {
        console.error(`     - ${err}`);
      }
      success = false;
    }

    client.close();
  } catch (err) {
    console.error('  ✗ Headless smoke test error:', err);
    success = false;
  } finally {
    chromeProcess.kill();
    server.close();
  }

  return success;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSmokeTest().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
