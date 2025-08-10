import Logger from "./utils/Logger.js";
import LeetcoderAuthenticator from "./leetcoder/LeetcoderAuthenticator.js";
import {EXITING_LEETCODER} from "./utils/constants.js";
import LeetcoderSolver from "./leetcoder/LeetcoderSolver.js";
import {closeBrowser} from "./managers/BrowserManager.js";
import LeetcoderScraper from "./leetcoder/LeetcoderScraper.js";
import LeetcoderGUI from "./utils/LeetcoderGUI.js";

async function main() {
  try {
    let continueSession = true;
    
    while (continueSession) {
      try {
        const mainChoice = await LeetcoderGUI.showMainMenu();
        
        switch (mainChoice) {
          case 'solve':
            await handleSolvingMode();
            continueSession = false; // Exit after solving session
            break;
            
          case 'scrape':
            Logger.success('Starting scraping mode...');
            await LeetcoderAuthenticator.loginUser();
            await LeetcoderScraper.scrapeAcceptedSolutions();
            continueSession = false;
            break;
            
          case 'global':
            Logger.success('Starting global scraping mode...');
            await LeetcoderAuthenticator.loginUser();
            await LeetcoderScraper.scrapeAcceptedSolutionsGlobally();
            continueSession = false;
            break;
            
          case 'exit':
            continueSession = false;
            break;
            
          default:
            continueSession = false;
            break;
        }
      } catch (error) {
        const retry = await LeetcoderGUI.showError(error);
        if (!retry) {
          continueSession = false;
        }
      }
    }
  } catch (err) {
    Logger.error('Something went wrong!', err);
  } finally {
    Logger.error(EXITING_LEETCODER);
    await closeBrowser();
    process.exit();
  }
}

async function handleSolvingMode() {
  try {
    // Show welcome message
    LeetcoderGUI.displayWelcomeMessage();
    
    // Get solving configuration from user
    const config = await LeetcoderGUI.getSolvingConfiguration();
    
    // Confirm configuration
    const confirmed = await LeetcoderGUI.confirmStart(config);
    if (!confirmed) {
      return;
    }
    
    // Login to LeetCode
    Logger.success('Logging into LeetCode...');
    await LeetcoderAuthenticator.loginUser();
    
    // Add progress callback to config
    config.progressCallback = async (solved, total, current) => {
      await LeetcoderGUI.showSolvingProgress(solved, total, current);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause to show progress
    };
    
    // Start solving
    Logger.success('Starting AI-powered solving session...');
    const results = await LeetcoderSolver.solve(config);
    
    // Show summary
    let continueMore = true;
    while (continueMore) {
      continueMore = await LeetcoderGUI.showSummary(results);
      if (continueMore) {
        // Start another session
        const newConfig = await LeetcoderGUI.getSolvingConfiguration();
        const newConfirmed = await LeetcoderGUI.confirmStart(newConfig);
        if (newConfirmed) {
          newConfig.progressCallback = config.progressCallback;
          const newResults = await LeetcoderSolver.solve(newConfig);
          // Merge results
          results.solved += newResults.solved;
          results.failed += newResults.failed;
          results.skipped += newResults.skipped;
          results.premium += newResults.premium;
          results.topProblems = [...results.topProblems, ...newResults.topProblems];
        } else {
          continueMore = false;
        }
      }
    }
    
  } catch (error) {
    Logger.error(`Solving mode error: ${error.message}`);
    throw error;
  }
}

// Start the application
main();