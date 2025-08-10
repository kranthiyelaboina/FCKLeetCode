# LeetCoder Bot - AI-Powered GUI Application

## 🚀 New GUI Interface

The LeetCoder Bot now features a beautiful, user-friendly GUI interface built with Electron. This modern desktop application provides an intuitive way to configure and run your LeetCode solving sessions.

## ✨ Features

### 🎯 Main Interface
- **Problem Count Selection**: Choose how many problems to solve (1-100)
- **Daily Challenge Support**: Option to solve today's daily challenge first
- **Smart Problem Resolution**: AI automatically converts problem numbers to proper URLs
- **Skip Options**: Skip already solved problems and premium problems
- **Real-time Status Updates**: See progress and current solving status

### ⚙️ Settings Panel
- **API Key Management**: Securely configure your Gemini API key with show/hide toggle
- **Model Selection**: Choose between different Gemini models:
  - `gemini-1.5-flash` (Recommended - Fast and efficient)
  - `gemini-2.0-flash-exp` (Latest experimental features)
  - `gemini-1.5-pro` (Most accurate solutions)
  - `gemini-pro` (Legacy stable model)
- **Browser Configuration**: Set Chrome executable path and user email
- **Performance Settings**: Configure logging and retry options

### 🤖 AI-Powered Features
- **Intelligent Problem Name Resolution**: Enter a problem number, and AI will fetch the exact problem name and convert it to the proper LeetCode URL format
- **Optimal Solution Generation**: AI generates the most efficient Java solutions with best time/space complexity
- **Smart Error Handling**: Automatic model switching and intelligent fallbacks

## 🔧 How to Use

### Starting the GUI Application
```bash
npm start
```

### First-Time Setup
1. **Launch the application** - A beautiful GUI window will appear
2. **Open Settings** - Click the "Settings" button
3. **Configure API Key** - Add your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **Select Model** - Choose your preferred Gemini model
5. **Save Settings** - Click "Save Settings"

### Solving Problems
1. **Set Problem Count** - Choose how many problems to solve
2. **Daily Challenge** (Optional):
   - Check "Solve Today's Daily Challenge First"
   - Enter the problem number (e.g., 1 for Two Sum)
   - Click "Get Problem Name" to verify the problem
3. **Configure Options**:
   - Skip Already Solved Problems (recommended)
   - Skip Premium Problems (recommended)
4. **Start Solving** - Click the "Start Solving" button

### Daily Challenge Workflow
When you enable daily challenge:
1. Enter the LeetCode problem number
2. AI fetches the exact problem name (e.g., "Two Sum" for problem #1)
3. Converts to proper URL format (e.g., "two-sum")
4. Navigates to `https://leetcode.com/problems/two-sum`
5. AI generates and submits the optimal solution
6. Continues with random problems

## 🎨 GUI Interface

The GUI features a modern, gradient design with:
- **Responsive Cards**: Organized sections for different functionalities
- **Interactive Elements**: Hover effects and smooth animations
- **Progress Indicators**: Real-time status updates and loading spinners
- **Form Validation**: Smart input validation with visual feedback
- **Modal Dialogs**: Confirmation dialogs and error messages
- **Professional Styling**: Beautiful gradients, shadows, and typography

## 🔑 Configuration Options

### Gemini Models
- **gemini-1.5-flash**: 15 RPM, 1,500 RPD - Best for speed
- **gemini-2.0-flash-exp**: 10 RPM, 50 RPD - Latest features
- **gemini-1.5-pro**: 2 RPM, 50 RPD - Most accurate
- **gemini-pro**: 60 RPM, 1,500 RPD - Legacy stable

### Settings File
All settings are saved to `.env` file:
```
USER_EMAIL=your.email@example.com
GOOGLE_CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## 📱 Screenshots

The GUI includes:
- Clean, modern interface with gradient backgrounds
- Intuitive form controls with validation
- Real-time problem name resolution
- Progress tracking and status updates
- Professional settings panel
- Responsive design elements

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```
This opens DevTools for debugging.

### Building for Production
```bash
npm run build
```

### CLI Mode (Still Available)
```bash
npm run cli
```
The original command-line interface is still available.

## 🎯 Developer Credits
- **Developed by**: Kranthi Yelaboina
- **GitHub**: [github.com/kranthiyelaboina](https://github.com/kranthiyelaboina)
- **AI Integration**: Google Gemini API
- **Framework**: Electron with modern web technologies

## 🔗 Links
- **Get Gemini API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **LeetCode**: [leetcode.com](https://leetcode.com)
- **GitHub Repository**: [github.com/kranthiyelaboina](https://github.com/kranthiyelaboina)

---

*Experience the power of AI-driven LeetCode solving with our beautiful, user-friendly interface!* 🚀
