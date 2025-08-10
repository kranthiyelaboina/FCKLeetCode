# LeetCoder Bot - Complete Installation Script (PowerShell)
# Run this script as Administrator for best results

param(
    [switch]$SkipConfirmation,
    [switch]$Verbose
)

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = 'Continue'
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "                           $Message" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[INFO] " -NoNewline -ForegroundColor Blue
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] " -NoNewline -ForegroundColor Green
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] " -NoNewline -ForegroundColor Yellow
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -NoNewline -ForegroundColor Red
    Write-Host $Message
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Start installation
Clear-Host
Write-Header "LEETCODER BOT INSTALLER"
Write-Host "This script will install all required dependencies for LeetCoder Bot" -ForegroundColor White
Write-Host ""

# Check administrator privileges
if (Test-Administrator) {
    Write-Success "Running with Administrator privileges"
} else {
    Write-Warning "Not running as Administrator. Some installations may fail."
    Write-Step "Consider running PowerShell as Administrator for best results."
    if (-not $SkipConfirmation) {
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne 'y' -and $continue -ne 'Y') {
            exit 1
        }
    }
}

Write-Header "STEP 1: CHECKING SYSTEM REQUIREMENTS"

# Check Windows version
$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
Write-Step "Checking Windows version: $($osInfo.Caption)"
if ($osInfo.Version -ge "10.0") {
    Write-Success "Windows version supported"
} else {
    Write-Warning "Older Windows version detected. May have compatibility issues."
}

# Check if running from correct directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found!"
    Write-Error "Please run this script from the LeetCoder project directory"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Success "Running from correct project directory"

Write-Header "STEP 2: NODE.JS AND NPM SETUP"

# Check Node.js installation
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Success "Node.js is already installed: $nodeVersion"
} else {
    Write-Warning "Node.js not found!"
    Write-Step "Please install Node.js from: https://nodejs.org/"
    Write-Step "Download and install the LTS version"
    Write-Step "Restart this script after installation"
    
    # Attempt to install via Chocolatey if available
    if (Test-Command "choco") {
        if (-not $SkipConfirmation) {
            $installNode = Read-Host "Install Node.js via Chocolatey? (y/N)"
            if ($installNode -eq 'y' -or $installNode -eq 'Y') {
                Write-Step "Installing Node.js via Chocolatey..."
                choco install nodejs -y
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Node.js installed via Chocolatey"
                    # Refresh environment variables
                    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                }
            }
        }
    } elseif (Test-Command "winget") {
        if (-not $SkipConfirmation) {
            $installNode = Read-Host "Install Node.js via winget? (y/N)"
            if ($installNode -eq 'y' -or $installNode -eq 'Y') {
                Write-Step "Installing Node.js via winget..."
                winget install OpenJS.NodeJS
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Node.js installed via winget"
                    # Refresh environment variables
                    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                }
            }
        }
    }
    
    if (-not (Test-Command "node")) {
        Write-Error "Node.js installation required!"
        if (-not $SkipConfirmation) {
            $continue = Read-Host "Continue anyway? (not recommended) (y/N)"
            if ($continue -ne 'y' -and $continue -ne 'Y') {
                exit 1
            }
        }
    }
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Success "npm is available: $npmVersion"
} else {
    Write-Error "npm not found! Node.js installation may be incomplete."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Header "STEP 3: GOOGLE CHROME VERIFICATION"

# Check for Chrome installation
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)

$chromeFound = $false
$chromePath = ""

foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        Write-Success "Google Chrome found at: $path"
        $chromeFound = $true
        $chromePath = $path
        break
    }
}

if (-not $chromeFound) {
    Write-Warning "Google Chrome not found in standard locations"
    Write-Step "Please install Google Chrome from: https://www.google.com/chrome/"
    Write-Step "The application requires Chrome for web automation"
    
    # Attempt to install via package managers
    if (Test-Command "choco") {
        if (-not $SkipConfirmation) {
            $installChrome = Read-Host "Install Google Chrome via Chocolatey? (y/N)"
            if ($installChrome -eq 'y' -or $installChrome -eq 'Y') {
                Write-Step "Installing Google Chrome via Chocolatey..."
                choco install googlechrome -y
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Google Chrome installed via Chocolatey"
                    $chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
                    if (Test-Path $chromePath) {
                        $chromeFound = $true
                    }
                }
            }
        }
    } elseif (Test-Command "winget") {
        if (-not $SkipConfirmation) {
            $installChrome = Read-Host "Install Google Chrome via winget? (y/N)"
            if ($installChrome -eq 'y' -or $installChrome -eq 'Y') {
                Write-Step "Installing Google Chrome via winget..."
                winget install Google.Chrome
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Google Chrome installed via winget"
                    $chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
                    if (Test-Path $chromePath) {
                        $chromeFound = $true
                    }
                }
            }
        }
    }
    
    if (-not $chromeFound -and -not $SkipConfirmation) {
        $continue = Read-Host "Continue without Chrome? (y/N)"
        if ($continue -ne 'y' -and $continue -ne 'Y') {
            exit 1
        }
    }
}

