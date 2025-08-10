const { ipcRenderer } = require('electron');

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const geminiModelSelect = document.getElementById('geminiModel');
const programmingLanguageSelect = document.getElementById('programmingLanguage');
const enableOptimizationsCheckbox = document.getElementById('enableOptimizations');
const enableFallbackCheckbox = document.getElementById('enableFallback');
const saveSettingsBtn = document.getElementById('saveSettings');
const testApiKeyBtn = document.getElementById('testApiKey');
const resetSettingsBtn = document.getElementById('resetSettings');
const openGeminiLink = document.getElementById('openGeminiLink');

// State
let currentConfig = {};
let isApiKeyVisible = false;

// Initialize settings window
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentSettings();
    setupEventListeners();
    applyAnimations();
});

// Apply entrance animations
function applyAnimations() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Load current settings
async function loadCurrentSettings() {
    try {
        currentConfig = await ipcRenderer.invoke('get-env-config');
        populateForm();
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load current settings', 'error');
    }
}

// Populate form with current settings
function populateForm() {
    apiKeyInput.value = currentConfig.GEMINI_API_KEY || '';
    geminiModelSelect.value = currentConfig.GEMINI_MODEL || 'gemini-1.5-flash';
    programmingLanguageSelect.value = currentConfig.PROGRAMMING_LANGUAGE || 'java';
    
    // Set checkboxes
    enableOptimizationsCheckbox.checked = currentConfig.ENABLE_OPTIMIZATIONS !== 'false';
    enableFallbackCheckbox.checked = currentConfig.ENABLE_FALLBACK !== 'false';
}

// Setup event listeners
function setupEventListeners() {
    // Toggle API key visibility with professional icon
    toggleApiKeyBtn.addEventListener('click', () => {
        toggleApiKeyVisibility();
    });

    // Open Google AI Studio link
    openGeminiLink.addEventListener('click', (e) => {
        e.preventDefault();
        ipcRenderer.invoke('open-external', 'https://aistudio.google.com/app/apikey');
    });

    // Test API key
    testApiKeyBtn.addEventListener('click', async () => {
        await testApiKey();
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        await saveSettings();
    });

    // Reset settings
    resetSettingsBtn.addEventListener('click', async () => {
        await resetSettings();
    });

    // Real-time validation with visual feedback
    apiKeyInput.addEventListener('input', () => {
        validateApiKey();
    });

    // Programming language selection info
    programmingLanguageSelect.addEventListener('change', () => {
        showLanguageInfo();
    });

    // Model selection info
    geminiModelSelect.addEventListener('change', () => {
        showModelInfo();
    });
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
    isApiKeyVisible = !isApiKeyVisible;
    apiKeyInput.type = isApiKeyVisible ? 'text' : 'password';
    toggleApiKeyBtn.textContent = isApiKeyVisible ? 'Hide' : 'Show';
    
    // Add animation
    toggleApiKeyBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        toggleApiKeyBtn.style.transform = 'scale(1)';
    }, 100);
}

