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

// Settings Modal Elements
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const githubLink = document.getElementById('githubLink');

// Settings Form Elements
const settingsProgrammingLanguage = document.getElementById('settingsProgrammingLanguage');
const settingsApiKey = document.getElementById('settingsApiKey');
const toggleSettingsApiKey = document.getElementById('toggleSettingsApiKey');
const testSettingsApiKey = document.getElementById('testSettingsApiKey');
const apiTestResult = document.getElementById('apiTestResult');
const openGeminiStudioLink = document.getElementById('openGeminiStudioLink');
const settingsSkipSolved = document.getElementById('settingsSkipSolved');
const settingsSkipPremium = document.getElementById('settingsSkipPremium');
const settingsVerboseLogging = document.getElementById('settingsVerboseLogging');
const settingsEnableOptimizations = document.getElementById('settingsEnableOptimizations');
const settingsEnableFallback = document.getElementById('settingsEnableFallback');
const settingsAutoRetry = document.getElementById('settingsAutoRetry');

// State
let currentConfig = {};
let isProcessing = false;
let sessionStats = { solved: 0, errors: 0 };
let isApiKeyVisible = false;
let selectedModel = 'gemini-1.5-flash';
let settingsChanged = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfiguration();
    setupEventListeners();
    setupSettingsModal();
    updateConfigDisplay();
    initializeToasts();
    setupGithubLink();
    setupModelSelection();
});

// Setup GitHub link
function setupGithubLink() {
    if (githubLink) {
        githubLink.addEventListener('click', (e) => {
            e.preventDefault();
            ipcRenderer.invoke('open-external', 'https://github.io/kranthiyelaboina');
        });
    }
}

// Setup settings modal functionality
function setupSettingsModal() {
    // Open settings modal
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            openSettingsModal();
        });
    }

    // Close settings modal
    const closeModalElements = [closeSettingsBtn, settingsBackdrop, cancelSettingsBtn];
    closeModalElements.forEach(element => {
        if (element) {
            element.addEventListener('click', () => {
                closeSettingsModal();
            });
        }
    });

    // Settings tabs
    setupSettingsTabs();

    // Settings form handlers
    setupSettingsFormHandlers();

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !settingsModal.classList.contains('d-none')) {
            closeSettingsModal();
        }
    });
}

