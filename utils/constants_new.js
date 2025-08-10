// SCRAPERs XPATH
export const SCRAPER_SUBMITTED_CODE_NAME_XPATH = "/html/body/div[2]/div/div[1]/div/div[1]/h4/a";
export const SCRAPER_SUBMITTED_CODE_LANGUAGE_XPATH =
  "/html/body/div[2]/div/div[1]/div/div[2]/div[7]/div/div[1]/div/div[1]/span";
export const SCRAPER_SUBMITTED_CODE_DIV_XPATH =
  "/html/body/div[2]/div/div[1]/div/div[2]/div[7]/div/div[3]/div/div/div[3]/div/div[3]";

// Modern LeetCode selectors - Updated for current interface
export const QUESTIONS_CODE_EDITOR_SELECTOR = ".monaco-editor textarea, div[data-track-load='description_content'] textarea, .cm-content, .CodeMirror-code";
export const QUESTIONS_SUBMIT_BUTTON_SELECTOR = "button:has-text('Submit'), button[data-e2e-locator='console-submit-button'], button[class*='bg-green'], button[class*='submit']";
export const QUESTIONS_RUN_BUTTON_SELECTOR = "button:has-text('Run'), button[data-e2e-locator='console-run-button']";
export const QUESTIONS_LANGUAGE_SELECTOR = "div[class*='lang'] button, button[class*='language'], div:has-text('Language') button";

// Working XPath selectors for current LeetCode interface
export const QUESTIONS_CODE_DIV_XPATH = "//div[contains(@class, 'monaco-editor')]//textarea | //div[@data-track-load='description_content']//textarea";
export const QUESTIONS_SUBMIT_DIV_XPATH = "//button[contains(text(), 'Submit')] | //button[@data-e2e-locator='console-submit-button']";
export const QUESTIONS_LANGUAGE_BTN_XPATH = "//div[contains(@class, 'lang')]//button | //button[contains(@class, 'language')]";
export const QUESTIONS_LANGUAGE_DIV_XPATH = "//div[@role='option'] | //li[@role='option'] | //div[contains(text(), 'Java')]";

// Result detection selectors
export const QUESTIONS_SUBMIT_ACCEPTED_XPATH = "//span[contains(@class, 'text-green') or contains(text(), 'Accepted')] | //div[contains(@class, 'success')]";
export const IS_SOLUTION_ACCEPTED_DIV_XPATH = "//span[contains(text(), 'Accepted')] | //div[contains(@class, 'text-green')] | //span[contains(@class, 'text-green')]";

// Problem status selectors
export const PROBLEM_SOLVED_INDICATOR = "//div[contains(@class, 'text-green')] | //span[contains(@class, 'text-green')] | //svg[contains(@class, 'text-green')]";
export const PROBLEM_PREMIUM_INDICATOR = "//span[contains(@class, 'premium')] | //div[contains(@class, 'premium')] | //svg[contains(@class, 'premium')]";

export const LEETCODER_ASCII_ART = `
     _                    _                _           
    | |                  | |              | |          
    | |     ___  ___  ___| |_ ___ ___   __| | ___ _ __ 
    | |    / _ \\/ _ \\/ _ \\ __/ __/ _ \\ / _| |/ _ \\  __|
    | |___|  __/  __/  __/ || (_| (_) | (_| |  __/ |   
    \\_____/\\___|\\___|\\___|\\__\\___\\___/ \\__,_|\\___|_|
    
    Developed by : Chanpreet Singh, Aryan Singh, Himanshu Upreti
    Github Link : https://github.com/chanpreet3000/leetcode-bot
    `;

export const LEETCODER_MODE_QUESTION = `
     Select a mode
     [1] Start Leetcode Bot.
     [2] Scrape Solved Leetcode Problems.
     [other] Exit.
    `;

export const EXITING_LEETCODER = `Thanks for using Leetcoder. Please report any bugs/issues Github Link : https://github.com/chanpreet3000/leetcode-bot`;