// Test API key
async function testApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showNotification('Please enter an API key first', 'warning');
        return;
    }
    
    setButtonLoading(testApiKeyBtn, 'Testing...');
    
    try {
        const result = await ipcRenderer.invoke('test-api-key', apiKey);
        
        if (result.success) {
            showNotification('API key is valid and working!', 'success');
        } else {
            showNotification(`API key test failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error testing API key:', error);
        showNotification('Failed to test API key', 'error');
    } finally {
        resetButton(testApiKeyBtn, 'Test API Key');
    }
}

// Validate API key format
function validateApiKey() {
    const apiKey = apiKeyInput.value;
    const isValid = apiKey.length === 0 || (apiKey.startsWith('AIza') && apiKey.length > 30);
    
    if (isValid) {
        apiKeyInput.style.borderColor = '#d1d5db';
        apiKeyInput.style.backgroundColor = 'white';
    } else {
        apiKeyInput.style.borderColor = '#dc2626';
        apiKeyInput.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
    }
    
    return isValid;
}

// Show programming language information
function showLanguageInfo() {
    const selectedLanguage = programmingLanguageSelect.value;
    const languageInfo = {
        'java': 'Strongly typed, object-oriented. Excellent for algorithms and data structures.',
        'python': 'Readable, concise syntax. Great for rapid prototyping and mathematical operations.',
        'cpp': 'High performance, extensive STL. Ideal for competitive programming.',
        'c': 'Low-level control, fast execution. Perfect for system-level programming.',
        'javascript': 'Dynamic and flexible. Good for web-based problem solving.'
    };

    console.log(`Selected language: ${selectedLanguage} - ${languageInfo[selectedLanguage]}`);
    showNotification(`Language set to ${selectedLanguage.toUpperCase()}`, 'info');
}

// Show model information
function showModelInfo() {
    const selectedModel = geminiModelSelect.value;
    const modelInfo = {
        'gemini-1.5-flash': 'Fast and efficient. Best for quick solutions. 15 RPM, 1,500 RPD.',
        'gemini-2.0-flash-exp': 'Latest experimental model. Advanced capabilities. 10 RPM, 50 RPD.',
        'gemini-1.5-pro': 'Most accurate and detailed solutions. 2 RPM, 50 RPD.',
        'gemini-pro': 'Legacy model. Reliable but slower. 60 RPM, 1,500 RPD.'
    };

    console.log(`Selected model: ${selectedModel} - ${modelInfo[selectedModel]}`);
    showNotification(`AI model set to ${selectedModel}`, 'info');
}

// Save settings
async function saveSettings() {
    // Validate API key
    if (!validateApiKey()) {
        showNotification('Please enter a valid API key', 'error');
        return;
    }

    // Validate required fields
    if (!apiKeyInput.value.trim()) {
        showNotification('Gemini API key is required', 'error');
        return;
    }

    // Prepare configuration
    const newConfig = {
        GEMINI_API_KEY: apiKeyInput.value.trim(),
        GEMINI_MODEL: geminiModelSelect.value,
        PROGRAMMING_LANGUAGE: programmingLanguageSelect.value,
        ENABLE_OPTIMIZATIONS: enableOptimizationsCheckbox.checked.toString(),
        ENABLE_FALLBACK: enableFallbackCheckbox.checked.toString()
    };

    // Show saving state
    setButtonLoading(saveSettingsBtn, 'Saving...');

    try {
        const result = await ipcRenderer.invoke('save-env-config', newConfig);
        
        if (result) {
            showNotification('Settings saved successfully!', 'success');
            currentConfig = newConfig;
            
            // Visual feedback
            saveSettingsBtn.style.background = '#16a34a';
            setTimeout(() => {
                saveSettingsBtn.style.background = '#2563eb';
            }, 1000);
        } else {
            showNotification('Failed to save settings. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('An error occurred while saving settings.', 'error');
    } finally {
        resetButton(saveSettingsBtn, 'Save Settings');
    }
}

// Reset settings to default
async function resetSettings() {
    const shouldReset = await showConfirmation('Reset all settings to default values?');
    
    if (shouldReset) {
        const defaultConfig = {
            GEMINI_API_KEY: '',
            GEMINI_MODEL: 'gemini-1.5-flash',
            PROGRAMMING_LANGUAGE: 'java',
            ENABLE_OPTIMIZATIONS: 'true',
            ENABLE_FALLBACK: 'true'
        };

        setButtonLoading(resetSettingsBtn, 'Resetting...');

        try {
            const result = await ipcRenderer.invoke('save-env-config', defaultConfig);
            
            if (result) {
                currentConfig = defaultConfig;
                populateForm();
                showNotification('Settings reset to default values.', 'success');
                
                // Reset input styles
                apiKeyInput.style.borderColor = '#d1d5db';
                apiKeyInput.style.backgroundColor = 'white';
            } else {
                showNotification('Failed to reset settings.', 'error');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            showNotification('An error occurred while resetting settings.', 'error');
        } finally {
            resetButton(resetSettingsBtn, 'Reset to Defaults');
        }
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

// Show confirmation dialog
async function showConfirmation(message) {
    try {
        const result = await ipcRenderer.invoke('show-message-box', {
            type: 'question',
            title: 'Confirm Action',
            message: message,
            buttons: ['Yes', 'No']
        });
        return result.response === 0;
    } catch (error) {
        console.error('Error showing confirmation:', error);
        return false;
    }
}

// Show professional notification
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
    }, 3000);
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

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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
`;
document.head.appendChild(notificationStyles);
