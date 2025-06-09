const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs").promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    vibrancy: "under-window",
    frame: false,
    show: false,
    backgroundColor: "#00000000",
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Tab",
          accelerator: "CmdOrCtrl+T",
          click: () => {
            mainWindow.webContents.send("menu-new-tab");
          },
        },
        {
          label: "Open File",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow.webContents.send("menu-open-file");
          },
        },
        {
          label: "Save File",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow.webContents.send("menu-save-file");
          },
        },
        { type: "separator" },
        {
          label: "Execute Script",
          accelerator: "F5",
          click: () => {
            mainWindow.webContents.send("menu-execute-script");
          },
        },
        { type: "separator" },
        {
          role: "quit",
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectall" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  template.unshift({
    label: app.getName(),
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideothers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" },
    ],
  });

  template[4].submenu = [
    { role: "close" },
    { role: "minimize" },
    { role: "zoom" },
    { type: "separator" },
    { role: "front" },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("execute-script", async (event, scriptContent) => {
  const START_PORT = 6969;
  const END_PORT = 7069;
  let serverPort = null;
  let lastError = "";

  try {
    const fetch = (await import("node-fetch")).default;

    for (let port = START_PORT; port <= END_PORT; port++) {
      const url = `http://127.0.0.1:${port}/secret`;

      try {
        const res = await fetch(url, {
          method: "GET",
        });
        if (res.ok) {
          const text = await res.text();
          if (text === "0xdeadbeef") {
            serverPort = port;
            console.log(`✅ Server found on port ${port}`);
            break;
          }
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!serverPort) {
      throw new Error(
        `Could not locate HTTP server on ports ${START_PORT}-${END_PORT}. Last error: ${lastError}`,
      );
    }

    const postUrl = `http://127.0.0.1:${serverPort}/execute`;
    console.log(`Sending script to ${postUrl}`);

    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: scriptContent,
    });

    if (response.ok) {
      const resultText = await response.text();
      console.log(`✅ Script submitted successfully: ${resultText}`);
      return {
        success: true,
        message: `Script sent to server successfully.`,
        details: resultText,
      };
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error("Script execution error:", error);
    return {
      success: false,
      message: error.message,
      details: error.stack,
    };
  }
});

ipcMain.handle("open-file-dialog", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Lua Files", extensions: ["lua"] },
        { name: "Text Files", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = await fs.readFile(filePath, "utf8");
      const fileName = path.basename(filePath);

      return {
        success: true,
        filePath,
        fileName,
        content,
      };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error("File open error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("save-file-dialog", async (event, content, currentFilePath) => {
  try {
    let filePath = currentFilePath;

    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: "Lua Files", extensions: ["lua"] },
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
        defaultPath: "script.lua",
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      filePath = result.filePath;
    }

    await fs.writeFile(filePath, content, "utf8");
    const fileName = path.basename(filePath);

    return {
      success: true,
      filePath,
      fileName,
      message: "File saved successfully",
    };
  } catch (error) {
    console.error("File save error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle(
  "search-scripts",
  async (event, query, page = 1, maxResults = 20) => {
    try {
      const fetch = (await import("node-fetch")).default;

      const url = `https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}&max=${maxResults}&page=${page}`;
      console.log(`Fetching scripts from: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "SevenInterface/2.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.result?.scripts?.length || 0} scripts`);

      return {
        success: true,
        data: data.result || { scripts: [], totalPages: 0, nextPage: null },
      };
    } catch (error) {
      console.error("ScriptBlox API error:", error);
      return {
        success: false,
        message: error.message,
        details: error.stack,
      };
    }
  },
);

ipcMain.handle("fetch-featured-scripts", async (event, maxResults = 20) => {
  try {
    const fetch = (await import("node-fetch")).default;

    const url = `https://scriptblox.com/api/script/fetch?max=${maxResults}`;
    console.log(`Fetching featured scripts from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "SevenInterface/2.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(
      `✅ Found ${data.result?.scripts?.length || 0} featured scripts`,
    );

    return {
      success: true,
      data: data.result || { scripts: [], totalPages: 0, nextPage: null },
    };
  } catch (error) {
    console.error("ScriptBlox Featured API error:", error);
    return {
      success: false,
      message: error.message,
      details: error.stack,
    };
  }
});

app.on("before-quit", () => {});

ipcMain.handle("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("window-close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle("set-vibrancy", (event, enabled) => {
  if (mainWindow) {
    try {
      if (enabled) {
        mainWindow.setVibrancy("under-window");
        mainWindow.setBackgroundColor("#00000000");
      } else {
        mainWindow.setVibrancy(null);
        mainWindow.setBackgroundColor("#17181A");
      }
      return { success: true };
    } catch (error) {
      console.error("Failed to set vibrancy:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Main window not available" };
});
