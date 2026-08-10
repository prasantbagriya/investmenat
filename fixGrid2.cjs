const fs = require('fs');
let c = fs.readFileSync('src/components/WorkspaceSuite.tsx', 'utf8');

c = c.replace(/className="grid grid-cols-1 gap-3"/g, 'className={`grid grid-cols-1 ${showCreateUI ? "md:grid-cols-2 items-start" : ""} gap-2`}');

fs.writeFileSync('src/components/WorkspaceSuite.tsx', c);
console.log('Fixed grids and stretching');
