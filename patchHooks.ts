const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'src', 'hooks');
const files = fs.readdirSync(hooksDir).filter(f => f.startsWith('use') && f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(hooksDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('import { setDoc, updateDoc, deleteDoc } from \'../firebase-sync\';')) {
    console.log(`Patching ${file}...`);
    
    // Replace setDoc
    content = content.replace(
      /const docRef = doc\(collection\(db, '([^']+)'\)\);\s+await setDoc\(docRef, ({[^}]+})\);/g,
      `try {\n      const docRef = doc(collection(db, '$1'));\n      await setDoc(docRef, $2);\n    } catch (err) {\n      console.error("Firestore setDoc failed, falling back to local storage:", err);\n      // Optimistic update should be handled by the UI or local storage fallback\n      throw err;\n    }`
    );
    
    fs.writeFileSync(filePath, content);
  }
}
console.log("Done");
