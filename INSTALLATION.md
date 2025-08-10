# LeetCoder Bot Installation Guide

## Quick Start

Choose one of the installation methods below:

### Method 1: Automatic Installation (Recommended)

#### Windows Batch Script
```bash
# Right-click and "Run as Administrator" (recommended)
install.bat
```

#### PowerShell Script (Advanced features)
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install.ps1

# For silent installation:
.\install.ps1 -SkipConfirmation

# For verbose output:
.\install.ps1 -Verbose
```

### Method 2: Manual Installation

If automatic installation fails, follow these manual steps:

## Prerequisites

### 1. Node.js and npm
- **Download**: https://nodejs.org/
- **Recommended**: LTS version (18.x or higher)
- **Verify installation**:
  ```bash
  node --version
  npm --version
  ```

### 2. Google Chrome Browser
- **Download**: https://www.google.com/chrome/
- **Required for**: Web automation and problem solving
- **Find Chrome path**: Type `chrome://version/` in Chrome address bar

### 3. Gemini API Key
- **Get API Key**: https://makersuite.google.com/app/apikey
- **Required for**: AI-powered code generation
- **Free tier available** with generous quotas

## Manual Installation Steps

### Step 1: Install Dependencies
```bash
# Clear npm cache (if needed)
npm cache clean --force

# Install all dependencies
npm install

# If the above fails, try:
npm install --legacy-peer-deps
# or
npm install --force
```

### Step 2: Configure Environment
1. Copy `.env.example` to `.env` (if exists) or create new `.env` file:
```bash
# Windows
copy .env.example .env

# Or create manually with the content below
```

2. Edit `.env` file with your settings:
```properties
# Your email for Chrome profile
USER_EMAIL=your-email@gmail.com

# Chrome executable path (find via chrome://version/)
GOOGLE_CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Your Gemini API key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_api_key_here

# Preferred Gemini model
GEMINI_MODEL=gemini-1.5-flash

# Programming language (java, python, cpp, javascript, etc.)
PROGRAMMING_LANGUAGE=java

# Performance settings
VERBOSE_LOGGING=true
AUTO_RETRY=true
SKIP_SOLVED=true
SKIP_PREMIUM=true
ENABLE_OPTIMIZATIONS=true
ENABLE_FALLBACK=true
```

### Step 3: Verify Installation
```bash
# Test Node.js modules
node -e "console.log('Node.js working!')"

# Test critical imports
node -e "import('puppeteer').then(() => console.log('Puppeteer OK'))"
node -e "import('@google/generative-ai').then(() => console.log('Gemini AI OK'))"
node -e "import('electron').then(() => console.log('Electron OK'))"
```

## Running the Application

### GUI Mode (Recommended)
```bash
npm start
```

### Command Line Mode
```bash
npm run cli
```

### Development Mode
```bash
npm run dev
```

## Dependencies Breakdown

### Core Dependencies
- **electron** (^37.2.6): Desktop application framework
- **puppeteer** (^24.16.0): Browser automation for LeetCode interaction
- **@google/generative-ai** (^0.24.1): Google Gemini API client
- **dotenv** (^16.4.5): Environment variable management
- **clipboardy** (^3.0.0): Clipboard operations
- **chalk** (^5.3.0): Terminal text styling
- **inquirer** (^12.9.1): Interactive command line prompts

### Build Dependencies
- **electron-builder** (^26.0.12): Application packaging and distribution

## Supported Programming Languages

The bot can generate solutions in multiple languages:
- **Java** (default)
- **Python**
- **C++**
- **JavaScript**
- **TypeScript**
- **Go**
- **Rust**
- **C**

Set your preferred language in the `.env` file:
```properties
PROGRAMMING_LANGUAGE=python  # or java, cpp, javascript, etc.
```

## Gemini AI Models

Available models (configure in `.env`):
- **gemini-1.5-flash** (recommended): Fast, efficient, good balance
- **gemini-1.5-pro**: More capable, slower, higher quota usage
- **gemini-2.0-flash-exp**: Experimental, latest features
- **gemini-pro**: Legacy model (may be deprecated)

## Troubleshooting

### Common Issues

#### 1. "Node.js not found"
```bash
# Install Node.js from https://nodejs.org/
# Restart terminal after installation
# Verify: node --version
```

#### 2. "npm install fails"
```bash
# Clear cache and try again
npm cache clean --force
npm install --legacy-peer-deps

# If still fails:
npm install --force
```

#### 3. "Chrome not found" or automation fails
```bash
# Install Chrome: https://www.google.com/chrome/
# Update GOOGLE_CHROME_EXECUTABLE_PATH in .env
# Find correct path via chrome://version/
```

#### 4. "Gemini API errors"
- Verify API key is correct in `.env`
- Check API quota at https://makersuite.google.com/
- Try different model (gemini-1.5-flash recommended)
- Ensure internet connection is stable

#### 5. "Permission denied" errors
```bash
# Run as Administrator on Windows
# Check file permissions
# Try: npm config set registry https://registry.npmjs.org/
```

#### 6. "Module import errors"
```bash
# Verify package.json has "type": "module"
# Check Node.js version (18+ required)
# Reinstall dependencies: rm -rf node_modules && npm install
```

#### 7. "Electron fails to start"
```bash
# Update Electron: npm install electron@latest
# Clear electron cache: npm cache clean --force
# Try: npx electron-rebuild
```

### Advanced Troubleshooting

#### Clear All Caches
```bash
npm cache clean --force
npx electron-rebuild
rm -rf node_modules
npm install
```

#### Verbose Logging
```bash
# Enable in .env
VERBOSE_LOGGING=true

# Or run with debug flags
DEBUG=* npm start
```

#### Package Manager Issues
```bash
# Switch to Yarn if npm fails
npm install -g yarn
yarn install
yarn start

# Or use pnpm
npm install -g pnpm
pnpm install
pnpm start
```

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 10.12+, or Linux
- **Node.js**: 18.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for dependencies
- **Internet**: Required for API calls and package installation

### Recommended System
- **OS**: Windows 11 or latest macOS/Linux
- **Node.js**: Latest LTS version
- **RAM**: 8GB or more
- **Storage**: SSD with 5GB+ free space
- **Internet**: Stable broadband connection

## Security Notes

- **API Keys**: Never commit `.env` file to version control
- **Chrome Profile**: Isolated profile created in `UserData/` directory
- **Permissions**: Script may request admin privileges for installations
- **Network**: Application makes requests to LeetCode and Google APIs

## Getting Help

1. **Check this README** for common solutions
2. **Review logs** in console/terminal output
3. **Verify configuration** in `.env` file
4. **Update dependencies**: `npm update`
5. **Reinstall if needed**: Delete `node_modules` and run install script

## License and Usage

This tool is for educational purposes. Please:
- Respect LeetCode's terms of service
- Use responsibly and don't overload their servers
- Follow rate limits and quotas
- Credit original authors when sharing solutions

---

**Happy Coding! 🚀**

For additional support, check the project documentation or create an issue in the repository.
