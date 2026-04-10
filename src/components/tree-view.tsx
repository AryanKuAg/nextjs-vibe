import { useState } from "react";
import { TreeItem } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Material Icon Theme by Philipp Kief (MIT License)
// https://github.com/PKief/vscode-material-icon-theme
const CDN = "https://cdn.jsdelivr.net/npm/material-icon-theme@5.22.0/icons";

function getMaterialIcon(filename: string, isFolder = false, isOpen = false): string {
  if (isFolder) {
    const folderName = filename.toLowerCase();
    const folderMap: Record<string, string> = {
      src: "folder-src",
      components: "folder-components",
      pages: "folder-views",
      views: "folder-views",
      lib: "folder-lib",
      utils: "folder-utils",
      store: "folder-redux",
      stores: "folder-redux",
      hooks: "folder-hook",
      assets: "folder-images",
      images: "folder-images",
      public: "folder-public",
      styles: "folder-styles",
      css: "folder-styles",
      types: "folder-typescript",
      data: "folder-database",
      api: "folder-api",
      server: "folder-server",
      config: "folder-config",
      layout: "folder-layout",
      layouts: "folder-layout",
      sections: "folder-components",
      ui: "folder-ui",
    };
    const key = folderMap[folderName];
    if (key) return isOpen ? `${CDN}/${key}-open.svg` : `${CDN}/${key}.svg`;
    return isOpen ? `${CDN}/folder-open.svg` : `${CDN}/folder.svg`;
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const lower = filename.toLowerCase();

  // Per-filename overrides (special config files)
  const nameMap: Record<string, string> = {
    "vite.config.ts": "vite",
    "vite.config.js": "vite",
    "tailwind.config.js": "tailwind",
    "tailwind.config.ts": "tailwind",
    "postcss.config.js": "postcss",
    "postcss.config.ts": "postcss",
    "tsconfig.json": "tsconfig",
    "tsconfig.app.json": "tsconfig",
    "tsconfig.node.json": "tsconfig",
    "package.json": "nodejs",
    "package-lock.json": "nodejs",
    ".eslintrc": "eslint",
    ".eslintrc.js": "eslint",
    ".eslintrc.json": "eslint",
    "eslint.config.js": "eslint",
    "eslint.config.ts": "eslint",
    ".gitignore": "git",
    ".gitattributes": "git",
    "index.html": "html",
    "index.css": "css",
    ".env": "dotenv",
    ".env.local": "dotenv",
    ".env.example": "dotenv",
    "readme.md": "readme",
    "README.md": "readme",
  };

  if (nameMap[lower]) return `${CDN}/${nameMap[lower]}.svg`;
  if (nameMap[filename]) return `${CDN}/${nameMap[filename]}.svg`;

  // Extension map
  const extMap: Record<string, string> = {
    tsx: "react_ts",
    jsx: "react",
    ts: "typescript",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    jsonc: "json",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    html: "html",
    htm: "html",
    svg: "svg",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    ico: "image",
    md: "markdown",
    mdx: "mdx",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    prisma: "prisma",
    graphql: "graphql",
    gql: "graphql",
    lock: "lock",
  };

  const icon = extMap[ext] || "file";
  return `${CDN}/${icon}.svg`;
}

interface TreeViewProps {
  data: TreeItem[];
  value?: string | null;
  onSelect?: (value: string) => void;
};

export const TreeView = ({
  data,
  value,
  onSelect,
}: TreeViewProps) => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 flex flex-col gap-0.5">
        {data.map((item, index) => (
          <Tree
            key={index}
            item={item}
            selectedValue={value}
            onSelect={onSelect}
            parentPath=""
          />
        ))}
      </div>
    </div>
  )
};

interface TreeProps {
  item: TreeItem;
  selectedValue?: string | null;
  onSelect?: (value: string) => void;
  parentPath: string;
};

const Tree = ({ item, selectedValue, onSelect, parentPath }: TreeProps) => {
  const [name, ...items] = Array.isArray(item) ? item : [item];
  const currentPath = parentPath ? `${parentPath}/${name}` : name;

  if (!items.length) {
    const isSelected = selectedValue === currentPath;
    const iconUrl = getMaterialIcon(name);

    return (
      <button
        onClick={() => onSelect?.(currentPath)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md text-left transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="w-4 h-4 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `${CDN}/file.svg`; }} />
        <span className="truncate">{name}</span>
      </button>
    )
  }

  // It's a folder
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            <ChevronDownIcon 
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground",
                isOpen ? "rotate-0" : "-rotate-90"
              )} 
            />
            {/* Folder icon: VS Code style icons from CDN */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMaterialIcon(name, true, isOpen)}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = `${CDN}/folder${isOpen ? '-open' : ''}.svg`; }}
            />
            <span className="truncate">{name}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-4 flex flex-col gap-0.5 mt-0.5">
            {items.map((subItem, index) => (
              <Tree
                key={index}
                item={subItem}
                selectedValue={selectedValue}
                onSelect={onSelect}
                parentPath={currentPath}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
