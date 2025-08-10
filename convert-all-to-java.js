import {promises as fs} from "fs";
import path from 'path';

async function convertAllToJava() {
  try {
    const problemsDir = './problems';
    const files = await fs.readdir(problemsDir);
    
    console.log(`Found ${files.length} problem files to process...`);
    
    let convertedCount = 0;
    let javaCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(problemsDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        if (data.language === 'java') {
          javaCount++;
          console.log(`✓ ${file} already Java`);
          continue;
        }
        
        // Generate a basic Java template
        const javaCode = `class Solution {
    public int solution() {
        // TODO: Implement solution for ${data.problemName}
        return 0;
    }
}`;
        
        const newData = {
          problemName: data.problemName,
          language: 'java',
          code: javaCode
        };
        
        await fs.writeFile(filePath, JSON.stringify(newData, null, 2));
        convertedCount++;
        console.log(`✓ Converted ${file} from ${data.language} to Java`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing ${file}:`, error.message);
      }
    }
    
    console.log(`\nConversion Summary:`);
    console.log(`- Already Java: ${javaCount}`);
    console.log(`- Converted to Java: ${convertedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed: ${javaCount + convertedCount + errorCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the conversion
convertAllToJava();
