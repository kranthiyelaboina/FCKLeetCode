@echo off
setlocal enabledelayedexpansion

:: ================================================================
:: LeetCoder Bot - Complete Installation Script
:: ================================================================
echo.
echo ================================================================================
echo                           LEETCODER BOT INSTALLER                              
echo ================================================================================
echo This script will install all required dependencies for LeetCoder Bot
echo.

:: Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [ADMIN] Running with Administrator privileges ✓
) else (
    echo [WARNING] Not running as Administrator. Some installations may fail.
    echo [INFO] Consider running this script as Administrator for best results.
    pause
)

echo.
echo [INFO] Starting installation process...
echo.

:: ================================================================
:: 1. CHECK SYSTEM REQUIREMENTS
:: ================================================================
echo ================================================================================
echo STEP 1: CHECKING SYSTEM REQUIREMENTS
echo ================================================================================
echo.

:: Check Windows version
echo [CHECK] Verifying Windows version...
ver | findstr /i "10\|11\|Server 2019\|Server 2022" >nul
if %errorLevel% == 0 (
    echo [✓] Windows version supported
) else (
    echo [!] Warning: Untested Windows version. Proceeding anyway...
)

:: Check if running from correct directory
if not exist "package.json" (
    echo [ERROR] package.json not found! 
    echo [ERROR] Please run this script from the LeetCoder project directory
    pause
    exit /b 1
)
echo [✓] Running from correct project directory

echo.

:: ================================================================
:: 2. NODE.JS AND NPM INSTALLATION
:: ================================================================
echo ================================================================================
echo STEP 2: NODE.JS AND NPM SETUP
echo ================================================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Node.js is already installed
    node --version
) else (
    echo [INSTALL] Node.js not found. Please install Node.js manually:
    echo [INFO] 1. Visit: https://nodejs.org/
    echo [INFO] 2. Download and install the LTS version
    echo [INFO] 3. Restart this script after installation
    echo.
    set /p choice="Press 'y' to continue anyway (not recommended) or any other key to exit: "
    if /i "!choice!" neq "y" exit /b 1
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] npm is available
    npm --version
) else (
    echo [ERROR] npm not found! Node.js installation may be incomplete.
    pause
    exit /b 1
)

echo.

:: ================================================================
:: 3. GOOGLE CHROME INSTALLATION CHECK
:: ================================================================
echo ================================================================================
echo STEP 3: GOOGLE CHROME VERIFICATION
echo ================================================================================
echo.

:: Check common Chrome installation paths
set "CHROME_FOUND=0"
set "CHROME_PATHS[0]=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME_PATHS[1]=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "CHROME_PATHS[2]=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

for /l %%i in (0,1,2) do (
    if exist "!CHROME_PATHS[%%i]!" (
        echo [✓] Google Chrome found at: !CHROME_PATHS[%%i]!
        set "CHROME_FOUND=1"
        set "CHROME_PATH=!CHROME_PATHS[%%i]!"
        goto :chrome_found
    )
)

:chrome_found
if %CHROME_FOUND% == 0 (
    echo [WARNING] Google Chrome not found in standard locations
    echo [INFO] Please install Google Chrome from: https://www.google.com/chrome/
    echo [INFO] The application requires Chrome for web automation
    echo.
    set /p choice="Press 'y' to continue anyway or any other key to exit: "
    if /i "!choice!" neq "y" exit /b 1
) else (
    echo [INFO] Chrome path will be configured in .env file
)

echo.

:: ================================================================
:: 4. PROJECT DEPENDENCIES INSTALLATION
:: ================================================================
echo ================================================================================
echo STEP 4: INSTALLING PROJECT DEPENDENCIES
echo ================================================================================
echo.

echo [INSTALL] Clearing npm cache...
npm cache clean --force
if %errorLevel% neq 0 (
    echo [WARNING] Failed to clear npm cache, continuing...
)

