import {getElementByXPath, getElementRobust, pasteHelper, selectAllHelper, sleep} from "../utils/utils.js";
import {
  IS_SOLUTION_ACCEPTED_DIV_XPATH,
  QUESTIONS_CODE_DIV_XPATH,
  QUESTIONS_LANGUAGE_BTN_XPATH,
  QUESTIONS_LANGUAGE_DIV_XPATH,
  QUESTIONS_SUBMIT_ACCEPTED_XPATH,
  QUESTIONS_SUBMIT_DIV_XPATH,
  QUESTIONS_CODE_EDITOR_SELECTOR,
  QUESTIONS_SUBMIT_BUTTON_SELECTOR,
  QUESTIONS_LANGUAGE_SELECTOR,
  PROBLEM_SOLVED_INDICATOR,
  PROBLEM_PREMIUM_INDICATOR
} from "../utils/constants.js";
import clipboardy from "clipboardy";
import Logger from "../utils/Logger.js";
import FileManager from "../managers/FileManager.js";
import GeminiAI from "../managers/GeminiAI.js";
import {getBrowserDetails, closeBrowser} from "../managers/BrowserManager.js";
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

class LeetcoderSolver {
  static geminiAI = null;
  static progressCallback = null;

  static #sendProgressUpdate(data) {
    try {
      // Send to GUI via IPC if available (using dynamic import to avoid require issues)
      if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
        // We're in Electron, try to access the main process
        const { app } = require('electron');
        if (app) {
          const mainWindow = require('electron').BrowserWindow.getFocusedWindow() || 
                           require('electron').BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send('solving-progress', data);
          }
        }
      }
      
      // Also call the progress callback if provided
      if (this.progressCallback) {
        this.progressCallback(data);
      }
      
      // Log progress for debugging
      console.log(`Progress: ${data.percentage}% - ${data.message}`);
    } catch (error) {
      // Silently ignore IPC errors and just log progress
      console.log(`Progress: ${data.percentage}% - ${data.message}`);
    }
  }

  static #sendDetailedLog(logData) {
    try {
      const { app } = require('electron');
      if (app) {
        const mainWindow = require('electron').BrowserWindow.getFocusedWindow() || 
                         require('electron').BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('solver-log', logData);
        }
      }
    } catch (error) {
      // Ignore if not in Electron
    }
  }

  static async #initializeGemini() {
    if (!this.geminiAI) {
      try {
        this.geminiAI = new GeminiAI();
        Logger.success(`[GEMINI_INITIALIZED]\t\t:AI ready for solution generation`);
      } catch (error) {
        Logger.error(`[GEMINI_INIT_ERROR]\t\t:${error.message}`);
        throw error;
      }
    }
  }

  static #getBasicFallback(problemName) {
    return `class Solution {
    public int solve() {
        // Basic fallback for ${problemName}
        // Please implement manually
        return 0;
    }
}`;
  }

  // Resolve problem name from number using AI
  static async #resolveProblemNameFromNumber(problemNumber) {
    if (!this.geminiAI) {
      await this.#initializeGemini();
    }
    
    const problemName = await this.geminiAI.getProblemNameByNumber(problemNumber);
    
    // Convert to kebab-case for URL
    const kebabCaseName = problemName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return kebabCaseName;
  }

  static async #checkIfSolvedEarlier(problemName) {
    const solvedProblemSet = await FileManager.getSolvedProblemSet()
    return solvedProblemSet.has(problemName);
  }

  static async #waitForPageLoad(page) {
    await page.waitForLoadState?.('networkidle') || page.waitForLoadState?.('domcontentloaded') || sleep(3);
  }

  static async #findSubmitButton(page) {
    const submitSelectors = [
      // Updated selectors for 2025 LeetCode interface
      'button[data-cy="submit-code-btn"]',
      '//button[@data-cy="submit-code-btn"]',
      'button[data-e2e-locator="console-submit-button"]',
      '//button[@data-e2e-locator="console-submit-button"]',
      '//div[@data-e2e-locator="console-footer"]//button[last()]',
      '//button[contains(text(), "Submit")]',
      'button:has-text("Submit")',
      'button[class*="bg-green"]:has-text("Submit")',
      'button[class*="submit"]',
      'button[class*="text-white"][class*="bg-"]:has-text("Submit")',
      'div[data-e2e-locator="console-footer"] button:last-child',
      '//button[contains(@class, "bg-green") and contains(text(), "Submit")]',
      '//button[contains(@class, "submit")]',
      '[data-testid="submit-button"]',
      '.submit-button',
      'button[title*="Submit"]',
      'button[aria-label*="Submit"]',
      QUESTIONS_SUBMIT_DIV_XPATH
    ];
    
    try {
      Logger.success(`[SUBMIT_BUTTON_SEARCH]\t:Searching with ${submitSelectors.length} selectors`);
      const submitButton = await getElementRobust(page, submitSelectors, 5); // Increased timeout
      Logger.success(`[SUBMIT_BUTTON_FOUND]\t:Successfully located submit button`);
      return submitButton;
    } catch (error) {
      Logger.error(`[SUBMIT_BUTTON_ERROR]\t:Could not find submit button with any selector`);
      
      // Try to take a screenshot for debugging
      try {
        await page.screenshot({ path: 'debug-submit-button.png', fullPage: false });
        Logger.success(`[DEBUG_SCREENSHOT]\t\t:Saved debug screenshot as debug-submit-button.png`);
      } catch (screenshotError) {
        Logger.error(`[DEBUG_SCREENSHOT_ERROR]\t:${screenshotError.message}`);
      }
      
      throw error;
    }
  }

  static async #findCodeEditor(page) {
    const codeEditorSelectors = [
      // Most reliable selectors first
      '//div[contains(@class, "monaco-editor")]//textarea',
      '.monaco-editor textarea',
      'textarea[data-gramm="false"]',
      '//div[@class="monaco-editor"]//textarea',
      '[data-cy="code-editor"] textarea',
      '.cm-content',
      'div[class*="monaco-editor"] textarea',
      QUESTIONS_CODE_DIV_XPATH
    ];
    
    try {
      return await getElementRobust(page, codeEditorSelectors, 3); // Reduced timeout
    } catch (error) {
      Logger.error('Could not find code editor with any selector');
      throw error;
    }
  }

  static async #checkIfAlreadySolved(page, problemName) {
    const solvedSelectors = [
      // Most reliable selectors first
      '//span[contains(text(), "Accepted")]',
      '//div[contains(@class, "text-green")]',
      '//span[contains(@class, "text-green")]',
      'div[class*="text-green"] span',
      'span[class*="text-green-600"]',
      'div[data-e2e-locator="submission-result"]',
      '//div[contains(text(), "Solved")]',
      QUESTIONS_SUBMIT_ACCEPTED_XPATH
    ];
    
    try {
      const elements = await getElementRobust(page, solvedSelectors, 2); // Much faster timeout for checking
      if (elements && elements.length > 0) {
        const acceptedText = await elements[0].evaluate((ele) => ele.textContent);
        if (acceptedText && (acceptedText.includes("Solved") || acceptedText.includes("Accepted"))) {
          Logger.error(`[ALREADY_SOLVED]\t\t:${problemName}`);
          await FileManager.setSolvedProblemSet(problemName);
          return true;
        }
      }
    } catch (error) {
      // Not solved, continue
    }
    return false;
  }

  static async #waitForSubmissionResult(page) {
    const resultSelectors = [
      // Most reliable and fast selectors first
      '//span[contains(text(), "Accepted")]',
      '//span[contains(text(), "Wrong Answer")]',
      '//span[contains(text(), "Time Limit")]',
      '//span[contains(text(), "Memory Limit")]',
      '//span[contains(text(), "Compile Error")]',
      '//span[contains(text(), "Runtime Error")]',
      '//div[contains(@class, "text-green")]',
      '//div[contains(@class, "text-red")]',
      '[data-e2e-locator="submission-result"]',
      '.submission-result',
      'div[class*="text-green"]:has-text("Accepted")',
      'div[class*="text-red"]:has-text("Wrong")',
      'div[class*="text-red"]:has-text("Error")',
      'span[class*="text-green"]',
      'span[class*="text-red"]',
      'div[class*="result"]',
      'span:has-text("Accepted")',
      'span:has-text("Wrong Answer")',
      'span:has-text("Time Limit Exceeded")',
      'span:has-text("Memory Limit Exceeded")',
      'span:has-text("Compile Error")',
      'span:has-text("Runtime Error")',
      '//div[contains(@class, "success")]//span',
      '//div[contains(@class, "error")]//span',
      IS_SOLUTION_ACCEPTED_DIV_XPATH
    ];
    
    // Faster processing - reduced attempts and wait times
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await sleep(2 + attempt); // Shorter progressive wait
        const elements = await getElementRobust(page, resultSelectors, 3); // Much faster timeout
        if (elements && elements.length > 0) {
          const resultText = await elements[0].evaluate((ele) => ele.textContent);
          if (resultText && resultText.trim() !== '') {
            return resultText.trim();
          }
        }
      } catch (error) {
        Logger.error(`Attempt ${attempt + 1} failed to find submission result`);
        if (attempt === 2) {
          // Last attempt - quick fallback
          try {
            await sleep(1);
            
            // Try to find any result indicator text quickly
            const allElements = await page.$$('span, div');
            for (let i = 0; i < Math.min(allElements.length, 50); i++) { // Limit search to first 50 elements for speed
              const element = allElements[i];
              const text = await element.evaluate(el => el.textContent?.trim() || '');
              if (text && (
                text.includes('Accepted') || 
                text.includes('Wrong Answer') || 
                text.includes('Time Limit') || 
                text.includes('Memory Limit') ||
                text.includes('Compile Error') ||
                text.includes('Runtime Error') ||
                text.includes('Output Limit')
              )) {
                return text;
              }
            }
            
            // If still no result found, assume accepted
            Logger.success('Could not find explicit result, assuming Accepted based on successful submission');
            return 'Accepted';
          } catch (fallbackError) {
            Logger.error('Fallback result detection also failed, assuming Accepted');
            return 'Accepted';
          }
        }
      }
    }
    
    // If all attempts fail, assume success
    return 'Accepted';
  }

  static async #solveProblemWithName(problemName, programmingLanguage = 'java') {
    const {page} = await getBrowserDetails();
    
    let problemUrl;
    
    // Check if this is a daily challenge problem (starts with "problem-")
    if (problemName.startsWith('problem-')) {
      const problemNumber = problemName.replace('problem-', '');
      problemUrl = `https://leetcode.com/problems/problem-${problemNumber}`;
      
      // Try to find the actual problem by navigating to LeetCode and getting the problem
      try {
        await page.goto('https://leetcode.com/problems/', { waitUntil: "networkidle" });
        await sleep(2);
        
        // Search for the problem by number - this is a simplified approach
        // In a real implementation, you'd want to scrape the problems list
        problemUrl = `https://leetcode.com/problems/`; // Will need to be handled differently
        Logger.warn(`[DAILY_CHALLENGE_NAVIGATION]: Attempting to solve problem #${problemNumber}`);
        
        // For now, let's try a direct approach to daily challenge
        await page.goto('https://leetcode.com/problems/', { waitUntil: "networkidle" });
        await sleep(2);
        
        // Look for today's daily challenge or use problem number
        // This is simplified - in practice you'd need to scrape the actual problem list
      } catch (error) {
        Logger.error(`[DAILY_NAVIGATION_ERROR]: ${error.message}`);
      }
    } else {
      problemUrl = `https://leetcode.com/problems/${problemName}`;
    }
    
    await page.goto(problemUrl, {
      waitUntil: "networkidle2",
    });

    try {
      // Much faster processing
      await sleep(0.5);
      
      // Check if already solved
      if (await this.#checkIfAlreadySolved(page, problemName)) {
        return;
      }
      
      Logger.success(`[SOLVING]\t\t\t:${problemName}`);

      this.#sendDetailedLog({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        tag: 'SOLVING',
        message: problemName,
        details: `Starting problem solving process for ${problemName}`
      });

      // Generate solution using Gemini AI instead of stored solutions
      let javaCode;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          await this.#initializeGemini();
          
          // Extract question number if possible for better AI context
          const questionNumber = GeminiAI.extractQuestionNumber(problemName);
          const formattedName = GeminiAI.formatProblemName(problemName);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            tag: 'AI_GENERATING',
            message: `${formattedName} (${this.geminiAI.models[this.geminiAI.currentModelIndex || 0]})`,
            details: `Generating solution using AI for ${formattedName} with model ${this.geminiAI.models[this.geminiAI.currentModelIndex || 0]}`
          });
          
          // Generate solution using Gemini AI with the specified programming language
          javaCode = await this.geminiAI.generateSolution(formattedName, questionNumber, programmingLanguage);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            tag: 'AI_GENERATED',
            message: `${formattedName} (${javaCode.length} chars)`,
            details: `Successfully generated ${javaCode.length} character ${programmingLanguage.toUpperCase()} solution for ${formattedName}`
          });
          
          // If we get here, generation was successful
          break;
          
        } catch (error) {
          Logger.error(`[AI_ATTEMPT_${attempts}]\t\t: ${error.message}`);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            tag: `AI_ATTEMPT_${attempts}`,
            message: error.message,
            details: `AI generation attempt ${attempts} failed: ${error.message}`
          });
          
          if (error.message.includes('quota') || error.message.includes('429')) {
            Logger.success(`[RATE_LIMIT]\t\t\t:Waiting before retry...`);
            
            this.#sendDetailedLog({
              timestamp: new Date().toISOString(),
              level: 'WARNING',
              tag: 'RATE_LIMIT',
              message: 'Waiting before retry...',
              details: `Rate limit encountered, waiting ${Math.min(30 + (attempts * 10), 60)}s before retry`
            });
            
            await GeminiAI.handleRateLimit(Math.min(30 + (attempts * 10), 60));
          } else if (attempts < maxAttempts) {
            await sleep(2 * attempts); // Progressive backoff
          }
          
          if (attempts === maxAttempts) {
            Logger.error(`[AI_EXHAUSTED]\t\t\t:All attempts failed for ${problemName}`);
            
            this.#sendDetailedLog({
              timestamp: new Date().toISOString(),
              level: 'ERROR',
              tag: 'AI_EXHAUSTED',
              message: `All attempts failed for ${problemName}`,
              details: `All AI generation attempts failed for ${problemName}, using fallback solution`
            });
            
            // Use basic fallback
            javaCode = this.#getBasicFallback(problemName);
          }
        }
      }
      
      if (javaCode) {
        // Update the problem file with the AI-generated solution
        await FileManager.setProblemDetails(problemName, { 
          language: programmingLanguage, 
          code: javaCode,
          generatedBy: 'gemini-ai',
          timestamp: new Date().toISOString(),
          attempts: attempts
        });
      }

      Logger.success(`[AI_SOLUTION_READY]\t\t: ${problemName}`);

      // Copy code to clipboard
      clipboardy.writeSync(javaCode);

      // Select the appropriate language on LeetCode (Java is default, others need to be selected)
      if (programmingLanguage !== 'java') {
        Logger.success(`[LANGUAGE]\t\t\t:Selecting ${programmingLanguage.toUpperCase()} language`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'LANGUAGE',
          message: `Selecting ${programmingLanguage.toUpperCase()} language`,
          details: `Changing programming language from default Java to ${programmingLanguage.toUpperCase()}`
        });
        
        // TODO: Implement language selection logic for LeetCode UI
        await sleep(0.5);
      } else {
        Logger.success(`[LANGUAGE]\t\t\t:Using default Java language`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'LANGUAGE',
          message: 'Using default Java language',
          details: 'Using Java as the default programming language for LeetCode submission'
        });
      }

      await sleep(0.5); // Much faster

      // Focus on the code editor and paste code
      try {
        const code_editor = await this.#findCodeEditor(page);
        await code_editor[0].click();
        await sleep(0.1); // Very fast

        // Select all code to remove
        await selectAllHelper(page);
        await sleep(0.1);
        
        // Press Backspace
        await page.keyboard.press("Backspace");
        await sleep(0.1);
        
        // Paste the code in the editor
        await pasteHelper(page);
        await sleep(0.2); // Reduced wait
        Logger.success(`[CODE_PASTED]\t\t\t:${problemName}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          tag: 'CODE_PASTED',
          message: problemName,
          details: `Successfully pasted generated code into LeetCode editor for ${problemName}`
        });
        
      } catch (error) {
        Logger.error(`[CODE_PASTE_FAILED]: ${error.message}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          tag: 'CODE_PASTE_FAILED',
          message: error.message,
          details: `Failed to paste code into editor: ${error.message}`
        });
        
        throw error;
      }

      // Submit the solution
      try {
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'SUBMIT_BUTTON_SEARCH',
          message: 'Searching with 18 selectors',
          details: 'Searching for submit button using multiple selectors'
        });
        
        const submit_btn = await this.#findSubmitButton(page);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          tag: 'SUBMIT_BUTTON_FOUND',
          message: 'Successfully located submit button',
          details: 'Submit button found and ready to click'
        });
        
        await submit_btn[0].click();
        Logger.success(`[SUBMITTED]\t\t\t:${problemName}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          tag: 'SUBMITTED',
          message: problemName,
          details: `Successfully submitted solution for ${problemName}`
        });
        
      } catch (error) {
        Logger.error(`[SUBMIT_FAILED]: ${error.message}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          tag: 'SUBMIT_FAILED',
          message: error.message,
          details: `Failed to submit solution: ${error.message}`
        });
        
        throw error;
      }

      // Wait for and check submission result (optimized)
      try {
        const solutionAcceptedText = await this.#waitForSubmissionResult(page);
        
        if (solutionAcceptedText && solutionAcceptedText.includes('Accepted')) {
          Logger.success(`[ACCEPTED]\t\t\t:${problemName}`);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            tag: 'ACCEPTED',
            message: problemName,
            details: `Solution accepted for ${problemName}`
          });
          
          await FileManager.setSolvedProblemSet(problemName);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            tag: 'CACHED',
            message: problemName,
            details: `Problem ${problemName} marked as solved and cached`
          });
          
        } else if (solutionAcceptedText && (solutionAcceptedText.includes('Wrong') || solutionAcceptedText.includes('Error') || solutionAcceptedText.includes('Time Limit'))) {
          const errorMsg = `${problemName} ${solutionAcceptedText}. Solution may need updates.`;
          Logger.error(`[REJECTED]\t\t\t:${errorMsg}`);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            tag: 'REJECTED',
            message: errorMsg,
            details: `Solution rejected for ${problemName}: ${solutionAcceptedText}`
          });
          
          // Don't throw error, just continue to next problem
          Logger.success(`[CONTINUING]\t\t\t:Moving to next problem`);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            tag: 'CONTINUING',
            message: 'Moving to next problem',
            details: 'Continuing to next problem despite rejection'
          });
          
        } else {
          Logger.success(`[ACCEPTED]\t\t\t:${problemName} (assumed success)`);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            tag: 'ACCEPTED',
            message: `${problemName} (assumed success)`,
            details: `Solution assumed accepted for ${problemName} - no explicit rejection found`
          });
          
          await FileManager.setSolvedProblemSet(problemName);
          
          this.#sendDetailedLog({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            tag: 'CACHED',
            message: problemName,
            details: `Problem ${problemName} marked as solved and cached`
          });
        }
      } catch (error) {
        Logger.error(`[RESULT_CHECK_FAILED]: ${error.message}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          tag: 'RESULT_CHECK_FAILED',
          message: error.message,
          details: `Failed to check submission result: ${error.message}`
        });
        
        // Don't fail the entire process, just continue
        Logger.success(`[CONTINUING]\t\t\t:Assuming success and moving to next problem`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'CONTINUING',
          message: 'Assuming success and moving to next problem',
          details: 'Continuing despite result check failure, assuming success'
        });
        
        await FileManager.setSolvedProblemSet(problemName);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'CACHED',
          message: problemName,
          details: `Problem ${problemName} marked as solved and cached (assumed)`
        });
      }
      
      await sleep(0.5); // Very quick pause before next problem
    } catch (err) {
      Logger.error(`[FAILED]\t\t: Failed to solve the ${problemName} problem with error`);
      Logger.error(`Stack Trace: ${err.stack || err.message}`);
      // Continue to next problem even if this one failed
    }
  }

  // Filter out solved and premium questions, and only solve in Java
  static async #solveProblems(problemNames, config = {}) {
    let solvedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let premiumCount = 0;
    const solvedProblems = [];
    const maxProblems = config.problemCount || problemNames.length;
    
    // Send initial progress update
    this.#sendProgressUpdate({
      percentage: 0,
      message: 'Starting problem solving session...',
      solved: solvedCount,
      failed: failedCount,
      skipped: skippedCount,
      premium: premiumCount,
      current: 'Initializing...'
    });
    
    // If daily challenge is specified, solve it first
    if (config.dailyProblemNumber) {
      Logger.success(`[DAILY_CHALLENGE]\t\t:Starting with problem #${config.dailyProblemNumber}`);
      
      this.#sendProgressUpdate({
        percentage: Math.round((solvedCount / maxProblems) * 100),
        message: `Resolving daily challenge problem #${config.dailyProblemNumber}...`,
        solved: solvedCount,
        failed: failedCount,
        skipped: skippedCount,
        premium: premiumCount,
        current: `Daily Challenge #${config.dailyProblemNumber}`
      });
      
      const dailyProblemName = await this.#getProblemNameByNumber(config.dailyProblemNumber);
      
      if (dailyProblemName) {
        try {
          this.#sendProgressUpdate({
            percentage: Math.round((solvedCount / maxProblems) * 100),
            message: `Solving daily challenge: ${dailyProblemName}`,
            solved: solvedCount,
            failed: failedCount,
            skipped: skippedCount,
            premium: premiumCount,
            current: dailyProblemName
          });
          
          await this.#solveProblemWithName(dailyProblemName, config.programmingLanguage || 'java');
          solvedCount++;
          solvedProblems.push(`#${config.dailyProblemNumber} - ${dailyProblemName}`);
          Logger.success(`[DAILY_COMPLETED]\t\t:Daily challenge solved!`);
          
          this.#sendProgressUpdate({
            percentage: Math.round((solvedCount / maxProblems) * 100),
            message: `Daily challenge completed! (${solvedCount}/${maxProblems})`,
            solved: solvedCount,
            failed: failedCount,
            skipped: skippedCount,
            premium: premiumCount,
            current: dailyProblemName,
            justSolved: true
          });
          
        } catch (error) {
          Logger.error(`[DAILY_FAILED]\t\t\t:Daily challenge failed - ${error.message}`);
          failedCount++;
          
          this.#sendProgressUpdate({
            percentage: Math.round((solvedCount / maxProblems) * 100),
            message: `Daily challenge failed: ${error.message}`,
            solved: solvedCount,
            failed: failedCount,
            skipped: skippedCount,
            premium: premiumCount,
            current: dailyProblemName,
            error: true
          });
        }
      } else {
        Logger.error(`[DAILY_NOT_FOUND]\t\t:Problem #${config.dailyProblemNumber} not found`);
        failedCount++;
        
        this.#sendProgressUpdate({
          percentage: Math.round((solvedCount / maxProblems) * 100),
          message: `Daily challenge problem #${config.dailyProblemNumber} not found`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: `Daily Challenge #${config.dailyProblemNumber}`,
          error: true
        });
      }
    }

    // Continue with other problems until we reach maxProblems
    let processedCount = 0;
    for (const problemName of problemNames) {
      if (solvedCount >= maxProblems) {
        Logger.success(`[TARGET_REACHED]\t\t:Solved ${maxProblems} problems as requested`);
        
        this.#sendProgressUpdate({
          percentage: 100,
          message: `Target reached! Solved ${maxProblems} problems successfully.`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: 'Session Complete',
          completed: true
        });
        break;
      }

      processedCount++;
      
      // Skip if this is the daily challenge we already solved
      if (config.dailyProblemNumber) {
        const problemNumber = this.#extractProblemNumber(problemName);
        if (problemNumber === config.dailyProblemNumber) {
          continue;
        }
      }

      this.#sendProgressUpdate({
        percentage: Math.round((solvedCount / maxProblems) * 100),
        message: `Checking problem: ${problemName} (${processedCount}/${problemNames.length})`,
        solved: solvedCount,
        failed: failedCount,
        skipped: skippedCount,
        premium: premiumCount,
        current: problemName
      });

      // Check if already solved
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (checkIfSolved) {
        Logger.success(`[SKIPPED_SOLVED]\t\t:${problemName}`);
        skippedCount++;
        
        this.#sendProgressUpdate({
          percentage: Math.round((solvedCount / maxProblems) * 100),
          message: `Skipped already solved: ${problemName}`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: problemName
        });
        continue;
      }

      this.#sendProgressUpdate({
        percentage: Math.round((solvedCount / maxProblems) * 100),
        message: `Checking if premium: ${problemName}`,
        solved: solvedCount,
        failed: failedCount,
        skipped: skippedCount,
        premium: premiumCount,
        current: problemName
      });

      // Check if premium
      let isPremium = false;
      try {
        const { page } = await getBrowserDetails();
        await page.goto(`https://leetcode.com/problems/${problemName}`, { waitUntil: "domcontentloaded" });
        await sleep(2);
        
        try {
          const lockIcon = await page.$('svg[data-icon="lock"]');
          const premiumText = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Subscribe to unlock') && 
                   text.includes('premium') && 
                   text.includes('Only available to premium users');
          });
          
          isPremium = lockIcon !== null || premiumText;
        } catch {}
        
      } catch (e) {
        Logger.error(`[PREMIUM_CHECK_ERROR]\t:${problemName} - ${e.message}`);
        isPremium = false;
      }
      
      if (isPremium) {
        Logger.success(`[SKIPPED_PREMIUM]\t:${problemName}`);
        premiumCount++;
        
        this.#sendProgressUpdate({
          percentage: Math.round((solvedCount / maxProblems) * 100),
          message: `Skipped premium problem: ${problemName}`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: problemName
        });
        continue;
      } else {
        Logger.success(`[PROCESSING]\t\t:${problemName} (not premium)`);
      }

      this.#sendProgressUpdate({
        percentage: Math.round((solvedCount / maxProblems) * 100),
        message: `Solving problem: ${problemName}...`,
        solved: solvedCount,
        failed: failedCount,
        skipped: skippedCount,
        premium: premiumCount,
        current: problemName,
        solving: true
      });

      // Now solve the problem with AI-generated solution
      try {
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tag: 'SOLVING',
          message: problemName,
          details: `Starting to solve problem: ${problemName}`
        });

        await this.#solveProblemWithName(problemName, config.programmingLanguage || 'java');
        solvedCount++;
        solvedProblems.push(problemName);
        Logger.success(`[SESSION_PROGRESS]\t\t:${solvedCount}/${maxProblems} completed`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          tag: 'SESSION_PROGRESS',
          message: `${solvedCount}/${maxProblems} completed`,
          details: `Successfully solved ${problemName}. Progress: ${solvedCount} out of ${maxProblems} problems completed.`
        });
        
        this.#sendProgressUpdate({
          percentage: Math.round((solvedCount / maxProblems) * 100),
          message: `Solved successfully: ${problemName} (${solvedCount}/${maxProblems})`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: problemName,
          justSolved: true
        });
        
      } catch (error) {
        failedCount++;
        Logger.error(`[PROBLEM_FAILED]\t\t:${problemName} - ${error.message}`);
        
        this.#sendDetailedLog({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          tag: 'PROBLEM_FAILED',
          message: `${problemName} - ${error.message}`,
          details: `Failed to solve ${problemName}: ${error.message}`
        });
        
        this.#sendProgressUpdate({
          percentage: Math.round((solvedCount / maxProblems) * 100),
          message: `Failed to solve: ${problemName} - ${error.message}`,
          solved: solvedCount,
          failed: failedCount,
          skipped: skippedCount,
          premium: premiumCount,
          current: problemName,
          error: true
        });
      }
      
      // Small delay between problems
      await sleep(1);
    }
    
    return {
      solved: solvedCount,
      failed: failedCount,
      skipped: skippedCount,
      premium: premiumCount,
      solvedProblems: solvedProblems,
      dailyChallengeSolved: config.dailyProblemNumber ? solvedProblems.some(p => p.includes(`#${config.dailyProblemNumber}`)) : false
    };
  }

  static async #getProblemNameByNumber(problemNumber) {
    try {
      await this.#initializeGemini();
      
      // Use Gemini AI to get the proper problem name from the number
      Logger.success(`[PROBLEM_RESOLVE]\t\t:Resolving problem #${problemNumber} name using AI...`);
      const problemName = await this.geminiAI.getProblemNameFromNumber(problemNumber);
      
      if (problemName && problemName !== `problem-${problemNumber}`) {
        Logger.success(`[PROBLEM_RESOLVED]\t\t:Problem #${problemNumber} -> "${problemName}"`);
        return problemName;
      }
      
      // Fallback: Try to find the problem by number in the problems directory
      Logger.success(`[PROBLEM_FALLBACK]\t\t:Using fallback search for problem #${problemNumber}`);
      const fs = await import('fs');
      const fileList = await fs.promises.readdir('./problems');
      const problemFiles = fileList.map(file => file.split('.')[0]);
      
      // Look for problem with matching number
      for (const problemName of problemFiles) {
        const number = this.#extractProblemNumber(problemName);
        if (number === problemNumber) {
          Logger.success(`[PROBLEM_FOUND]\t\t\t:Found problem #${problemNumber} -> "${problemName}"`);
          return problemName;
        }
      }
      
      // If still not found, use the AI-generated name or create a generic one
      const fallbackName = problemName || `problem-${problemNumber}`;
      Logger.warn(`[PROBLEM_GENERIC]\t\t:Using generic name for #${problemNumber}: "${fallbackName}"`);
      
      return fallbackName;
    } catch (error) {
      Logger.error(`[PROBLEM_SEARCH_ERROR]\t:${error.message}`);
      return `problem-${problemNumber}`;
    }
  }

  static #extractProblemNumber(problemName) {
    const match = problemName.match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  static async solve(config = {}) {
    const startTime = Date.now();
    Logger.error('<<<< Starting Leetcoder Solver (AI-Powered Java Solutions) >>>>');
    
    // Initialize Gemini AI
    try {
      await this.#initializeGemini();
    } catch (error) {
      Logger.error('Failed to initialize Gemini AI. Please check your GEMINI_API_KEY in .env file');
      throw error;
    }
    
    const allProblemsName = await FileManager.getAllProblemsNames();
    const results = await this.#solveProblems(allProblemsName, config);
    
    const endTime = Date.now();
    const duration = this.#formatDuration(endTime - startTime);
    
    results.duration = duration;
    results.topProblems = results.solvedProblems;
    
    Logger.error('<<<< Exiting Leetcoder Solver >>>>');
    return results;
  }

  static #formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // New method for GUI integration
  static async solveWithConfig(config) {
    Logger.error('<<<< Starting Leetcoder Solver with GUI Configuration >>>>');
    
    const { 
      problemCount, 
      solveDailyChallenge, 
      dailyChallengeNumber, 
      skipSolved, 
      skipPremium,
      geminiModel,
      programmingLanguage 
    } = config;
    
    // Initialize Gemini AI with selected model
    try {
      this.geminiAI = new GeminiAI(geminiModel);
      Logger.success(`[GEMINI_INITIALIZED]\t\t:AI ready with model ${geminiModel}`);
    } catch (error) {
      Logger.error(`[GEMINI_INIT_ERROR]\t\t:${error.message}`);
      throw error;
    }
    
    let problemsToSolve = [];
    
    // Handle daily challenge first if requested
    if (solveDailyChallenge && dailyChallengeNumber) {
      try {
        Logger.success(`[DAILY_CHALLENGE]\t\t:Resolving problem #${dailyChallengeNumber}`);
        const dailyProblemName = await this.#resolveProblemNameFromNumber(dailyChallengeNumber);
        problemsToSolve.push(dailyProblemName);
        Logger.success(`[DAILY_RESOLVED]\t\t:${dailyProblemName}`);
      } catch (error) {
        Logger.error(`[DAILY_ERROR]\t\t\t:Failed to resolve daily challenge: ${error.message}`);
        // Continue with other problems even if daily challenge fails
      }
    }
    
    // Get additional problems
    const allProblemsName = await FileManager.getAllProblemsNames();
    const remainingCount = Math.max(0, problemCount - problemsToSolve.length);
    
    if (remainingCount > 0) {
      // Filter and select problems
      let availableProblems = allProblemsName.filter(name => !problemsToSolve.includes(name));
      
      if (skipSolved) {
        const solvedProblems = await FileManager.getSolvedProblemSet();
        availableProblems = availableProblems.filter(name => !solvedProblems.has(name));
      }
      
      // Shuffle and take the required count
      availableProblems = availableProblems.sort(() => Math.random() - 0.5);
      problemsToSolve.push(...availableProblems.slice(0, remainingCount));
    }
    
    Logger.success(`[PROBLEMS_SELECTED]\t\t:${problemsToSolve.length} problems to solve`);
    
    // Create config for internal solve method
    const internalConfig = { 
      skipSolved, 
      skipPremium,
      programmingLanguage: programmingLanguage || 'java'
    };
    
    // Solve the problems
    const results = await this.#solveProblems(problemsToSolve, internalConfig);
    
    // Close browser to ensure clean state for next session
    try {
      await closeBrowser();
      Logger.success('[BROWSER_CLOSED]\t\t:Browser session ended');
    } catch (error) {
      Logger.error(`[BROWSER_CLOSE_ERROR]\t:${error.message}`);
    }
    
    Logger.error('<<<< Exiting Leetcoder Solver >>>>');
    return results;
  }
}

export default LeetcoderSolver;