// Setup settings tabs
function setupSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            const targetPanel = document.getElementById(`${targetTab}-panel`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// Setup model selection
function setupModelSelection() {
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach(card => {
        card.addEventListener('click', () => {
            modelCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedModel = card.getAttribute('data-model');
            settingsChanged = true;
            updateSettingsStatus('Model selection changed', 'warning');
        });
    });
}

// Setup settings form handlers
function setupSettingsFormHandlers() {
    // Programming language change
    if (settingsProgrammingLanguage) {
        settingsProgrammingLanguage.addEventListener('change', (e) => {
            settingsChanged = true;
            updateSettingsStatus('Programming language changed', 'warning');
            // Update main page immediately
            if (currentLanguageSpan) {
                currentLanguageSpan.textContent = e.target.value.toUpperCase();
            }
        });
    }

    // API key toggle visibility
    if (toggleSettingsApiKey) {
        toggleSettingsApiKey.addEventListener('click', () => {
            isApiKeyVisible = !isApiKeyVisible;
            settingsApiKey.type = isApiKeyVisible ? 'text' : 'password';
            toggleSettingsApiKey.innerHTML = isApiKeyVisible ? 
                '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
        });
    }

    // Test API key
    if (testSettingsApiKey) {
        testSettingsApiKey.addEventListener('click', async () => {
            await testApiKey();
        });
    }

    // Open Gemini Studio
    if (openGeminiStudioLink) {
        openGeminiStudioLink.addEventListener('click', (e) => {
            e.preventDefault();
            ipcRenderer.invoke('open-external', 'https://aistudio.google.com/app/apikey');
        });
    }

    // Save settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            await saveAllSettings();
        });
    }

    // Auto-save on input changes
    const autoSaveElements = [
        settingsApiKey,
        settingsSkipSolved,
        settingsSkipPremium,
        settingsVerboseLogging,
        settingsEnableOptimizations,
        settingsEnableFallback,
        settingsAutoRetry
    ];

    autoSaveElements.forEach(element => {
        if (element) {
            const eventType = element.type === 'checkbox' ? 'change' : 'input';
            element.addEventListener(eventType, () => {
                settingsChanged = true;
                updateSettingsStatus('Settings changed', 'warning');
                
                // Auto-save after 2 seconds of inactivity
                clearTimeout(window.autoSaveTimeout);
                window.autoSaveTimeout = setTimeout(async () => {
                    if (settingsChanged) {
                        await saveAllSettings();
                    }
                }, 2000);
            });
        }
    });
}

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
    } else {
        currentModelSpan.textContent = 'Not configured';
    }
    
    if (currentConfig.PROGRAMMING_LANGUAGE) {
        currentLanguageSpan.textContent = currentConfig.PROGRAMMING_LANGUAGE.toUpperCase();
    } else {
        currentLanguageSpan.textContent = 'Not configured';
    }
    
    // Update AI status based on configuration
    const statusDot = aiStatus.querySelector('.status-dot');
    const statusText = aiStatus.querySelector('span');
    
    if (currentConfig.GEMINI_API_KEY) {
        statusDot.className = 'status-dot bg-success me-2';
        statusText.textContent = 'Ready';
        statusText.className = 'text-success fw-semibold';
    } else {
        statusDot.className = 'status-dot bg-warning me-2';
        statusText.textContent = 'API Key Missing';
        statusText.className = 'text-warning fw-semibold';
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
            setTimeout(() => {
                dailyChallengeSection.classList.add('show');
            }, 10);
        } else {
            dailyChallengeSection.classList.remove('show');
            setTimeout(() => {
                dailyChallengeSection.style.display = 'none';
            }, 300);
            // Clear problem name display when unchecked
            problemNameDisplay.style.display = 'none';
            problemNameText.textContent = '';
        }
    });

    // Get problem name functionality
    getProblemNameBtn.addEventListener('click', async () => {
        const problemNumber = dailyProblemNumberInput.value;
        if (!problemNumber || problemNumber < 1) {
            showToast('Please enter a valid problem number', 'error');
            dailyProblemNumberInput.focus();
            return;
        }

        if (!currentConfig.GEMINI_API_KEY) {
            showToast('API key not configured. Please check settings.', 'error');
            return;
        }

        getProblemNameBtn.disabled = true;
        getProblemNameBtn.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Loading...';

        try {
            const result = await ipcRenderer.invoke('get-problem-name', parseInt(problemNumber));
            if (result.success && result.problemName) {
                problemNameText.textContent = `Problem ${problemNumber}: ${result.problemName}`;
                problemNameDisplay.style.display = 'block';
                problemNameDisplay.className = 'mt-3';
                showToast('Problem name retrieved successfully', 'success');
            } else {
                const errorMsg = result.error || 'Could not find problem name';
                showToast(errorMsg, 'error');
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
        
        try {
            await loadConfiguration();
            updateConfigDisplay();
            showToast('Configuration refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing configuration:', error);
            showToast('Failed to refresh configuration', 'error');
        } finally {
            setTimeout(() => {
                refreshConfigBtn.disabled = false;
                refreshConfigBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
            }, 1000);
        }
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
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
            e.target.value = 1;
        } else if (value > 100) {
            e.target.value = 100;
        }
    });
    
    // Daily problem number validation
    dailyProblemNumberInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
            e.target.value = '';
        } else if (value > 3000) {
            e.target.value = 3000;
        }
        // Clear problem name when number changes
        problemNameDisplay.style.display = 'none';
        problemNameText.textContent = '';
    });

    // Clear log button
    const clearLogBtn = document.getElementById('clearLogBtn');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const liveActivityLog = document.getElementById('liveActivityLog');
            if (liveActivityLog) {
                liveActivityLog.innerHTML = '';
            }
        });
    }
}

