import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

interface OpenedFile {
  name: string;
  path: string;
  bytes: Uint8Array;
}

async function readFileResult(filePath: string): Promise<OpenedFile> {
  const buf = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
  };
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0f14',
    title: 'PlanMark',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('dialog:openPdf', async (): Promise<OpenedFile | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return readFileResult(result.filePaths[0]);
});

ipcMain.handle('dialog:openPlanmark', async (): Promise<OpenedFile | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open PlanMark file',
    properties: ['openFile'],
    filters: [{ name: 'PlanMark', extensions: ['planmark'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return readFileResult(result.filePaths[0]);
});

ipcMain.handle(
  'dialog:savePlanmark',
  async (_e, defaultName: string, bytes: Uint8Array): Promise<{ path: string } | null> => {
    const result = await dialog.showSaveDialog({
      title: 'Save PlanMark file',
      defaultPath: defaultName,
      filters: [{ name: 'PlanMark', extensions: ['planmark'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, Buffer.from(bytes));
    return { path: result.filePath };
  },
);

ipcMain.handle(
  'file:writePlanmark',
  async (_e, filePath: string, bytes: Uint8Array): Promise<{ ok: true }> => {
    await fs.writeFile(filePath, Buffer.from(bytes));
    return { ok: true };
  },
);

ipcMain.handle('app:getUser', (): string => {
  try {
    return os.userInfo().username || 'You';
  } catch {
    return 'You';
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