Write-Header "STEP 4: INSTALLING PROJECT DEPENDENCIES"

Write-Step "Clearing npm cache..."
try {
    npm cache clean --force 2>$null
    Write-Success "npm cache cleared"
} catch {
    Write-Warning "Failed to clear npm cache, continuing..."
}

Write-Step "Installing Node.js dependencies... (this may take a few minutes)"
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Success "Node.js dependencies installed successfully"
} catch {
    Write-Warning "Standard npm install failed, trying alternative methods..."
    
    try {
        Write-Step "Attempting with --legacy-peer-deps..."
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) {
            throw "npm install --legacy-peer-deps failed"
        }
        Write-Success "Dependencies installed with --legacy-peer-deps"
    } catch {
        try {
            Write-Step "Attempting with --force flag..."
            npm install --force
            if ($LASTEXITCODE -ne 0) {
                throw "npm install --force failed"
            }
            Write-Success "Dependencies installed with --force"
        } catch {
            Write-Error "All npm installation attempts failed!"
            Write-Step "Please check your internet connection and try again"
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
}

# Verify critical dependencies
Write-Step "Verifying critical dependencies..."
$criticalDeps = @("electron", "puppeteer", "@google/generative-ai", "dotenv", "clipboardy")

foreach ($dep in $criticalDeps) {
    try {
        npm list $dep 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$dep installed"
        } else {
            Write-Warning "$dep missing, attempting manual install..."
            npm install $dep
        }
    } catch {
        Write-Warning "Could not verify $dep"
    }
}

Write-Header "STEP 5: ENVIRONMENT CONFIGURATION"

if (Test-Path ".env") {
    Write-Success ".env file already exists"
    Write-Step "Current configuration will be preserved"
} else {
    Write-Step "Creating .env file with default configuration..."
    
    $envContent = @"
; Please change this for your convenience, will be only used to create google profile.
USER_EMAIL=your-email@gmail.com
; Open Chrome, type chrome://version/ in url, replace the below string with 'Executable Path'
GOOGLE_CHROME_EXECUTABLE_PATH=$chromePath
; Get your Gemini API key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
; Selected Gemini model (gemini-1.5-flash, gemini-2.0-flash-exp, gemini-1.5-pro, gemini-pro)
GEMINI_MODEL=gemini-1.5-flash
; Programming language for solutions (java, python, cpp, c, javascript, typescript, go, rust)
PROGRAMMING_LANGUAGE=java
; Performance settings
VERBOSE_LOGGING=true
AUTO_RETRY=true
SKIP_SOLVED=true
SKIP_PREMIUM=true
ENABLE_OPTIMIZATIONS=true
ENABLE_FALLBACK=true
"@

    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success ".env file created with default settings"
}

Write-Header "STEP 6: CREATING DIRECTORY STRUCTURE"

$directories = @("UserData", "problems", "java", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Success "Created $dir directory"
    } else {
        Write-Step "$dir directory already exists"
    }
}

Write-Header "STEP 7: ADDITIONAL TOOLS SETUP (OPTIONAL)"

# Check for Git
if (Test-Command "git") {
    $gitVersion = git --version
    Write-Success "Git is available: $gitVersion"
} else {
    Write-Step "Git not found. Consider installing Git for easier updates:"
    Write-Step "Download from: https://git-scm.com/download/windows"
    
    if ((Test-Command "choco") -and -not $SkipConfirmation) {
        $installGit = Read-Host "Install Git via Chocolatey? (y/N)"
        if ($installGit -eq 'y' -or $installGit -eq 'Y') {
            choco install git -y
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Git installed via Chocolatey"
            }
        }
    }
}

