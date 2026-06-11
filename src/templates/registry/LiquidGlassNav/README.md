---
id: "LiquidGlassNav"
description: "A premium Apple TV+ style fixed navigation bar with a heavy blur and subtle border."
---

# LiquidGlassNav
To use this component, place it outside your scroll container so it stays fixed.

## Props
- \`logoText\` (string, required): The brand name.
- \`links\` (Array<{label: string, href: string}>): Navigation links.

## Usage Example
\`\`\`tsx
import { LiquidGlassNav } from "./components/LiquidGlassNav";

export default function App() {
  return (
    <>
      <LiquidGlassNav 
        logoText="Aether" 
        links={[
          {label: "Movies", href: "#movies"},
          {label: "TV Serials", href: "#tv"}
        ]} 
      />
      <main>...</main>
    </>
  );
}
\`\`\`