// Start solving problems
async function startSolving() {
    if (isProcessing) return;

    // Validation
    if (!currentConfig.GEMINI_API_KEY) {
        showToast('Gemini API key is not configured. Please set it in Settings.', 'error');
        return;
    }

    const problemCount = parseInt(problemCountInput.value);
    if (!problemCount || problemCount < 1) {
        showToast('Please enter a valid number of problems to solve (1-100).', 'error');
        problemCountInput.focus();
        return;
    }

    const solveDailyChallenge = dailyChallengeCheckbox.checked;
    let dailyChallengeNumber = null;

    if (solveDailyChallenge) {
        dailyChallengeNumber = parseInt(dailyProblemNumberInput.value);
        if (!dailyChallengeNumber || dailyChallengeNumber < 1) {
            showToast('Please enter a valid daily challenge problem number.', 'error');
            dailyProblemNumberInput.focus();
            return;
        }
    }

    // Prepare configuration
    const solvingConfig = {
        problemCount,
        solveDailyChallenge,
        dailyChallengeNumber,
        skipSolved: currentConfig.SKIP_SOLVED !== 'false',
        skipPremium: currentConfig.SKIP_PREMIUM !== 'false',
        geminiModel: currentConfig.GEMINI_MODEL || 'gemini-1.5-flash',
        programmingLanguage: currentConfig.PROGRAMMING_LANGUAGE || 'java',
        geminiApiKey: currentConfig.GEMINI_API_KEY,
        verboseLogging: currentConfig.VERBOSE_LOGGING === 'true',
        autoRetry: currentConfig.AUTO_RETRY !== 'false',
        enableOptimizations: currentConfig.ENABLE_OPTIMIZATIONS !== 'false',
        enableFallback: currentConfig.ENABLE_FALLBACK !== 'false'
    };

    // Start processing
    isProcessing = true;
    showProcessingUI(true);
    showStatus('Initializing AI-powered solving session...');
    updateProgress(0, 'Preparing to solve problems...');

    try {
        const result = await ipcRenderer.invoke('start-solving', solvingConfig);
        
        if (result.success) {
            updateProgress(100, 'Session completed successfully!');
            showStatus('Session completed successfully');
            showToast('Problem solving completed successfully!', 'success');
            updateSessionStats(problemCount, 0);
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
            showToast(`Error: ${errorMessage}`, 'error');
            updateSessionStats(0, 1);
        }
    } catch (error) {
        console.error('Error starting solver:', error);
        let errorMessage = error.message || 'Unexpected error occurred';
        
        // Handle network and API issues
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            errorMessage = 'Network connection issue. Please check your internet connection.';
        }
        
        showStatus(`Unexpected error: ${errorMessage}`);
        showToast(`Unexpected error: ${errorMessage}`, 'error');
        updateSessionStats(0, 1);
    } finally {
        setTimeout(() => {
            showProcessingUI(false);
            hideStatus();
        }, 3000);
    }
}

// Show processing UI
function showProcessingUI(processing) {
    isProcessing = processing;
    
    const liveActivitySection = document.getElementById('liveActivitySection');
    
    if (processing) {
        startSolvingBtn.classList.add('d-none');
        stopSolvingBtn.classList.remove('d-none');
        progressSection.classList.remove('d-none');
        
        // Show live activity log
        if (liveActivitySection) {
            liveActivitySection.style.display = 'block';
        }
        
        // Disable inputs
        problemCountInput.disabled = true;
        dailyChallengeCheckbox.disabled = true;
        dailyProblemNumberInput.disabled = true;
        skipSolvedCheckbox.disabled = true;
        skipPremiumCheckbox.disabled = true;
        refreshConfigBtn.disabled = true;
    } else {
        startSolvingBtn.classList.remove('d-none');
        stopSolvingBtn.classList.add('d-none');
        progressSection.classList.add('d-none');
        
        // Keep live activity log visible for review
        // User can manually clear it if needed
        
        // Enable inputs
        problemCountInput.disabled = false;
        dailyChallengeCheckbox.disabled = false;
        dailyProblemNumberInput.disabled = false;
        skipSolvedCheckbox.disabled = false;
        skipPremiumCheckbox.disabled = false;
        refreshConfigBtn.disabled = false;
    }
}

// Update progress bar
function updateProgress(percentage, message) {
    progressBar.style.width = percentage + '%';
    progressText.textContent = message;
}

// Show status with animation
function showStatus(message) {
    statusMessage.textContent = message;
    statusCard.classList.remove('d-none');
}

// Hide status
function hideStatus() {
    statusCard.classList.add('d-none');
}

