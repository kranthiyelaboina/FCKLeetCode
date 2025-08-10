import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      nodeIntegrationInWorker: false,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: Add an icon
    resizable: true,
    center: true,
    title: 'FCKLeetCode - AI-Powered Problem Solver',
    titleBarStyle: 'default',
    backgroundColor: '#0d1117',
    minWidth: 1200,
    minHeight: 800
  });

  // Load the HTML file
  mainWindow.loadFile('gui/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Remove the createSettingsWindow function and open-settings handler since we're using in-page modal

// IPC handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-env-config', () => {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const config = {};
    
    envContent.split('\n').forEach(line => {
      if (line.includes('=') && !line.startsWith(';')) {
        const [key, value] = line.split('=');
        config[key.trim()] = value.trim();
      }
    });
    
    return config;
  } catch (error) {
    return {};
  }
});

ipcMain.handle('save-env-config', async (event, config) => {
  try {
    console.log('Attempting to save config:', config);
    
    let envContent = `; Please change this for your convenience, will be only used to create google profile.
USER_EMAIL=${config.USER_EMAIL || 'kranthiyelaboina2580@gmail.com'}
; Open Chrome, type chrome://version/ in url, replace the below string with 'Executable Path'
GOOGLE_CHROME_EXECUTABLE_PATH=${config.GOOGLE_CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'}
; Get your Gemini API key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=${config.GEMINI_API_KEY || ''}
; Selected Gemini model (gemini-1.5-flash, gemini-2.0-flash-exp, gemini-1.5-pro, gemini-pro)
GEMINI_MODEL=${config.GEMINI_MODEL || 'gemini-1.5-flash'}
; Programming language for solutions (java, python, cpp, c, javascript, typescript, go, rust)
PROGRAMMING_LANGUAGE=${config.PROGRAMMING_LANGUAGE || 'java'}
; Performance settings
VERBOSE_LOGGING=${config.VERBOSE_LOGGING || 'false'}
AUTO_RETRY=${config.AUTO_RETRY || 'true'}
SKIP_SOLVED=${config.SKIP_SOLVED || 'true'}
SKIP_PREMIUM=${config.SKIP_PREMIUM || 'true'}
ENABLE_OPTIMIZATIONS=${config.ENABLE_OPTIMIZATIONS || 'true'}
ENABLE_FALLBACK=${config.ENABLE_FALLBACK || 'true'}`;

    // Get the current working directory
    const envPath = path.join(__dirname, '.env');
    console.log('Writing to env file at:', envPath);
    
    // Write the file with explicit error handling
    await fs.promises.writeFile(envPath, envContent, 'utf8');
    console.log('Successfully wrote .env file');
    
    // Reload environment variables by re-reading the .env file
    dotenv.config({ path: envPath, override: true });
    console.log('Reloaded dotenv config');
    
    // Update process.env directly to ensure immediate availability
    Object.keys(config).forEach(key => {
      process.env[key] = config[key];
      console.log(`Set process.env.${key} = ${config[key]}`);
    });
    
    console.log('Environment reloaded with new config successfully');
    
    // Notify main window of config update
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('config-updated', config);
      console.log('Sent config-updated event to renderer');
    }
    
    return { success: true, message: 'Configuration saved successfully' };
  } catch (error) {
    console.error('Error saving config:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
});

ipcMain.handle('start-solving', async (event, config) => {
  try {
    // Validate configuration
    console.log('Received config:', config);
    if (!config || !config.geminiModel || (!config.problemCount && config.problemCount !== 0)) {
      console.error('Configuration validation failed:', {
        hasConfig: !!config,
        hasGeminiModel: !!(config && config.geminiModel),
        hasProblemCount: !!(config && (config.problemCount || config.problemCount === 0))
      });
      return { 
        success: false, 
        error: 'Invalid configuration. Please check your settings.' 
      };
    }

    // Import the solver dynamically
    const { default: LeetcoderSolver } = await import('./leetcoder/LeetcoderSolver.js');
    
    // Set up progress callback to forward to renderer
    const progressCallback = (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('solving-progress', data);
      }
    };
    
    // Add progress callback to config
    config.progressCallback = progressCallback;
    LeetcoderSolver.progressCallback = progressCallback;
    
    // Start solving with the configuration
    const result = await LeetcoderSolver.solveWithConfig(config);
    
    // Send final completion update
    progressCallback({
      percentage: 100,
      message: 'Session completed successfully!',
      solved: result.solved || 0,
      failed: result.failed || 0,
      skipped: result.skipped || 0,
      premium: result.premium || 0,
      current: 'Session Complete',
      completed: true
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('Error starting solver:', error);
    
    // Send error update to GUI
    if (mainWindow) {
      mainWindow.webContents.send('solving-progress', {
        percentage: 0,
        message: `Error: ${error.message}`,
        error: true,
        completed: true
      });
    }
    
    // Provide user-friendly error messages
    let userMessage = error.message || 'Unexpected error occurred';
    
    // Handle specific error patterns
    if (userMessage.includes('QUOTA_EXCEEDED') || userMessage.includes('429') || userMessage.includes('quota exceeded')) {
      userMessage = 'API quota exceeded. Please wait or try a different AI model.';
    } else if (userMessage.includes('INVALID_ARGUMENT') && userMessage.includes('API key')) {
      userMessage = 'Invalid API key. Please check your API configuration in Settings.';
    } else if (userMessage.includes('All selectors failed') || userMessage.includes('submit button')) {
      userMessage = 'Cannot find submit button on LeetCode. The interface may have changed.';
    } else if (userMessage.includes('fetch') || userMessage.includes('ENOTFOUND')) {
      userMessage = 'Network connection error. Please check your internet connection.';
    } else if (userMessage.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    }
    
    return { success: false, error: userMessage };
  }
});

ipcMain.handle('get-problem-name', async (event, problemNumber) => {
  try {
    // Import GeminiAI dynamically
    const { default: GeminiAI } = await import('./managers/GeminiAI.js');
    
    const gemini = new GeminiAI();
    const problemName = await gemini.getProblemNameByNumber(problemNumber);
    
    return { success: true, problemName };
  } catch (error) {
    console.error('Error getting problem name:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-api-key', async (event, apiKey) => {
  try {
    // Import GeminiAI dynamically
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Test the API key with a simple prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Test prompt: What is 2+2?');
    const response = await result.response;
    
    if (response && response.text()) {
      return { success: true, message: 'API key is valid and working' };
    } else {
      return { success: false, error: 'Invalid API response' };
    }
  } catch (error) {
    console.error('API key test error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  const { shell } = await import('electron');
  return shell.openExternal(url);
});

ipcMain.handle('show-message-box', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('close-app', () => {
  app.quit();
});

ipcMain.handle('stop-solving', async (event) => {
  try {
    // If there's an active solving process, stop it
    // This would need to be implemented based on your solver structure
    console.log('Stopping solving process...');
    return { success: true };
  } catch (error) {
    console.error('Error stopping solver:', error);
    return { success: false, error: error.message };
  }
});

// Handle progress updates from the solver
ipcMain.on('solver-progress', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('solving-progress', data);
  }
});

// Handle status updates from the solver
ipcMain.on('solver-status', (event, message) => {
  if (mainWindow) {
    mainWindow.webContents.send('solving-status', message);
  }
});