# Check for VS Code
if (Test-Command "code") {
    Write-Success "Visual Studio Code is available"
} else {
    Write-Step "VS Code not found. Consider installing for easier code editing:"
    Write-Step "Download from: https://code.visualstudio.com/"
    
    if ((Test-Command "choco") -and -not $SkipConfirmation) {
        $installVSCode = Read-Host "Install VS Code via Chocolatey? (y/N)"
        if ($installVSCode -eq 'y' -or $installVSCode -eq 'Y') {
            choco install vscode -y
            if ($LASTEXITCODE -eq 0) {
                Write-Success "VS Code installed via Chocolatey"
            }
        }
    }
}

Write-Header "STEP 8: INSTALLATION VERIFICATION"

Write-Step "Running installation verification tests..."

# Test Node.js runtime
try {
    $null = node -e "console.log('Node.js working')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Node.js runtime working"
    } else {
        Write-Warning "Node.js runtime test failed"
    }
} catch {
    Write-Warning "Node.js runtime test failed"
}

# Test critical imports
$testImports = @(
    @{Name="Puppeteer"; Import="puppeteer"},
    @{Name="Google Generative AI"; Import="@google/generative-ai"},
    @{Name="Electron"; Import="electron"}
)

foreach ($test in $testImports) {
    try {
        $testScript = "import('$($test.Import)').then(() => console.log('$($test.Name) import OK')).catch(e => {console.error('Import failed:', e.message); process.exit(1)})"
        $null = node -e $testScript 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$($test.Name) can be imported"
        } else {
            Write-Warning "$($test.Name) import test failed"
        }
    } catch {
        Write-Warning "$($test.Name) import test failed"
    }
}

# Test essential files
$essentialFiles = @("main.js", "package.json", ".env")
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Success "$file exists"
    } else {
        Write-Warning "$file is missing"
    }
}

Write-Header "INSTALLATION COMPLETE!"

Write-Host ""
Write-Success "LeetCoder Bot has been installed successfully!"
Write-Host ""

Write-Header "NEXT STEPS - IMPORTANT CONFIGURATION REQUIRED"

Write-Host "1. CONFIGURE YOUR API KEY:" -ForegroundColor Yellow
Write-Host "   • Edit the .env file in this directory"
Write-Host "   • Get your Gemini API key from: https://makersuite.google.com/app/apikey"
Write-Host "   • Replace 'your_gemini_api_key_here' with your actual API key"
Write-Host ""
Write-Host "2. UPDATE EMAIL ADDRESS:" -ForegroundColor Yellow
Write-Host "   • Replace 'your-email@gmail.com' with your actual email"
Write-Host "   • This is used for Chrome profile management"
Write-Host ""
Write-Host "3. VERIFY CHROME PATH:" -ForegroundColor Yellow
if ($chromeFound) {
    Write-Host "   • Chrome path auto-detected: $chromePath"
    Write-Host "   • Verify this path is correct in the .env file"
} else {
    Write-Host "   • Update GOOGLE_CHROME_EXECUTABLE_PATH in .env with correct Chrome path"
    Write-Host "   • Find your Chrome path by typing chrome://version/ in Chrome address bar"
}
Write-Host ""
Write-Host "4. CHOOSE PROGRAMMING LANGUAGE:" -ForegroundColor Yellow
Write-Host "   • Set PROGRAMMING_LANGUAGE in .env file"
Write-Host "   • Supported: java, python, cpp, javascript, etc."
Write-Host ""

Write-Header "RUNNING THE APPLICATION"

Write-Host "To start the GUI application:" -ForegroundColor Green
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "To run from command line:" -ForegroundColor Green
Write-Host "   npm run cli" -ForegroundColor White
Write-Host ""
Write-Host "To run in development mode:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""

Write-Header "TROUBLESHOOTING"

Write-Host "If you encounter issues:" -ForegroundColor Yellow
Write-Host "1. Make sure your .env file is properly configured"
Write-Host "2. Ensure your Gemini API key is valid and has quota remaining"
Write-Host "3. Verify Chrome is installed and the path is correct"
Write-Host "4. Check that your internet connection is working"
Write-Host "5. Try running: npm install --force"
Write-Host ""
Write-Host "For support, check the project documentation or GitHub issues."
Write-Host ""

if (-not $SkipConfirmation) {
    $startNow = Read-Host "Would you like to start the application now? (y/N)"
    if ($startNow -eq 'y' -or $startNow -eq 'Y') {
        Write-Host ""
        Write-Step "Launching LeetCoder Bot..."
        Write-Warning "Remember to configure your .env file with valid API key!"
        Write-Host ""
        npm start
    } else {
        Write-Host ""
        Write-Step "Installation complete! Run 'npm start' when you're ready."
    }
} else {
    Write-Step "Installation complete! Configure .env file and run 'npm start'"
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