// Listen for backend progress updates (if implemented)
ipcRenderer.on('solving-progress', (event, data) => {
    // Update progress bar
    updateProgress(data.percentage, data.message);
    
    // Update session stats in real-time
    if (data.solved !== undefined) {
        solvedCountSpan.textContent = data.solved;
        if (data.justSolved) {
            solvedCountSpan.parentElement.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                solvedCountSpan.parentElement.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
        }
    }
    
    if (data.failed !== undefined) {
        errorCountSpan.textContent = data.failed;
        if (data.error) {
            errorCountSpan.parentElement.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                errorCountSpan.parentElement.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
        }
    }
    
    // Update current problem being processed
    if (data.current) {
        const currentProblemElement = document.getElementById('currentProblem');
        if (currentProblemElement) {
            currentProblemElement.textContent = data.current;
        }
        
        // Add visual indicators for different states
        const statusIndicator = document.getElementById('statusIndicator');
        if (statusIndicator) {
            if (data.solving) {
                statusIndicator.className = 'status-indicator solving';
                statusIndicator.innerHTML = '<i class="bi bi-gear-fill animate-spin"></i> Solving...';
            } else if (data.justSolved) {
                statusIndicator.className = 'status-indicator solved';
                statusIndicator.innerHTML = '<i class="bi bi-check-circle-fill"></i> Solved!';
            } else if (data.error) {
                statusIndicator.className = 'status-indicator error';
                statusIndicator.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            } else if (data.completed) {
                statusIndicator.className = 'status-indicator completed';
                statusIndicator.innerHTML = '<i class="bi bi-trophy-fill"></i> Completed!';
            } else {
                statusIndicator.className = 'status-indicator processing';
                statusIndicator.innerHTML = '<i class="bi bi-search"></i> Processing...';
            }
        }
    }
    
    // Show toast notifications for important events
    if (data.justSolved) {
        showToast(`Successfully solved: ${data.current}`, 'success');
    } else if (data.error && !data.error.includes('already solved')) {
        showToast(`Error with ${data.current}: ${data.message}`, 'error');
    }
    
    // Display additional stats
    const additionalStatsElement = document.getElementById('additionalStats');
    if (additionalStatsElement && (data.skipped !== undefined || data.premium !== undefined)) {
        let statsHtml = '';
        if (data.skipped > 0) {
            statsHtml += `<span class="stat-item"><i class="bi bi-skip-forward"></i> Skipped: ${data.skipped}</span>`;
        }
        if (data.premium > 0) {
            statsHtml += `<span class="stat-item"><i class="bi bi-lock"></i> Premium: ${data.premium}</span>`;
        }
        additionalStatsElement.innerHTML = statsHtml;
    }
});

// Listen for backend status updates (if implemented)
ipcRenderer.on('solving-status', (event, message) => {
    showStatus(message);
});

// Listen for detailed solver logs
ipcRenderer.on('solver-log', (event, logData) => {
    const liveActivitySection = document.getElementById('liveActivitySection');
    const liveActivityLog = document.getElementById('liveActivityLog');
    
    if (liveActivitySection && liveActivityLog) {
        // Show the activity section if hidden
        if (liveActivitySection.style.display === 'none') {
            liveActivitySection.style.display = 'block';
        }
        
        // Create log entry
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry d-flex align-items-center gap-2 mb-1';
        
        const timestamp = new Date(logData.timestamp).toLocaleTimeString();
        const levelClass = getLevelClass(logData.level);
        const tagColor = getTagColor(logData.tag);
        
        logEntry.innerHTML = `
            <span class="text-muted" style="font-size: 0.7rem; min-width: 60px;">${timestamp}</span>
            <span class="badge ${levelClass}" style="font-size: 0.6rem; min-width: 50px;">${logData.level}</span>
            <span class="text-${tagColor} fw-bold" style="font-size: 0.7rem; min-width: 120px;">[${logData.tag}]</span>
            <span class="text-white" style="font-size: 0.75rem;">${logData.message}</span>
        `;
        
        // Add to log
        liveActivityLog.appendChild(logEntry);
        
        // Auto-scroll to bottom
        liveActivityLog.scrollTop = liveActivityLog.scrollHeight;
        
        // Limit log entries to 50 to prevent memory issues
        if (liveActivityLog.children.length > 50) {
            liveActivityLog.removeChild(liveActivityLog.firstChild);
        }
        
        // Highlight important events
        if (logData.tag === 'ACCEPTED' || logData.tag === 'SUBMITTED' || logData.tag === 'CODE_PASTED') {
            logEntry.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            logEntry.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            logEntry.style.borderRadius = '4px';
            logEntry.style.padding = '2px 4px';
        } else if (logData.tag === 'SESSION_PROGRESS') {
            logEntry.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            logEntry.style.border = '1px solid rgba(59, 130, 246, 0.3)';
            logEntry.style.borderRadius = '4px';
            logEntry.style.padding = '2px 4px';
        }
    }
});

