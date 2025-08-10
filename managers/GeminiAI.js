import { GoogleGenerativeAI } from '@google/generative-ai';
import Logger from '../utils/Logger.js';

class GeminiAI {
  constructor(selectedModel = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY environment variable is required. Please add your valid API key to the .env file.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use selected model or fall back to environment variable or default
    this.models = [
      selectedModel || process.env.GEMINI_MODEL || "gemini-1.5-flash",
      "gemini-1.5-flash", // More reliable fallback
      "gemini-1.5-pro", 
      "gemini-2.0-flash-exp" // Move experimental to end
    ];
    this.currentModelIndex = 0;
    this.model = this.genAI.getGenerativeModel({ model: this.models[0] });
    
    // Rate limiting and caching
    this.requestCount = 0;
    this.maxRequestsPerMinute = 15; // Conservative limit for free tier
    this.requestTimes = [];
    this.cache = new Map(); // Simple cache for problem names and solutions
    
    Logger.success(`[GEMINI_MODEL]\t\t\t:Initialized with ${this.models[0]}`);
  }

  // Rate limiting helper
  async #checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old request times
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = Math.ceil((oldestRequest + 60000 - now) / 1000);
      Logger.success(`[RATE_LIMIT_WAIT]\t\t:Waiting ${waitTime}s to avoid rate limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      return this.#checkRateLimit(); // Recheck after waiting
    }
    
    this.requestTimes.push(now);
  }

  // Enhanced error handling for API requests
  async #makeApiRequest(prompt, cacheKey = null) {
    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      Logger.success(`[CACHE_HIT]\t\t\t:Using cached result for ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    
    // Check rate limit
    await this.#checkRateLimit();
    
    let lastError = null;
    
    // Try with current model first, then fallback models
    for (let i = this.currentModelIndex; i < this.models.length; i++) {
      try {
        if (i !== this.currentModelIndex) {
          this.currentModelIndex = i;
          this.model = this.genAI.getGenerativeModel({ model: this.models[i] });
          Logger.success(`[MODEL_SWITCH]\t\t\t:Switching to ${this.models[i]}`);
        }
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Cache successful result
        if (cacheKey && text) {
          this.cache.set(cacheKey, text);
          // Limit cache size
          if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
        }
        
        return text;
        
      } catch (error) {
        lastError = error;
        Logger.error(`[API_ERROR_${this.models[i]}]\t:${error.message}`);
        
        if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
          // If we hit rate limit, wait longer and try next model
          const waitTime = Math.min(30 + (i * 10), 120); // Progressive wait, max 2 minutes
          Logger.success(`[RATE_LIMIT_BACKOFF]\t:Waiting ${waitTime}s before trying next model`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          continue;
        } else if (error.message.includes('INVALID_ARGUMENT') && error.message.includes('API key')) {
          // Invalid API key, no point in retrying
          throw error;
        }
        
        // For other errors, wait a bit and try next model
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // If all models failed, throw the last error
    throw lastError || new Error('All API models exhausted');
  }

  // Method to get problem name from LeetCode problem number
  async getProblemNameFromNumber(problemNumber) {
    try {
      const cacheKey = `problem-name-${problemNumber}`;
      
      const prompt = `You are an expert on LeetCode problems. Given a LeetCode problem number, provide the exact problem name/title as it appears on LeetCode.

PROBLEM NUMBER: ${problemNumber}

CRITICAL REQUIREMENTS:
1. Provide ONLY the problem name/title - no explanations or additional text
2. Use the exact title as it appears on LeetCode
3. Convert the title to kebab-case format (lowercase with hyphens)
4. For example: "Two Sum" becomes "two-sum"
5. "Longest Substring Without Repeating Characters" becomes "longest-substring-without-repeating-characters"
6. Think carefully about the exact problem title for this number

IMPORTANT: Take your time to think about this. Consider the most popular and well-known LeetCode problems and their exact titles.

Examples:
- Problem 1: "two-sum"
- Problem 2: "add-two-numbers" 
- Problem 3: "longest-substring-without-repeating-characters"
- Problem 4: "median-of-two-sorted-arrays"
- Problem 5: "longest-palindromic-substring"

Now provide the kebab-case problem name for LeetCode problem ${problemNumber}:`;

      Logger.success(`[AI_PROBLEM_NAME]\t\t:Getting problem name for #${problemNumber}`);
      
      const responseText = await this.#makeApiRequest(prompt, cacheKey);
      let problemName = this.#cleanProblemName(responseText);
      
      Logger.success(`[AI_PROBLEM_NAME]\t\t:Problem #${problemNumber} -> "${problemName}"`);
      return problemName;
      
    } catch (error) {
      Logger.error(`[AI_PROBLEM_NAME_ERROR]\t:Failed to get problem name for #${problemNumber}: ${error.message}`);
      
      // Fallback: use a simple pattern for common problems
      const fallbackNames = {
        1: 'two-sum',
        2: 'add-two-numbers', 
        3: 'longest-substring-without-repeating-characters',
        4: 'median-of-two-sorted-arrays',
        5: 'longest-palindromic-substring',
        7: 'reverse-integer',
        9: 'palindrome-number',
        11: 'container-with-most-water',
        15: '3sum',
        20: 'valid-parentheses',
        21: 'merge-two-sorted-lists',
        53: 'maximum-subarray',
        70: 'climbing-stairs',
        121: 'best-time-to-buy-and-sell-stock',
        136: 'single-number',
        206: 'reverse-linked-list',
        217: 'contains-duplicate',
        226: 'invert-binary-tree',
        238: 'product-of-array-except-self',
        242: 'valid-anagram',
        347: 'top-k-frequent-elements'
      };
      
      if (fallbackNames[problemNumber]) {
        Logger.success(`[AI_FALLBACK_NAME]\t\t:Using fallback name for #${problemNumber}`);
        return fallbackNames[problemNumber];
      }
      
      // If no fallback available, generate a generic name
      Logger.success(`[AI_GENERIC_NAME]\t\t:Using generic name for #${problemNumber}`);
      return `problem-${problemNumber}`;
    }
  }

  #cleanProblemName(rawName) {
    let cleanName = rawName.trim();
    
    // Remove quotes if present
    cleanName = cleanName.replace(/['"]/g, '');
    
    // Remove any explanatory text
    cleanName = cleanName.split('\n')[0].trim();
    cleanName = cleanName.split('.')[0].trim();
    cleanName = cleanName.split(':')[0].trim();
    
    // Convert to lowercase and replace spaces with hyphens
    cleanName = cleanName.toLowerCase();
    cleanName = cleanName.replace(/[^\w\s-]/g, ''); // Remove special characters except spaces and hyphens
    cleanName = cleanName.replace(/\s+/g, '-'); // Replace spaces with hyphens
    cleanName = cleanName.replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
    cleanName = cleanName.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return cleanName;
  }

  async generateJavaSolution(problemName, questionNumber = null) {
    return await this.generateSolution(problemName, questionNumber, 'java');
  }

  async generateSolution(problemName, questionNumber = null, language = 'java') {
    return await this.#tryGenerateWithFallbacks(problemName, questionNumber, language);
  }

  async #tryGenerateWithFallbacks(problemName, questionNumber, language = 'java', attempt = 1) {
    try {
      return await this.#generateSolutionWithModel(problemName, questionNumber, language);
    } catch (error) {
      Logger.error(`[AI_ATTEMPT_${attempt}]\t\t:${problemName} - ${error.message}`);
      
      // If quota exceeded or other API error, try next model
      if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
        if (this.currentModelIndex < this.models.length - 1) {
          this.currentModelIndex++;
          this.model = this.genAI.getGenerativeModel({ model: this.models[this.currentModelIndex] });
          Logger.success(`[MODEL_SWITCH]\t\t\t:Switching to ${this.models[this.currentModelIndex]}`);
          
          if (attempt < 3) {
            await this.#sleep(2000); // Wait 2 seconds before retry
            return await this.#tryGenerateWithFallbacks(problemName, questionNumber, language, attempt + 1);
          }
        }
      }
      
      // If all models failed or other error, create a proper fallback solution
      Logger.error(`[AI_TOTAL_FAILURE]\t\t:${problemName} - All generation attempts failed`);
      return this.#generateIntelligentFallback(problemName, questionNumber, language);
    }
  }

  async #generateSolutionWithModel(problemName, questionNumber, language = 'java') {
    const cacheKey = `solution-${problemName}-${questionNumber || 'unknown'}-${language}`;
    const prompt = this.#buildOptimalPrompt(problemName, questionNumber, language);
    
    Logger.success(`[AI_GENERATING]\t\t:${problemName} (${this.models[this.currentModelIndex]})`);
    
    const responseText = await this.#makeApiRequest(prompt, cacheKey);
    
    // Clean up the response to extract only code for the specified language
    let generatedCode = this.cleanJavaCode(responseText); // Keep using Java cleaner for now
    
    // Validate the generated code
    if (!this.#isValidJavaCode(generatedCode)) { // Keep using Java validator for now
      throw new Error('Generated code is invalid or incomplete');
    }
    
    Logger.success(`[AI_GENERATED]\t\t:${problemName} (${generatedCode.length} chars)`);
    return generatedCode;
  }

