// electron/preload.js — safe IPC bridge for the Settings / Logs / License windows.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('m2c', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  testDb: (db) => ipcRenderer.invoke('config:testDb', db),
  saveDb: (db) => ipcRenderer.invoke('config:saveDb', db),
  close: () => ipcRenderer.invoke('settings:close'),
  // Logs
  getLogs: () => ipcRenderer.invoke('logs:get'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  onLogLine: (cb) => ipcRenderer.on('logs:line', (_e, entry) => cb(entry)),
  // License (update / re-activate anytime). Routed through the main process so
  // the local API is reached without CORS, and works even before login.
  licenseStatus: () => ipcRenderer.invoke('license:status'),
  licenseActivate: (token) => ipcRenderer.invoke('license:activate', token),
  closeLicense: () => ipcRenderer.invoke('license:close'),
  copyText: (text) => ipcRenderer.invoke('clip:write', text),
});
