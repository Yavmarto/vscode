import * as vscode from 'vscode';
import express from 'express';
import * as http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

class QrViewProvider implements vscode.WebviewViewProvider {
  private _latestHtml?: string;
  private _view?: vscode.WebviewView;
    public setQr(dataUrl: string, url: string) {
    this._latestHtml = getQrHtml(dataUrl, url);
        if (this._view) {
      this._view.webview.html = this._latestHtml!;
    }
  }
      resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
        view.webview.options = { enableScripts: false };
    if (this._latestHtml) {
      view.webview.html = this._latestHtml;
    } else {
      view.webview.html = '<p>QR will appear once server starts...</p>';
    }

    // Ensure QR appears when user later shows the view
    view.onDidChangeVisibility(() => {
      if (view.visible && this._latestHtml) {
        view.webview.html = this._latestHtml;
      }
    });
  }
}

let qrProvider: QrViewProvider;


export function activate(context: vscode.ExtensionContext) {
  // Register QR view provider
  qrProvider = new QrViewProvider();
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('codeChiefRemote.qrView', qrProvider));

  // Command to focus QR view
  context.subscriptions.push(vscode.commands.registerCommand('code-chief-remote.showQr', () => {
    vscode.commands.executeCommand('codeChiefRemote.qrView.focus');
  }));

  const port = vscode.workspace.getConfiguration('codeChiefRemote').get<number>('port') ?? 3000;
  const token = randomUUID();


  const app = express();
  app.use(express.json());

  // Auth middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const authHeader = req.get('authorization') || '';
      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match || match[1] !== token) {
        return res.status(401).send('Unauthorized');
      }
    }
    next();
  });

  app.get('/api/health', (_, res) => res.send('OK'));

  app.get('/api/files', async (req, res) => {
    const rel = (req.query.path as string | undefined) ?? '';
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return res.status(500).send('No workspace');

    const target = path.resolve(root, rel);
    if (!target.startsWith(root)) return res.status(400).send('Invalid path');
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return res.status(404).send('Dir not found');

    res.json(getFileTree(target, path.relative(root, target)));
  });

  app.get('/api/files/content', async (req, res) => {
    const p = req.query.path as string | undefined;
    if (!p) return res.status(400).send('path required');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return res.status(500).send('No workspace');
    const abs = path.resolve(root, p);
    if (!abs.startsWith(root)) return res.status(400).send('Invalid path');
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return res.status(404).send('Not found');
    const content = fs.readFileSync(abs, 'utf8');
    res.json({ content });
  });

  // ------------------ Generic VS Code command handler ------------------
  // POST variant: { command: string, args?: any[] }
  app.post('/api/command', async (req, res) => {
    const { command, args = [] } = req.body || {};
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command string required' });
    }
    try {
      const result = await vscode.commands.executeCommand(command, ...args);
      return res.json({ result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message ?? String(err) });
    }
  });

  // GET variant: /api/command?command=...&args=[jsonEncodedArray]
  app.get('/api/command', async (req, res) => {
    const command = req.query.command as string | undefined;
    const argsRaw = req.query.args as string | undefined;
    const args = argsRaw ? JSON.parse(argsRaw) : [];
    if (!command) return res.status(400).send('command required');
    try {
      const result = await vscode.commands.executeCommand(command, ...(args as any[]));
      return res.json({ result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message ?? String(err) });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    if (url.searchParams.get('token') !== token) {
      ws.close(4403, 'Unauthorized');
      return;
    }
    ws.send('connected');
  });

  server.listen(port, () => {
    const ip = getLocalIp();
    const url = `http://${ip}:${port}`;
    const qrData = JSON.stringify({ serverUrl: url, sessionToken: token });

    QRCode.toDataURL(qrData, { margin: 2, width: 256 })
      .then((dataUrl: string) => {
        vscode.window.showInformationMessage(`Code Chief Remote running on ${url}`);
        vscode.env.clipboard.writeText(token);
        qrProvider.setQr(dataUrl, url);
      })
      .catch((err: Error) => {
        vscode.window.showErrorMessage('QR generation failed: ' + err.message);
      });
  });




// Status bar button
const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusItem.text = '$(link-external) Code Chief QR';
statusItem.command = 'code-chief-remote.showQr';
statusItem.tooltip = 'Show Code Chief Remote QR';
statusItem.show();
context.subscriptions.push(statusItem);

// nothing to dispose here, server closed later in deactivate
}

export function deactivate() {}

function getQrHtml(dataUrl: string, url: string): string {
  const escapedUrl = url.replace(/&/g, '&amp;');
  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>Scan QR</title>
  <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;margin:0;padding:20px;}img{width:256px;height:256px}p{margin-top:16px;font-size:14px;word-break:break-all;text-align:center}</style></head>
  <body><h2>Scan to Connect</h2><img src="${dataUrl}"/><p>${escapedUrl}</p></body></html>`;
}

function getFileTree(dir: string, relativeBase = ''): FileNode[] {
  const files = fs.readdirSync(dir);
  const tree: FileNode[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const relPath = path.join(relativeBase, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      tree.push({
        name: file,
        path: relPath,
        isDirectory: true,
        children: getFileTree(filePath, relPath),
      });
    } else {
      tree.push({ name: file, path: relPath, isDirectory: false });
    }
  }
  return tree;
}

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return 'localhost';
}