  #buildOptimalPrompt(problemName, questionNumber, language = 'java') {
    const languageConfig = this.#getLanguageConfig(language);
    
    let prompt = `You are a world-class competitive programmer and algorithm expert with deep knowledge of data structures, algorithms, and optimization techniques. Your task is to generate the most optimal and efficient ${languageConfig.displayName} solution for this LeetCode problem.

TAKE YOUR TIME TO THINK: Please carefully analyze the problem before generating the solution. Consider multiple approaches and choose the most optimal one.

PROBLEM: ${problemName}${questionNumber ? ` (LeetCode #${questionNumber})` : ''}

STEP-BY-STEP THINKING PROCESS:
1. First, understand what the problem is asking for
2. Consider the constraints and edge cases
3. Think about different algorithmic approaches (brute force, optimized, etc.)
4. Choose the approach with the best time and space complexity
5. Consider which data structures would be most efficient
6. Think about common patterns that apply to this problem type

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
1. Generate ONLY executable ${languageConfig.displayName} code - absolutely NO explanations, comments, or markdown
2. Use the exact LeetCode class structure: ${languageConfig.classStructure}
3. Implement the most time and space efficient algorithm possible
4. Choose the optimal data structures and algorithms for best performance
5. Handle ALL edge cases correctly (empty arrays, null inputs, boundary values)
6. Use proper ${languageConfig.displayName} method signatures that match LeetCode's expected format
7. Code must compile without any errors or warnings
8. Never use placeholder code, TODOs, or comments
9. Always return the correct data type as expected by LeetCode
10. Optimize for the best possible time complexity

${languageConfig.optimizationNotes}

COMMON PROBLEM PATTERNS TO CONSIDER:
- Array: Two pointers, sliding window, prefix sum, binary search
- String: Two pointers, sliding window, pattern matching algorithms
- LinkedList: Two pointers (fast/slow), dummy nodes
- Tree: DFS, BFS, traversal techniques
- Graph: DFS, BFS, Union-Find, shortest path algorithms
- Dynamic Programming: Tabulation, memoization, space optimization
- Backtracking: Pruning, state restoration
- Greedy: Local optimal leading to global optimal

THINK STEP BY STEP AND GENERATE THE MOST OPTIMAL SOLUTION:

Example of expected output format (NO COMMENTS ALLOWED):
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}

Now, carefully analyze the problem and generate the most optimal ${languageConfig.displayName} solution:`;

    return prompt;
  }

  #getLanguageConfig(language) {
    const configs = {
      java: {
        displayName: 'Java',
        classStructure: '"class Solution { ... }"',
        optimizationNotes: `OPTIMIZATION PRIORITIES (THINK CAREFULLY):
- Time complexity: O(1) > O(log n) > O(n) > O(n log n) > O(n²) > O(2^n)
- Space complexity: O(1) > O(log n) > O(n) > O(n²)
- Use HashMap/HashSet for O(1) lookups when beneficial
- Use two pointers technique for array problems when applicable
- Consider sliding window for substring/subarray problems
- Use dynamic programming for optimization problems
- Binary search for sorted array problems
- Consider using bit manipulation for optimization when applicable
- Use appropriate data structures (Stack, Queue, Deque, PriorityQueue, TreeMap, etc.)`
      },
      python: {
        displayName: 'Python',
        classStructure: '"class Solution:"',
        optimizationNotes: `OPTIMIZATION PRIORITIES (THINK CAREFULLY):
- Time complexity: O(1) > O(log n) > O(n) > O(n log n) > O(n²) > O(2^n)
- Space complexity: O(1) > O(log n) > O(n) > O(n²)
- Use dict/set for O(1) lookups when beneficial
- Use two pointers technique for array problems when applicable
- Consider sliding window for substring/subarray problems
- Use dynamic programming for optimization problems
- Binary search for sorted array problems
- Use list comprehensions and built-in functions for efficiency
- Use appropriate data structures (collections.deque, heapq, bisect, etc.)`
      },
      javascript: {
        displayName: 'JavaScript',
        classStructure: 'function structure or class methods',
        optimizationNotes: `OPTIMIZATION PRIORITIES (THINK CAREFULLY):
- Time complexity: O(1) > O(log n) > O(n) > O(n log n) > O(n²) > O(2^n)
- Space complexity: O(1) > O(log n) > O(n) > O(n²)
- Use Map/Set for O(1) lookups when beneficial
- Use two pointers technique for array problems when applicable
- Consider sliding window for substring/subarray problems
- Use dynamic programming for optimization problems
- Binary search for sorted array problems
- Use appropriate array methods and data structures efficiently`
      },
      cpp: {
        displayName: 'C++',
        classStructure: '"class Solution { ... }"',
        optimizationNotes: `OPTIMIZATION PRIORITIES (THINK CAREFULLY):
- Time complexity: O(1) > O(log n) > O(n) > O(n log n) > O(n²) > O(2^n)
- Space complexity: O(1) > O(log n) > O(n) > O(n²)
- Use unordered_map/unordered_set for O(1) lookups when beneficial
- Use two pointers technique for array problems when applicable
- Consider sliding window for substring/subarray problems
- Use dynamic programming for optimization problems
- Binary search for sorted array problems
- Use appropriate STL containers (vector, deque, priority_queue, stack, queue, etc.)`
      }
    };
    
    return configs[language] || configs.java; // Default to Java if language not found
  }

  #generateIntelligentFallback(problemName, questionNumber, language = 'java') {
    // Create more intelligent fallbacks based on problem type
    const formattedName = problemName.toLowerCase().replace(/-/g, ' ');
    
    // Pattern matching for common problem types
    if (formattedName.includes('two sum') || formattedName.includes('2sum')) {
      return `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}`;
    }
    
    if (formattedName.includes('palindrome')) {
      return `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}`;
    }

    if (formattedName.includes('reverse') && formattedName.includes('integer')) {
      return `class Solution {
    public int reverse(int x) {
        int result = 0;
        while (x != 0) {
            int digit = x % 10;
            x /= 10;
            if (result > Integer.MAX_VALUE / 10 || (result == Integer.MAX_VALUE / 10 && digit > 7)) return 0;
            if (result < Integer.MIN_VALUE / 10 || (result == Integer.MIN_VALUE / 10 && digit < -8)) return 0;
            result = result * 10 + digit;
        }
        return result;
    }
}`;
    }

    if (formattedName.includes('valid parentheses')) {
      return `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
}`;
    }

    if (formattedName.includes('maximum subarray') || formattedName.includes('kadane')) {
      return `class Solution {
    public int maxSubArray(int[] nums) {
        int maxSum = nums[0];
        int currentSum = nums[0];
        for (int i = 1; i < nums.length; i++) {
            currentSum = Math.max(nums[i], currentSum + nums[i]);
            maxSum = Math.max(maxSum, currentSum);
        }
        return maxSum;
    }
}`;
    }

    if (formattedName.includes('binary search') || formattedName.includes('search')) {
      return `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`;
    }

    // Generic fallback with proper structure
    Logger.success(`[INTELLIGENT_FALLBACK]\t:${problemName}`);
    return `class Solution {
    public int solve() {
        // Intelligent fallback for ${problemName}
        // This is a placeholder that needs manual implementation
        return -1;
    }
}`;
  }

  #isValidJavaCode(code) {
    if (!code || code.trim().length === 0) return false;
    if (!code.includes('class Solution')) return false;
    if (!code.includes('{') || !code.includes('}')) return false;
    // Remove the strict TODO check since we want to allow some basic solutions
    // if (code.includes('TODO') || code.includes('implement manually')) return false;
    return true;
  }

  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get problem name from problem number using AI
  async getProblemNameByNumber(problemNumber) {
    try {
      const cacheKey = `legacy-problem-name-${problemNumber}`;
      
      const prompt = `What is the exact title/name of LeetCode problem number ${problemNumber}?

