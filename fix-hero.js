const fs = require('fs');

const rawFile = fs.readFileSync('src/lib/templates/hero_templates.json', 'utf8');

// The user pasted raw multiline text with unescaped quotes into prompt_template.
// We need to extract this raw string.

const lines = rawFile.split('\n');

// Find where prompt_template starts and ends
const startIdx = lines.findIndex(l => l.includes('"prompt_template": "'));
const endIdx = lines.length - 2; // right before "  }\n]"

let promptLines = lines.slice(startIdx, endIdx);

// The first line is: '    "prompt_template": "Build a password manager...'
promptLines[0] = promptLines[0].replace('    "prompt_template": "', '');
// The last line might have a trailing quote, but based on the file view it ends with '- Vite + TypeScript"'
if (promptLines[promptLines.length - 1].endsWith('"')) {
  promptLines[promptLines.length - 1] = promptLines[promptLines.length - 1].slice(0, -1);
}

let promptStr = promptLines.join('\n');

// 1. Replace the cloudfront URL with {{VIDEO_URL}}
promptStr = promptStr.replace(/https: \/\/d8j0ntlcm91z4\.cloudfront\.net.*?\.mp4/, '{{VIDEO_URL}}');

// 2. Append 3 new sections
const extraSections = `

---

### Features Section
- Background: \`var(--color-login-bg)\` (#F2F2EE).
- Layout: standard 3-column grid (\`grid-cols-1 md:grid-cols-3\`), max-width 1280px, centered.
- Content: 3 feature cards detailing "AES-256 Encryption", "Zero-Knowledge Architecture", and "Cross-Device Sync".
- Styling: Use Lucide icons (Shield, Key, RefreshCw) in accent color, bold headings, and subtle text.

---

### Pricing Section
- Background: White (\`#FFFFFF\`).
- Layout: 2-column flex or grid, centered. 
- Content: A "Free Forever" tier and a "Pro" tier ($4/mo). 
- Styling: Highlight the Pro tier with a subtle purple border (\`var(--color-accent)\`) and shadow. Include standard checkmark lists for features.

---

### Footer
- Background: \`var(--color-text)\` (#192837).
- Text color: White / Light Gray.
- Layout: Simple 4-column footer with links (Product, Company, Resources, Legal) and a bottom copyright row.`;

promptStr += extraSections;

// Now build the valid JSON
const fixedJson = [
  {
    id: "hero_password_manager",
    description: "A password manager landing page with a hero video background, slide-in mobile menu, and 3 content sections (features, pricing, footer) below the hero.",
    prompt_template: promptStr
  }
];

fs.writeFileSync('src/lib/templates/hero_templates.json', JSON.stringify(fixedJson, null, 2));
console.log("Fixed!");
