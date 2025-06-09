const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  executeScript: (scriptContent) =>
    ipcRenderer.invoke("execute-script", scriptContent),

  searchScripts: (query, page, maxResults) =>
    ipcRenderer.invoke("search-scripts", query, page, maxResults),
  fetchFeaturedScripts: (maxResults) =>
    ipcRenderer.invoke("fetch-featured-scripts", maxResults),

  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  saveFileDialog: (content, currentFilePath) =>
    ipcRenderer.invoke("save-file-dialog", content, currentFilePath),

  onMenuNewTab: (callback) => ipcRenderer.on("menu-new-tab", callback),
  onMenuOpenFile: (callback) => ipcRenderer.on("menu-open-file", callback),
  onMenuSaveFile: (callback) => ipcRenderer.on("menu-save-file", callback),
  onMenuExecuteScript: (callback) =>
    ipcRenderer.on("menu-execute-script", callback),

  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  setVibrancy: (enabled) => ipcRenderer.invoke("set-vibrancy", enabled),

  platform: process.platform,

  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