STRICT REQUIREMENTS:
1. Provide ONLY the problem title - no explanations, descriptions, or extra text
2. Use the exact title as it appears on LeetCode
3. Do not include the problem number in the response
4. Format: use proper capitalization and spacing
5. If you're not certain, provide the most likely title based on common LeetCode problems

Example format:
Input: Problem 1
Output: Two Sum

Input: Problem 2  
Output: Add Two Numbers

Problem Number: ${problemNumber}
Exact Problem Title:`;

      Logger.success(`[AI_FETCHING_NAME]\t\t:Getting name for problem #${problemNumber}`);
      
      const responseText = await this.#makeApiRequest(prompt, cacheKey);
      let problemName = responseText.trim();
      
      // Clean up the response
      problemName = problemName.replace(/^Problem \d+:\s*/i, '');
      problemName = problemName.replace(/^Output:\s*/i, '');
      problemName = problemName.replace(/^\d+\.\s*/, '');
      problemName = problemName.replace(/^["']|["']$/g, ''); // Remove quotes
      problemName = problemName.trim();
      
      Logger.success(`[AI_NAME_RESOLVED]\t\t:Problem ${problemNumber} = "${problemName}"`);
      return problemName;
      
    } catch (error) {
      Logger.error(`[AI_NAME_ERROR]\t\t:Failed to get name for problem ${problemNumber} - ${error.message}`);
      throw error;
    }
  }

  cleanJavaCode(rawCode) {
    if (!rawCode || rawCode.trim().length === 0) {
      return this.#generateIntelligentFallback('unknown', null, 'java');
    }

    let cleanCode = rawCode;

    // Remove markdown code blocks and formatting
    cleanCode = cleanCode.replace(/```java\s*/gi, '');
    cleanCode = cleanCode.replace(/```\s*/g, '');
    cleanCode = cleanCode.replace(/^\s*java\s*$/gim, ''); // Remove standalone 'java' lines
    
    // Remove common AI explanations and prefixes
    cleanCode = cleanCode.replace(/^.*?(?=(?:import|class\s+Solution))/is, '');
    cleanCode = cleanCode.replace(/Here's?\s+(?:the\s+)?(?:a\s+)?(?:complete\s+)?(?:Java\s+)?(?:solution|code|implementation).*?(?=(?:import|class\s+Solution))/is, '');
    
    // Extract everything from first import or class Solution to the end of the class
    let startIndex = -1;
    let endIndex = -1;
    
    // Find starting point (either import or class Solution)
    const importMatch = cleanCode.search(/^\s*import\s/im);
    const classMatch = cleanCode.search(/^\s*class\s+Solution\s*\{/im);
    
    if (importMatch !== -1 && (classMatch === -1 || importMatch < classMatch)) {
      startIndex = importMatch;
    } else if (classMatch !== -1) {
      startIndex = classMatch;
    }
    
    if (startIndex !== -1) {
      // Find the end of the class Solution block
      const fromStart = cleanCode.substring(startIndex);
      const lines = fromStart.split('\n');
      let braceCount = 0;
      let inClass = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.match(/^\s*class\s+Solution\s*\{/)) {
          inClass = true;
        }
        
        if (inClass) {
          // Count braces
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          
          // If we've closed all braces for the class, this is the end
          if (braceCount === 0 && line.includes('}')) {
            endIndex = startIndex + lines.slice(0, i + 1).join('\n').length;
            break;
          }
        }
      }
      
      if (endIndex !== -1) {
        cleanCode = cleanCode.substring(startIndex, endIndex);
      } else {
        cleanCode = cleanCode.substring(startIndex);
      }
    }
    
    // Clean up the extracted code
    cleanCode = cleanCode.trim();
    
    // Remove excessive comments but keep imports
    cleanCode = cleanCode.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    cleanCode = cleanCode.replace(/^\s*\/\/.*$/gm, ''); // Remove line comments
    
    // Clean up whitespace
    cleanCode = cleanCode.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
    cleanCode = cleanCode.replace(/\n\s*\n/g, '\n'); // Remove empty lines
    cleanCode = cleanCode.trim();
    
    // Final validation
    if (!cleanCode.includes('class Solution')) {
      Logger.error('[CODE_VALIDATION_FAILED]\t:No class Solution found in cleaned code');
      return this.#generateIntelligentFallback('validation-failed', null, 'java');
    }
    
    return cleanCode;
  }

  // Method to extract question number from problem name if possible
  static extractQuestionNumber(problemName) {
    // Try to extract number from problem name if it starts with digits
    const match = problemName.match(/^(\d+)/);
    return match ? match[1] : null;
  }

  // Method to format problem name for better AI understanding
  static formatProblemName(problemName) {
    // Convert kebab-case to proper title case
    return problemName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Method to handle rate limiting and retries
  static async handleRateLimit(retryAfter = 30) {
    Logger.success(`[RATE_LIMIT_WAIT]\t\t:Waiting ${retryAfter} seconds due to rate limit`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }

  // Check if error is recoverable
  static isRecoverableError(error) {
    const message = error.message.toLowerCase();
    return message.includes('quota') || 
           message.includes('rate limit') || 
           message.includes('429') ||
           message.includes('503') ||
           message.includes('network');
  }
}

export default GeminiAI;
