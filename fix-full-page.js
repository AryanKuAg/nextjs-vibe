const fs = require('fs');

const rawFile = fs.readFileSync('src/lib/templates/full_page_templates.json', 'utf8');
const templates = JSON.parse(rawFile);

templates.forEach(t => {
  let p = t.prompt_template;
  
  // Replace imports
  p = p.replace(
    /1\. `import CanvasScroll from '\.\/components\/CanvasScroll'`\n2\. `import Preloader from '\.\/components\/Preloader'`/g,
    "1. `import ScrollFrames from './components/ScrollFrames'`"
  );
  
  p = p.replace(
    /These components will handle the high-performance scroll-driven background automatically/g,
    "This component will handle the high-performance scroll-driven background (scrolly-video) automatically"
  );
  
  // Replace usage in App.tsx architecture
  p = p.replace(
    /- Render `<Preloader \/>` and `<CanvasScroll \/>` at the top level of your App component\./g,
    "- Render `<ScrollFrames />` at the top level of your App component. The background video URL for this site is `{{VIDEO_URL}}` (ScrollFrames will handle it internally)."
  );
  
  p = p.replace(
    /<Preloader \/>\n<CanvasScroll \/>/g,
    "<ScrollFrames />"
  );
  
  // Also fix any other CanvasScroll mentions
  p = p.replace(/CanvasScroll/g, "ScrollFrames");
  
  // Just to be safe, if we haven't injected {{VIDEO_URL}}, do it now.
  if (!p.includes('{{VIDEO_URL}}')) {
    p += "\n\n**Video Background:** The generated video URL for this session is `{{VIDEO_URL}}`. You do not need to use it directly, just ensure `<ScrollFrames />` is rendered at the root level.";
  }

  t.prompt_template = p;
});

fs.writeFileSync('src/lib/templates/full_page_templates.json', JSON.stringify(templates, null, 2));
console.log("Fixed full page templates!");
