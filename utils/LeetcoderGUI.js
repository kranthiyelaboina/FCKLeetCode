import inquirer from 'inquirer';
import chalk from 'chalk';
import Logger from '../utils/Logger.js';

class LeetcoderGUI {
  static async showMainMenu() {
    console.clear();
    
    // Display header
    console.log(chalk.cyan.bold(`
    ╔═══════════════════════════════════════════════════════╗
    ║                  🚀 LEETCODER BOT 🚀                  ║
    ║                                                       ║
    ║            AI-Powered LeetCode Problem Solver         ║
    ║                                                       ║
    ║                Developed by: Kranthi Yelaboina       ║
    ║              Github: github.com/kranthiyelaboina     ║
    ╚═══════════════════════════════════════════════════════╝
    `));

    const mainMenuChoices = [
      {
        name: '🤖 Start AI-Powered LeetCode Bot',
        value: 'solve'
      },
      {
        name: '📥 Scrape Already Solved Problems',
        value: 'scrape'
      },
      {
        name: '🌍 Global Scraping Mode',
        value: 'global'
      },
      {
        name: '❌ Exit',
        value: 'exit'
      }
    ];

    const { mainChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mainChoice',
        message: 'What would you like to do?',
        choices: mainMenuChoices,
        pageSize: 10
      }
    ]);

    return mainChoice;
  }

  static async getSolvingConfiguration() {
    console.log(chalk.yellow.bold('\n📋 Configure Your Solving Session\n'));

    const questions = [
      {
        type: 'input',
        name: 'problemCount',
        message: 'How many problems would you like to solve?',
        default: '10',
        validate: (input) => {
          const num = parseInt(input);
          if (isNaN(num) || num < 1 || num > 100) {
            return 'Please enter a valid number between 1 and 100';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'solveDailyChallenge',
        message: 'Would you like to solve today\'s Daily Challenge first?',
        default: true
      }
    ];

    const config = await inquirer.prompt(questions);
    
    // If user wants to solve daily challenge, get the problem number
    if (config.solveDailyChallenge) {
      const dailyQuestion = await inquirer.prompt([
        {
          type: 'input',
          name: 'dailyProblemNumber',
          message: 'Enter today\'s Daily Challenge LeetCode problem number:',
          validate: (input) => {
            const num = parseInt(input);
            if (isNaN(num) || num < 1 || num > 5000) {
              return 'Please enter a valid LeetCode problem number (1-5000)';
            }
            return true;
          }
        }
      ]);
      
      config.dailyProblemNumber = parseInt(dailyQuestion.dailyProblemNumber);
    }

    config.problemCount = parseInt(config.problemCount);
    
    return config;
  }

  static async showSolvingProgress(solved, total, current = null) {
    const percentage = Math.round((solved / total) * 100);
    const progressBar = this.createProgressBar(percentage, 30);
    
    console.clear();
    console.log(chalk.cyan.bold(`
    ╔═══════════════════════════════════════════════════════╗
    ║                  🤖 SOLVING IN PROGRESS               ║
    ╚═══════════════════════════════════════════════════════╝
    `));
    
    console.log(chalk.white(`📊 Progress: ${solved}/${total} problems solved (${percentage}%)`));
    console.log(chalk.green(`${progressBar}`));
    
    if (current) {
      console.log(chalk.yellow(`🔄 Currently solving: ${current}`));
    }
    
    console.log(chalk.gray(`\n⏱️  Session started at: ${new Date().toLocaleTimeString()}`));
  }

  static createProgressBar(percentage, length = 30) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `[${chalk.green(filledBar)}${chalk.gray(emptyBar)}] ${percentage}%`;
  }

  static async showSummary(results) {
    console.clear();
    console.log(chalk.green.bold(`
    ╔═══════════════════════════════════════════════════════╗
    ║                    ✅ SESSION COMPLETE                ║
    ╚═══════════════════════════════════════════════════════╝
    `));

    console.log(chalk.white.bold('📈 Session Summary:'));
    console.log(chalk.green(`✅ Successfully solved: ${results.solved}`));
    console.log(chalk.red(`❌ Failed attempts: ${results.failed}`));
    console.log(chalk.yellow(`⏭️  Skipped (already solved): ${results.skipped}`));
    console.log(chalk.blue(`💎 Premium problems encountered: ${results.premium}`));
    
    if (results.dailyChallengeSolved) {
      console.log(chalk.magenta(`🎯 Daily Challenge completed!`));
    }
    
    console.log(chalk.cyan(`⏱️  Total time: ${results.duration}`));
    
    if (results.topProblems && results.topProblems.length > 0) {
      console.log(chalk.white.bold('\n🏆 Problems solved this session:'));
      results.topProblems.slice(0, 5).forEach((problem, index) => {
        console.log(chalk.white(`   ${index + 1}. ${problem}`));
      });
    }

    // Ask if user wants to continue
    const { continueSession } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueSession',
        message: 'Would you like to start another solving session?',
        default: false
      }
    ]);

    return continueSession;
  }

  static async showError(error) {
    console.log(chalk.red.bold(`
    ╔═══════════════════════════════════════════════════════╗
    ║                      ❌ ERROR                         ║
    ╚═══════════════════════════════════════════════════════╝
    `));
    
    console.log(chalk.red(`Error: ${error.message}`));
    
    if (error.message.includes('browser') || error.message.includes('Chrome')) {
      console.log(chalk.yellow(`
🔧 Browser Issues Troubleshooting:
   1. Make sure Google Chrome is installed
   2. Check if Chrome path is correct in .env file
   3. Try running as Administrator
   4. Disable antivirus temporarily
   5. Restart your computer
      `));
    }
    
    if (error.message.includes('Gemini') || error.message.includes('API')) {
      console.log(chalk.yellow(`
🔧 AI API Issues Troubleshooting:
   1. Check your GEMINI_API_KEY in .env file
   2. Verify your API quota hasn't been exceeded
   3. Check your internet connection
   4. Try again in a few minutes
      `));
    }

    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try again?',
        default: true
      }
    ]);

    return retry;
  }

  static displayWelcomeMessage() {
    console.log(chalk.green.bold(`
🎉 Welcome to the AI-Powered LeetCode Bot!

This bot will:
✅ Generate optimal Java solutions using Gemini AI
✅ Handle different problem types intelligently  
✅ Skip already solved and premium problems
✅ Provide real-time progress updates
✅ Support daily challenge solving

Let's get started!
    `));
  }

  static async confirmStart(config) {
    console.log(chalk.white.bold('\n📋 Session Configuration:'));
    console.log(chalk.white(`   Problems to solve: ${config.problemCount}`));
    console.log(chalk.white(`   Daily Challenge: ${config.solveDailyChallenge ? '✅ Yes' : '❌ No'}`));
    
    if (config.solveDailyChallenge) {
      console.log(chalk.white(`   Daily Problem #: ${config.dailyProblemNumber}`));
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Start solving with these settings?',
        default: true
      }
    ]);

    return confirm;
  }
}

export default LeetcoderGUI;