echo.
echo [INSTALL] Installing Node.js dependencies...
echo [INFO] This may take a few minutes...
npm install
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install npm dependencies!
    echo [INFO] Trying alternative installation methods...
    
    echo [RETRY] Attempting with --legacy-peer-deps...
    npm install --legacy-peer-deps
    if %errorLevel% neq 0 (
        echo [RETRY] Attempting with --force flag...
        npm install --force
        if %errorLevel% neq 0 (
            echo [ERROR] All npm installation attempts failed!
            echo [INFO] Please check your internet connection and try again
            pause
            exit /b 1
        )
    )
)

echo [✓] Node.js dependencies installed successfully

:: Verify critical dependencies
echo.
echo [VERIFY] Checking critical dependencies...
npm list electron >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Electron installed
) else (
    echo [!] Electron missing, attempting manual install...
    npm install electron --save-dev
)

npm list puppeteer >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Puppeteer installed
) else (
    echo [!] Puppeteer missing, attempting manual install...
    npm install puppeteer
)

npm list @google/generative-ai >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Google Generative AI installed
) else (
    echo [!] Google Generative AI missing, attempting manual install...
    npm install @google/generative-ai
)

echo.

:: ================================================================
:: 5. ENVIRONMENT CONFIGURATION
:: ================================================================
echo ================================================================================
echo STEP 5: ENVIRONMENT CONFIGURATION
echo ================================================================================
echo.

:: Check if .env file exists
if exist ".env" (
    echo [✓] .env file already exists
    echo [INFO] Current configuration will be preserved
) else (
    echo [CREATE] Creating .env file with default configuration...
    
    :: Create .env file with default values
    (
        echo ; Please change this for your convenience, will be only used to create google profile.
        echo USER_EMAIL=your-email@gmail.com
        echo ; Open Chrome, type chrome://version/ in url, replace the below string with 'Executable Path'
        if defined CHROME_PATH (
            echo GOOGLE_CHROME_EXECUTABLE_PATH=!CHROME_PATH!
        ) else (
            echo GOOGLE_CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
        )
        echo ; Get your Gemini API key from https://makersuite.google.com/app/apikey
        echo GEMINI_API_KEY=your_gemini_api_key_here
        echo ; Selected Gemini model (gemini-1.5-flash, gemini-2.0-flash-exp, gemini-1.5-pro, gemini-pro^)
        echo GEMINI_MODEL=gemini-1.5-flash
        echo ; Programming language for solutions (java, python, cpp, c, javascript, typescript, go, rust^)
        echo PROGRAMMING_LANGUAGE=java
        echo ; Performance settings
        echo VERBOSE_LOGGING=true
        echo AUTO_RETRY=true
        echo SKIP_SOLVED=true
        echo SKIP_PREMIUM=true
        echo ENABLE_OPTIMIZATIONS=true
        echo ENABLE_FALLBACK=true
    ) > .env
    
    echo [✓] .env file created with default settings
)

echo.

:: ================================================================
:: 6. DIRECTORY STRUCTURE SETUP
:: ================================================================
echo ================================================================================
echo STEP 6: CREATING DIRECTORY STRUCTURE
echo ================================================================================
echo.

:: Create necessary directories
echo [CREATE] Setting up directory structure...

if not exist "UserData" (
    mkdir "UserData"
    echo [✓] Created UserData directory
)

if not exist "problems" (
    mkdir "problems"
    echo [✓] Created problems directory
)

if not exist "java" (
    mkdir "java"
    echo [✓] Created java directory
)

if not exist "logs" (
    mkdir "logs"
    echo [✓] Created logs directory
)

echo [✓] Directory structure setup complete

echo.

:: ================================================================
:: 7. ADDITIONAL TOOLS INSTALLATION (OPTIONAL)
:: ================================================================
echo ================================================================================
echo STEP 7: ADDITIONAL TOOLS SETUP (OPTIONAL)
echo ================================================================================
echo.

:: Check if Git is installed (useful for updates)
git --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Git is available
    git --version
) else (
    echo [INFO] Git not found. Consider installing Git for easier updates:
    echo [INFO] Download from: https://git-scm.com/download/windows
)

:: Check if Visual Studio Code is available (useful for editing)
code --version >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Visual Studio Code is available
) else (
    echo [INFO] VS Code not found. Consider installing for easier code editing:
    echo [INFO] Download from: https://code.visualstudio.com/
)

