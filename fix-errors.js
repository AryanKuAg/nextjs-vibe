const fs = require('fs');

// 1. Fix hero_templates.json Framer Motion TS errors
const heroRaw = fs.readFileSync('src/lib/templates/hero_templates.json', 'utf8');
const heroTemplates = JSON.parse(heroRaw);
heroTemplates.forEach(t => {
  let p = t.prompt_template;
  // Replace array ease with standard easeOut to avoid TS number[] vs tuple issues
  p = p.replace(/ease: \[[\s\S]*?\]/g, 'ease: "easeOut"');
  p = p.replace(/ease `\[[\s\S]*?\]`/g, 'ease `"easeOut"`');
  // Add rule against @/ imports
  p += "\n\n### CRITICAL IMPORT RULE:\nDo NOT use the `@/` path alias for any imports. Always use explicit relative paths (e.g. `./components/ScrollFrames`, `../components/Navbar`).";
  t.prompt_template = p;
});
fs.writeFileSync('src/lib/templates/hero_templates.json', JSON.stringify(heroTemplates, null, 2));

// 2. Fix full_page_templates.json @/ import issues
const fullRaw = fs.readFileSync('src/lib/templates/full_page_templates.json', 'utf8');
const fullTemplates = JSON.parse(fullRaw);
fullTemplates.forEach(t => {
  let p = t.prompt_template;
  // Add rule against @/ imports
  if (!p.includes('CRITICAL IMPORT RULE')) {
      p += "\n\n### CRITICAL IMPORT RULE:\nDo NOT use the `@/` path alias for any imports. Always use explicit relative paths (e.g. `./components/ScrollFrames`, `../components/Navbar`).";
  }
  t.prompt_template = p;
});
fs.writeFileSync('src/lib/templates/full_page_templates.json', JSON.stringify(fullTemplates, null, 2));

console.log("Fixed templates!");
