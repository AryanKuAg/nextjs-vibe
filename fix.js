const fs = require('fs');
const content = fs.readFileSync('src/lib/templates.ts', 'utf8');
const lines = content.split('\n');

for (let i = 1283; i <= 1570; i++) {
  let line = lines[i];
  
  if (i === 1283) {
    line = line.replace('Use `lucide- react` for icons.', 'Use \\`lucide-react\\` for icons.');
    line = line.replace('Use `lucide-react` for icons.', 'Use \\`lucide-react\\` for icons.');
  } else if (i === 1570 && line.trim() === '`') {
    // skip the last closing backtick
  } else {
    // replace any backtick not preceded by a backslash
    line = line.replace(/(?<!\\)`/g, '\\`');
  }
  lines[i] = line;
}

fs.writeFileSync('src/lib/templates.ts', lines.join('\n'));
console.log('Fixed backticks!');
