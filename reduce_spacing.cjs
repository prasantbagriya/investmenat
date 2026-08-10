const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const scalingMap = {
  '16': '8',
  '12': '6',
  '10': '5',
  '8': '4',
  '6': '3',
  '5': '2',
  '4': '2',
  '3': '1',
  '2': '1'
};

const regex = /\b(p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr|gap|space-x|space-y)-(16|12|10|8|6|5|4|3|2)\b/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  
  const newContent = content.replace(regex, (match, prefix, val) => {
    changed = true;
    return `${prefix}-${scalingMap[val]}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated spacing in: ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting spacing reduction...');
traverse(srcDir);
console.log('Done!');
