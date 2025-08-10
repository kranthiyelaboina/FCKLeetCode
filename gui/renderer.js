const { ipcRenderer } = require('electron');

// DOM Elements - Updated for new Bootstrap UI structure
const problemCountInput = document.getElementById('problemCount');
const dailyChallengeCheckbox = document.getElementById('dailyChallenge');
const dailyChallengeSection = document.getElementById('dailyChallengeSection');
const dailyProblemNumberInput = document.getElementById('dailyProblemNumber');
const getProblemNameBtn = document.getElementById('getProblemName');
const problemNameDisplay = document.getElementById('problemNameDisplay');
const problemNameText = document.getElementById('problemNameText');
const skipSolvedCheckbox = document.getElementById('skipSolved');
const skipPremiumCheckbox = document.getElementById('skipPremium');
const startSolvingBtn = document.getElementById('startSolving');
const stopSolvingBtn = document.getElementById('stopSolving');
const refreshConfigBtn = document.getElementById('refreshConfigBtn');
const statusCard = document.getElementById('statusCard');
const statusMessage = document.getElementById('statusMessage');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const currentModelSpan = document.getElementById('currentModel');
const currentLanguageSpan = document.getElementById('currentLanguage');
const aiStatus = document.getElementById('aiStatus');
const solvedCountSpan = document.getElementById('solvedCount');
const errorCountSpan = document.getElementById('errorCount');

// State
let currentConfig = {};
let isProcessing = false;
let sessionStats = { solved: 0, errors: 0 };

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfiguration();
    setupEventListeners();
    updateConfigDisplay();
    initializeToasts();
});

// Initialize Bootstrap toasts
function initializeToasts() {
    // Initialize toast elements
    window.successToast = new bootstrap.Toast(document.getElementById('successToast'));
    window.errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
}

// Load configuration from .env file
async function loadConfiguration() {
    try {
        currentConfig = await ipcRenderer.invoke('get-env-config');
        console.log('Loaded configuration:', currentConfig);
    } catch (error) {
        console.error('Error loading configuration:', error);
        showToast('Could not load configuration. Please check settings.', 'error');
    }
}

// Update configuration display
function updateConfigDisplay() {
    if (currentConfig.GEMINI_MODEL) {
        currentModelSpan.textContent = currentConfig.GEMINI_MODEL;
    }
    if (currentConfig.PROGRAMMING_LANGUAGE) {
        currentLanguageSpan.textContent = currentConfig.PROGRAMMING_LANGUAGE.toUpperCase();
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    if (type === 'success') {
        document.getElementById('successMessage').textContent = message;
        window.successToast.show();
    } else if (type === 'error') {
        document.getElementById('errorMessage').textContent = message;
        window.errorToast.show();
    }
}

// Update session stats
function updateSessionStats(solved = 0, errors = 0) {
    sessionStats.solved += solved;
    sessionStats.errors += errors;
    
    solvedCountSpan.textContent = sessionStats.solved;
    errorCountSpan.textContent = sessionStats.errors;
    
    // Animate the numbers
    if (solved > 0) {
        solvedCountSpan.parentElement.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            solvedCountSpan.parentElement.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
    }
    
    if (errors > 0) {
        errorCountSpan.parentElement.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            errorCountSpan.parentElement.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Daily challenge toggle with smooth animation
    dailyChallengeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            dailyChallengeSection.style.display = 'block';
            dailyChallengeSection.classList.add('show');
        } else {
            dailyChallengeSection.classList.remove('show');
            setTimeout(() => {
                dailyChallengeSection.style.display = 'none';
            }, 300);
        }
    });

    // Get problem name functionality
    getProblemNameBtn.addEventListener('click', async () => {
        const problemNumber = dailyProblemNumberInput.value;
        if (!problemNumber) {
            showToast('Please enter a problem number', 'error');
            return;
        }

        getProblemNameBtn.disabled = true;
        getProblemNameBtn.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Loading...';

        try {
            const problemName = await ipcRenderer.invoke('get-problem-name', parseInt(problemNumber));
            if (problemName) {
                problemNameText.textContent = `Problem ${problemNumber}: ${problemName}`;
                problemNameDisplay.style.display = 'block';
                showToast('Problem name retrieved successfully', 'success');
            } else {
                showToast('Could not find problem name', 'error');
            }
        } catch (error) {
            console.error('Error getting problem name:', error);
            showToast('Error retrieving problem name', 'error');
        } finally {
            getProblemNameBtn.disabled = false;
            getProblemNameBtn.innerHTML = '<i class="bi bi-search"></i> Get Problem Name';
        }
    });

    // Refresh configuration
    refreshConfigBtn.addEventListener('click', async () => {
        refreshConfigBtn.disabled = true;
        refreshConfigBtn.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Refreshing...';
        
        await loadConfiguration();
        updateConfigDisplay();
        showToast('Configuration refreshed successfully', 'success');
        
        setTimeout(() => {
            refreshConfigBtn.disabled = false;
            refreshConfigBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        }, 1000);
    });

    // Start solving button
    startSolvingBtn.addEventListener('click', startSolving);

    // Stop solving button
    stopSolvingBtn.addEventListener('click', () => {
        if (isProcessing) {
            isProcessing = false;
            showProcessingUI(false);
            showToast('Session stopped by user', 'error');
        }
    });

    // Problem count validation
    problemCountInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 1) {
            e.target.value = 1;
        } else if (value > 100) {
            e.target.value = 100;
        }
    });
    
    // Daily problem number validation
    dailyProblemNumberInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 1) {
            e.target.value = 1;
        } else if (value > 3000) {
            e.target.value = 3000;
        }
    });
}
        if (e.target.checked) {
            section.classList.remove('hidden');
            section.style.animation = 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        } else {
            section.style.animation = 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                section.classList.add('hidden');
            }, 300);
        }
        clearProblemNameDisplay();
    });

    // Fetch problem name
    getProblemNameBtn.addEventListener('click', async () => {
        await fetchProblemName();
    });

    // Start solving
    startSolvingBtn.addEventListener('click', async () => {
        await startSolving();
    });

    // Stop solving
    if (stopSolvingBtn) {
        stopSolvingBtn.addEventListener('click', async () => {
            await stopSolving();
        });
    }

    // Input validation with smooth feedback
    problemCountInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 1) e.target.value = 1;
        if (value > 100) e.target.value = 100;
        
        // Visual feedback
        e.target.style.borderColor = '#2563eb';
        setTimeout(() => {
            e.target.style.borderColor = '#d1d5db';
        }, 300);
    });

    dailyProblemNumberInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 1) e.target.value = 1;
        if (value > 3000) e.target.value = 3000;
        clearProblemNameDisplay();
        
        // Visual feedback
        e.target.style.borderColor = '#2563eb';
        setTimeout(() => {
            e.target.style.borderColor = '#d1d5db';
        }, 300);
    });
}

