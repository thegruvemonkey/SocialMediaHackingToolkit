/// <reference types="vite/client" />

interface OpenedFile {
  name: string;
  path: string;
  bytes: Uint8Array;
}

interface PlanmarkApi {
  openPdf(): Promise<OpenedFile | null>;
  openPlanmark(): Promise<OpenedFile | null>;
  savePlanmarkAs(defaultName: string, bytes: Uint8Array): Promise<{ path: string } | null>;
  writePlanmark(filePath: string, bytes: Uint8Array): Promise<{ ok: true }>;
  getUser(): Promise<string>;
}

interface Window {
  planmark: PlanmarkApi;
}
