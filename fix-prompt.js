const fs = require('fs');

const promptRaw = fs.readFileSync('src/prompt.ts', 'utf8');

if (!promptRaw.includes("CRITICAL IMPORT RULE")) {
    let p = promptRaw.replace(
        "You are an expert frontend React engineer who is also a great UI/UX designer.",
        "You are an expert frontend React engineer who is also a great UI/UX designer.\n\n### CRITICAL IMPORT RULE:\nDo NOT use the `@/` path alias for any imports. Always use explicit relative paths (e.g. `./components/ScrollFrames`, `../components/Navbar`). The `@/` alias is NOT configured in the vite template."
    );
    fs.writeFileSync('src/prompt.ts', p);
    console.log("Updated prompt.ts");
} else {
    console.log("prompt.ts already updated");
}
