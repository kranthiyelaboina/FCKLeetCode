export const sleep = async (time) => {
  await new Promise((resolve) => setTimeout(resolve, time * 1000));
};

export const getElementByXPath = async (element, xpath, timeoutDelay = 15, delay = 0.5) => {
  await sleep(delay);
  await element.waitForXPath(xpath, {
    visible: true,
    timeout: timeoutDelay * 1000,
  });
  return await element.$x(xpath);
};

export const getElementBySelector = async (element, selector, timeoutDelay = 15, delay = 0.5) => {
  await sleep(delay);
  await element.waitForSelector(selector, {
    visible: true,
    timeout: timeoutDelay * 1000,
  });
  return await element.$$(selector);
};

// Enhanced function that tries multiple selectors (CSS and XPath) - Optimized for speed
export const getElementRobust = async (element, selectors, timeoutDelay = 3, delay = 0.1) => {
  await sleep(delay);
  
  for (const selector of selectors) {
    try {
      if (selector.startsWith('//') || selector.startsWith('/html')) {
        // XPath selector
        await element.waitForXPath(selector, {
          visible: true,
          timeout: timeoutDelay * 1000,
        });
        return await element.$x(selector);
      } else {
        // CSS selector
        await element.waitForSelector(selector, {
          visible: true,
          timeout: timeoutDelay * 1000,
        });
        return await element.$$(selector);
      }
    } catch (error) {
      // Reduced logging for speed - only log if it's the last selector
      if (selector === selectors[selectors.length - 1]) {
        console.log(`All selectors failed, last attempt: ${selector}`);
      }
      continue;
    }
  }
  throw new Error(`All selectors failed: ${selectors.join(', ')}`);
};

let cntrlKey = process.platform === "win32" ? "Control" : "Meta";

export const selectAllHelper = async (page) => {
  await page.keyboard.down(cntrlKey);
  await page.keyboard.press("KeyA");
  await page.keyboard.up(cntrlKey);
};

export const copyHelper = async (page) => {
  await page.keyboard.down(cntrlKey);
  await page.keyboard.press("KeyC");
  await page.keyboard.up(cntrlKey);
};

export const pasteHelper = async (page) => {
  await page.keyboard.down(cntrlKey);
  await page.keyboard.press("KeyV");
  await page.keyboard.up(cntrlKey);
};