// Helper functions for log styling
function getLevelClass(level) {
    switch (level) {
        case 'SUCCESS': return 'bg-success';
        case 'ERROR': return 'bg-danger';
        case 'WARNING': return 'bg-warning text-dark';
        case 'INFO': 
        default: return 'bg-info';
    }
}

function getTagColor(tag) {
    const colorMap = {
        'SOLVING': 'warning',
        'AI_GENERATING': 'info',
        'AI_GENERATED': 'success',
        'CODE_PASTED': 'success',
        'SUBMITTED': 'primary',
        'ACCEPTED': 'success',
        'CACHED': 'secondary',
        'SESSION_PROGRESS': 'primary',
        'REJECTED': 'danger',
        'PROBLEM_FAILED': 'danger',
        'RATE_LIMIT': 'warning',
        'CONTINUING': 'info'
    };
    return colorMap[tag] || 'muted';
}

// Listen for config updates from backend
ipcRenderer.on('config-updated', (event, newConfig) => {
    currentConfig = { ...currentConfig, ...newConfig };
    updateConfigDisplay();
    showToast('Configuration updated successfully!', 'success');
});

// Settings Modal Functions
function openSettingsModal() {
    loadSettingsIntoModal();
    settingsModal.classList.remove('d-none');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
        if (settingsApiKey) settingsApiKey.focus();
    }, 300);
}

function closeSettingsModal() {
    if (settingsChanged) {
        showConfirmDialog(
            'Unsaved Changes',
            'You have unsaved changes. Do you want to save them before closing?',
            [
                { text: 'Save & Close', action: async () => { await saveAllSettings(); closeModal(); }, primary: true },
                { text: 'Discard Changes', action: closeModal },
                { text: 'Cancel', action: () => {} }
            ]
        );
    } else {
        closeModal();
    }
}

function closeModal() {
    settingsModal.classList.add('d-none');
    document.body.style.overflow = '';
    settingsChanged = false;
}

// Load current settings into modal
function loadSettingsIntoModal() {
    if (settingsProgrammingLanguage && currentConfig.PROGRAMMING_LANGUAGE) {
        settingsProgrammingLanguage.value = currentConfig.PROGRAMMING_LANGUAGE;
    }
    
    if (settingsApiKey && currentConfig.GEMINI_API_KEY) {
        settingsApiKey.value = currentConfig.GEMINI_API_KEY;
    }
    
    if (currentConfig.GEMINI_MODEL) {
        selectedModel = currentConfig.GEMINI_MODEL;
        const modelCard = document.querySelector(`[data-model="${selectedModel}"]`);
        if (modelCard) {
            document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
            modelCard.classList.add('selected');
        }
    }
    
    // Set checkbox states
    if (settingsSkipSolved) settingsSkipSolved.checked = currentConfig.SKIP_SOLVED !== 'false';
    if (settingsSkipPremium) settingsSkipPremium.checked = currentConfig.SKIP_PREMIUM !== 'false';
    if (settingsVerboseLogging) settingsVerboseLogging.checked = currentConfig.VERBOSE_LOGGING === 'true';
    if (settingsEnableOptimizations) settingsEnableOptimizations.checked = currentConfig.ENABLE_OPTIMIZATIONS !== 'false';
    if (settingsEnableFallback) settingsEnableFallback.checked = currentConfig.ENABLE_FALLBACK !== 'false';
    if (settingsAutoRetry) settingsAutoRetry.checked = currentConfig.AUTO_RETRY !== 'false';
}

// Test API key functionality
async function testApiKey() {
    const apiKey = settingsApiKey.value.trim();
    
    if (!apiKey) {
        showApiTestResult('Please enter an API key first', 'error');
        return;
    }
    
    // Show loading state
    testSettingsApiKey.disabled = true;
    testSettingsApiKey.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Testing...';
    
    try {
        const result = await ipcRenderer.invoke('test-api-key', apiKey);
        
        if (result.success) {
            showApiTestResult('✓ API key is valid and working!', 'success');
            updateSettingsStatus('API key validated', 'success');
        } else {
            showApiTestResult(`✗ ${result.error}`, 'error');
            updateSettingsStatus('API key validation failed', 'error');
        }
    } catch (error) {
        console.error('Error testing API key:', error);
        showApiTestResult('✗ Failed to test API key', 'error');
        updateSettingsStatus('API key test failed', 'error');
    } finally {
        testSettingsApiKey.disabled = false;
        testSettingsApiKey.innerHTML = '<i class="bi bi-shield-check"></i> Test API Key';
    }
}

