const { contextBridge, ipcRenderer } = require('electron');

/**
 * Minimal preload bridge exposing strictly allowlisted desktop operations.
 * Node integration is disabled and context isolation is enabled.
 */
contextBridge.exposeInMainWorld('desktopBridge', {
  openCameraSettings: () => ipcRenderer.invoke('open-camera-settings'),
});
