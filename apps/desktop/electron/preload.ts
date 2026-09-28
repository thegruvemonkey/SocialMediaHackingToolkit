import { contextBridge, ipcRenderer } from 'electron';

export interface OpenedFile {
  name: string;
  path: string;
  bytes: Uint8Array;
}

/** The API exposed to the renderer as window.planmark. */
const api = {
  openPdf: (): Promise<OpenedFile | null> => ipcRenderer.invoke('dialog:openPdf'),
  openPlanmark: (): Promise<OpenedFile | null> => ipcRenderer.invoke('dialog:openPlanmark'),
  savePlanmarkAs: (defaultName: string, bytes: Uint8Array): Promise<{ path: string } | null> =>
    ipcRenderer.invoke('dialog:savePlanmark', defaultName, bytes),
  writePlanmark: (filePath: string, bytes: Uint8Array): Promise<{ ok: true }> =>
    ipcRenderer.invoke('file:writePlanmark', filePath, bytes),
  getUser: (): Promise<string> => ipcRenderer.invoke('app:getUser'),
};

export type PlanmarkApi = typeof api;

contextBridge.exposeInMainWorld('planmark', api);