// Show API test result
function showApiTestResult(message, type) {
    if (!apiTestResult) return;
    
    apiTestResult.classList.remove('d-none', 'success', 'error');
    apiTestResult.classList.add(type);
    
    const statusIcon = type === 'success' ? 
        '<i class="bi bi-check-circle-fill"></i>' : 
        '<i class="bi bi-exclamation-triangle-fill"></i>';
    
    apiTestResult.querySelector('.test-status').innerHTML = statusIcon;
    apiTestResult.querySelector('.test-message').textContent = message;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        apiTestResult.classList.add('d-none');
    }, 5000);
}

// Save all settings
async function saveAllSettings() {
    const newConfig = {
        PROGRAMMING_LANGUAGE: settingsProgrammingLanguage?.value || 'java',
        GEMINI_API_KEY: settingsApiKey?.value || '',
        GEMINI_MODEL: selectedModel,
        SKIP_SOLVED: settingsSkipSolved?.checked ? 'true' : 'false',
        SKIP_PREMIUM: settingsSkipPremium?.checked ? 'true' : 'false',
        VERBOSE_LOGGING: settingsVerboseLogging?.checked ? 'true' : 'false',
        ENABLE_OPTIMIZATIONS: settingsEnableOptimizations?.checked ? 'true' : 'false',
        ENABLE_FALLBACK: settingsEnableFallback?.checked ? 'true' : 'false',
        AUTO_RETRY: settingsAutoRetry?.checked ? 'true' : 'false',
        USER_EMAIL: currentConfig.USER_EMAIL || 'kranthiyelaboina2580@gmail.com',
        GOOGLE_CHROME_EXECUTABLE_PATH: currentConfig.GOOGLE_CHROME_EXECUTABLE_PATH || ''
    };
    
    // Show saving indicator
    updateSettingsStatus('Saving settings...', 'info');
    if (saveSettingsBtn) {
        saveSettingsBtn.disabled = true;
        saveSettingsBtn.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Saving...';
    }
    
    try {
        const result = await ipcRenderer.invoke('save-env-config', newConfig);
        
        console.log('Save result:', result);
        
        if (result && result.success) {
            currentConfig = { ...currentConfig, ...newConfig };
            settingsChanged = false;
            updateSettingsStatus('Settings saved successfully!', 'success');
            updateConfigDisplay();
            showToast('Settings saved and applied successfully!', 'success');
        } else {
            const errorMessage = result?.error || 'Unknown error occurred while saving settings';
            console.error('Settings save failed:', errorMessage);
            updateSettingsStatus(`Failed to save settings: ${errorMessage}`, 'error');
            showToast(`Failed to save settings: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        const errorMessage = error.message || 'An unexpected error occurred while saving settings';
        updateSettingsStatus(`Error saving settings: ${errorMessage}`, 'error');
        showToast(`An error occurred while saving settings: ${errorMessage}`, 'error');
    } finally {
        // Restore button state
        if (saveSettingsBtn) {
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save Settings';
        }
    }
}

// Update settings status indicator
function updateSettingsStatus(message, type = 'info') {
    const indicator = document.getElementById('settingsStatusIndicator');
    if (!indicator) return;
    
    indicator.classList.remove('success', 'error', 'warning');
    indicator.classList.add(type);
    
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-triangle-fill',
        warning: 'bi-clock-fill',
        info: 'bi-info-circle-fill'
    };
    
    const icon = indicator.querySelector('i');
    if (icon) {
        icon.className = `bi ${icons[type] || icons.info}`;
    }
    
    const text = indicator.querySelector('span');
    if (text) {
        text.textContent = message;
    }
}

// Show confirmation dialog
function showConfirmDialog(title, message, buttons) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-backdrop"></div>
        <div class="confirm-container">
            <div class="confirm-header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-body">
                <p>${message}</p>
            </div>
            <div class="confirm-actions">
                ${buttons.map((btn, index) => 
                    `<button class="aurora-btn ${btn.primary ? 'primary' : 'secondary'}" data-action="${index}">
                        ${btn.text}
                    </button>`
                ).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Handle button clicks
    dialog.querySelectorAll('[data-action]').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            buttons[index].action();
            document.body.removeChild(dialog);
        });
    });
    
    // Close on backdrop click
    dialog.querySelector('.confirm-backdrop').addEventListener('click', () => {
        buttons[buttons.length - 1].action(); // Default to last button (usually Cancel)
        document.body.removeChild(dialog);
    });
}