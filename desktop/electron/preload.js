// electron/preload.js — safe IPC bridge for the Settings window.
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
});
