const fs = require('fs');
const glob = require('glob'); // Might not be available, I will use recursive readdir

const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace alert("...") with toast.success or toast.error
  const alertRegex = /alert\((`[^`]+`|'[^']+'|"[^"]+"|.*?)\);?/g;
  
  content = content.replace(alertRegex, (match, inner) => {
    // Determine if it's an error message
    const isError = inner.toLowerCase().includes('error') || inner.toLowerCase().includes('fail') || inner.toLowerCase().includes('invalid') || inner.toLowerCase().includes('insufficient') || inner.toLowerCase().includes('please');
    
    if (isError) {
      return `toast.error(${inner});`;
    } else {
      return `toast.success(${inner});`;
    }
  });

  if (content !== originalContent) {
    // Add import if not present
    if (!content.includes("from 'react-hot-toast'") && !content.includes('from "react-hot-toast"')) {
      const importStmt = "import toast from 'react-hot-toast';\n";
      // Find last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLine + 1) + importStmt + content.slice(nextLine + 1);
      } else {
        content = importStmt + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('./src/components', processFile);
console.log('Done!');