// Clear problem name display
function clearProblemNameDisplay() {
    problemNameDisplay.innerHTML = '';
    problemNameDisplay.classList.add('hidden');
}

// Fetch problem name from problem number
async function fetchProblemName() {
    const problemNumber = dailyProblemNumberInput.value;
    
    if (!problemNumber || problemNumber < 1) {
        showProblemNameError('Please enter a valid problem number');
        return;
    }

    if (!currentConfig.GEMINI_API_KEY) {
        showProblemNameError('Gemini API key not configured. Please set it in Settings.');
        return;
    }

    // Show loading state with animation
    setButtonLoading(getProblemNameBtn, 'Getting Name...');
    
    try {
        const result = await ipcRenderer.invoke('get-problem-name', problemNumber);
        
        if (result.success) {
            showProblemNameSuccess(`Problem ${problemNumber}: ${result.problemName}`);
        } else {
            showProblemNameError(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error fetching problem name:', error);
        showProblemNameError('Failed to fetch problem name. Please check your connection.');
    } finally {
        resetButton(getProblemNameBtn, 'Get Problem Name');
    }
}

// Show problem name success with animation
function showProblemNameSuccess(message) {
    problemNameDisplay.classList.remove('hidden');
    problemNameDisplay.innerHTML = `✓ ${message}`;
    problemNameDisplay.className = 'problem-display';
    problemNameDisplay.style.animation = 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}

// Show problem name error with animation
function showProblemNameError(message) {
    problemNameDisplay.classList.remove('hidden');
    problemNameDisplay.innerHTML = `✗ ${message}`;
    problemNameDisplay.style.background = '#fef2f2';
    problemNameDisplay.style.color = '#dc2626';
    problemNameDisplay.style.borderColor = '#fecaca';
    problemNameDisplay.className = 'problem-display';
    problemNameDisplay.style.animation = 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}

// Start solving problems
async function startSolving() {
    if (isProcessing) return;

    // Validation
    if (!currentConfig.GEMINI_API_KEY) {
        showNotification('Gemini API key is not configured. Please set it in Settings.', 'error');
        return;
    }

    const problemCount = parseInt(problemCountInput.value);
    if (!problemCount || problemCount < 1) {
        showNotification('Please enter a valid number of problems to solve (1-100).', 'error');
        return;
    }

    const solveDailyChallenge = dailyChallengeCheckbox.checked;
    let dailyChallengeNumber = null;

    if (solveDailyChallenge) {
        dailyChallengeNumber = parseInt(dailyProblemNumberInput.value);
        if (!dailyChallengeNumber || dailyChallengeNumber < 1) {
            showNotification('Please enter a valid daily challenge problem number.', 'error');
            return;
        }
    }

    // Prepare configuration
    const solvingConfig = {
        problemCount,
        solveDailyChallenge,
        dailyChallengeNumber,
        skipSolved: skipSolvedCheckbox.checked,
        skipPremium: skipPremiumCheckbox.checked,
        geminiModel: currentConfig.GEMINI_MODEL || 'gemini-1.5-flash',
        programmingLanguage: currentConfig.PROGRAMMING_LANGUAGE || 'java'
    };

    // Start processing
    isProcessing = true;
    showProcessingUI(true);
    showStatus('Initializing AI-powered solving session...');

    try {
        const result = await ipcRenderer.invoke('start-solving', solvingConfig);
        
        if (result.success) {
            showStatus('Session completed successfully');
            showNotification('Problem solving completed successfully!', 'success');
        } else {
            let errorMessage = result.error || 'Unknown error occurred';
            
            // Handle specific error types with user-friendly messages
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                errorMessage = 'API quota exceeded. Please wait or try a different model in Settings.';
            } else if (errorMessage.includes('submit button')) {
                errorMessage = 'LeetCode interface changed. Submit button not found. Please try again later.';
            } else if (errorMessage.includes('API key')) {
                errorMessage = 'Invalid API key. Please check your settings.';
            }
            
            showStatus(`Session failed: ${errorMessage}`);
            showNotification(`Error: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Error starting solver:', error);
        let errorMessage = error.message || 'Unexpected error occurred';
        
        // Handle network and API issues
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            errorMessage = 'Network connection issue. Please check your internet connection.';
        }
        
        showStatus(`Unexpected error: ${errorMessage}`);
        showNotification(`Unexpected error: ${errorMessage}`, 'error');
    } finally {
        setTimeout(() => {
            showProcessingUI(false);
            hideStatus();
        }, 3000); // Increased display time for error messages
    }
}

// Stop solving
async function stopSolving() {
    if (!isProcessing) return;
    
    try {
        await ipcRenderer.invoke('stop-solving');
        showNotification('Solving session stopped', 'warning');
        showProcessingUI(false);
        hideStatus();
    } catch (error) {
        console.error('Error stopping solver:', error);
    }
}

// Show processing UI
function showProcessingUI(processing) {
    isProcessing = processing;
    
    if (processing) {
        setButtonLoading(startSolvingBtn, 'Processing...');
        startSolvingBtn.classList.add('hidden');
        if (stopSolvingBtn) stopSolvingBtn.classList.remove('hidden');
        
        // Disable inputs
        problemCountInput.disabled = true;
        dailyChallengeCheckbox.disabled = true;
        dailyProblemNumberInput.disabled = true;
        skipSolvedCheckbox.disabled = true;
        skipPremiumCheckbox.disabled = true;
    } else {
        resetButton(startSolvingBtn, '▶', 'Start Solving');
        startSolvingBtn.classList.remove('hidden');
        if (stopSolvingBtn) stopSolvingBtn.classList.add('hidden');
        
        // Enable inputs
        problemCountInput.disabled = false;
        dailyChallengeCheckbox.disabled = false;
        dailyProblemNumberInput.disabled = false;
        skipSolvedCheckbox.disabled = false;
        skipPremiumCheckbox.disabled = false;
    }
}

// Set button to loading state
function setButtonLoading(button, text) {
    button.disabled = true;
    button.innerHTML = `<div class="spinner"></div> ${text}`;
}

// Reset button to normal state
function resetButton(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

// Show status with animation
function showStatus(message) {
    statusMessage.textContent = message;
    statusCard.classList.remove('hidden');
    statusCard.style.animation = 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}

// Hide status
function hideStatus() {
    statusCard.style.animation = 'fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
        statusCard.classList.add('hidden');
    }, 300);
}

// Show notification (professional toast-style)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        min-width: 300px;
        transform: translateX(100%);
        transition: all 0.3s ease;
        border-left: 4px solid ${getNotificationColor(type)};
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return '✓';
        case 'error': return '✗';
        case 'warning': return '⚠';
        default: return 'ℹ';
    }
}

// Get notification color
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#16a34a';
        case 'error': return '#dc2626';
        case 'warning': return '#d97706';
        default: return '#2563eb';
    }
}

// Add additional CSS for animations
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideUp {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
    }
    
    .card {
        animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-icon {
        font-weight: bold;
        font-size: 16px;
    }
    
    .notification-message {
        color: #374151;
        font-weight: 500;
        font-size: 14px;
    }
    
    .form-input:focus, .form-select:focus {
        transform: scale(1.02);
        transition: all 0.2s ease;
    }
    
    .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    .btn:active {
        transform: translateY(0);
    }
    
    .checkbox-mark {
        transition: all 0.2s ease;
    }
    
    .checkbox:hover .checkbox-mark {
        transform: scale(1.1);
    }
`;
document.head.appendChild(additionalStyles);