echo.

:: ================================================================
:: 8. INSTALLATION VERIFICATION
:: ================================================================
echo ================================================================================
echo STEP 8: INSTALLATION VERIFICATION
echo ================================================================================
echo.

echo [TEST] Running installation verification tests...

:: Test Node.js modules
echo [TEST] Testing Node.js imports...
node -e "console.log('Node.js working ✓')" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Node.js runtime working
) else (
    echo [!] Node.js runtime test failed
)

:: Test if main modules can be imported
node -e "import('puppeteer').then(() => console.log('Puppeteer import ✓')).catch(e => {console.error('Puppeteer import failed:', e.message); process.exit(1)})" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Puppeteer can be imported
) else (
    echo [!] Puppeteer import test failed
)

node -e "import('@google/generative-ai').then(() => console.log('GoogleAI import ✓')).catch(e => {console.error('GoogleAI import failed:', e.message); process.exit(1)})" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Google Generative AI can be imported
) else (
    echo [!] Google Generative AI import test failed
)

node -e "import('electron').then(() => console.log('Electron import ✓')).catch(e => {console.error('Electron import failed:', e.message); process.exit(1)})" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Electron can be imported
) else (
    echo [!] Electron import test failed
)

:: Test if main application file exists and is valid
if exist "main.js" (
    echo [✓] Main application file exists
) else (
    echo [!] main.js file missing
)

if exist "package.json" (
    echo [✓] Package configuration exists
) else (
    echo [!] package.json file missing
)

echo.

:: ================================================================
:: 9. FINAL SETUP AND CONFIGURATION GUIDE
:: ================================================================
echo ================================================================================
echo INSTALLATION COMPLETE!
echo ================================================================================
echo.
echo [SUCCESS] LeetCoder Bot has been installed successfully!
echo.
echo ================================================================================
echo NEXT STEPS - IMPORTANT CONFIGURATION REQUIRED:
echo ================================================================================
echo.
echo 1. CONFIGURE YOUR API KEY:
echo    • Edit the .env file in this directory
echo    • Get your Gemini API key from: https://makersuite.google.com/app/apikey
echo    • Replace 'your_gemini_api_key_here' with your actual API key
echo.
echo 2. UPDATE EMAIL ADDRESS:
echo    • Replace 'your-email@gmail.com' with your actual email
echo    • This is used for Chrome profile management
echo.
echo 3. VERIFY CHROME PATH:
if defined CHROME_PATH (
echo    • Chrome path auto-detected: !CHROME_PATH!
echo    • Verify this path is correct in the .env file
) else (
echo    • Update GOOGLE_CHROME_EXECUTABLE_PATH in .env with correct Chrome path
echo    • Find your Chrome path by typing chrome://version/ in Chrome address bar
)
echo.
echo 4. CHOOSE PROGRAMMING LANGUAGE:
echo    • Set PROGRAMMING_LANGUAGE in .env file
echo    • Supported: java, python, cpp, javascript, etc.
echo.
echo ================================================================================
echo RUNNING THE APPLICATION:
echo ================================================================================
echo.
echo To start the GUI application:
echo    npm start
echo.
echo To run from command line:
echo    npm run cli
echo.
echo To run in development mode:
echo    npm run dev
echo.
echo ================================================================================
echo TROUBLESHOOTING:
echo ================================================================================
echo.
echo If you encounter issues:
echo 1. Make sure your .env file is properly configured
echo 2. Ensure your Gemini API key is valid and has quota remaining
echo 3. Verify Chrome is installed and the path is correct
echo 4. Check that your internet connection is working
echo 5. Try running: npm install --force
echo.
echo For support, check the project documentation or GitHub issues.
echo.
echo ================================================================================

:: Check if user wants to start the application now
set /p start_now="Would you like to start the application now? (y/n): "
if /i "%start_now%" == "y" (
    echo.
    echo [START] Launching LeetCoder Bot...
    echo [INFO] Remember to configure your .env file with valid API key!
    echo.
    npm start
) else (
    echo.
    echo [INFO] Installation complete! Run 'npm start' when you're ready.
)

echo.
echo Press any key to exit...
pause >nul
