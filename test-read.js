const fs = require('fs');
const path = require('path');
const templatesDir = path.join(process.cwd(), "src", "templates");
let files = {};
const readDirRecursive = (dir) => {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      readDirRecursive(fullPath);
    } else {
      const relativePath = path.relative(templatesDir, fullPath);
      files[`src/${relativePath}`] = true;
    }
  }
};
readDirRecursive(templatesDir);
console.log(Object.keys(files));
