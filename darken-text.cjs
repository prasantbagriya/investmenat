const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    if (filePath.includes('PinLockScreen.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/\btext-slate-500\b/g, 'text-slate-700');
    content = content.replace(/\btext-slate-400\b/g, 'text-slate-500');
    
    content = content.replace(/\btext-gray-500\b/g, 'text-gray-700');
    content = content.replace(/\btext-gray-400\b/g, 'text-gray-500');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
