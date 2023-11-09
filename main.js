// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const OpenAI = require("openai");
const MarkdownIt = require('markdown-it');
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');

require('dotenv').config({ path: __dirname + '/.env' });

const { getMessageHistoryOrCreateMessage, updateConversation, getConversations, getConversationFromID, deleteConversation } = require("./models/conversation");

const md = new MarkdownIt();
const path = require('path')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { generateText } = require("./gptwrapper");

function renderMarkdown(message) {
  return md.render(message);
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    icon: 'assets/favicon.ico',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

ipcMain.handle('getNewConversationId', (event) => {
  const newId = uuidv4();
  return newId;
});

ipcMain.handle('getConversations', async () => {
  return await getConversations();
});

ipcMain.handle('getConversationFromID', async (event, conversationId) => {
  const conversation = await getConversationFromID(conversationId);
  return conversation;
});

ipcMain.handle('deleteConversation', async (event, conversationId) => {
  return await deleteConversation(conversationId);
});

ipcMain.handle('renderMarkdown', async (event, message) => {
  return renderMarkdown(message);
});

ipcMain.handle("generate-text", async (_, prompt, conversationId) => {
  try {
    return await generateText(prompt, conversationId);
  } catch (error) {
    console.error("Error while generating text:", error);
    throw error;
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
