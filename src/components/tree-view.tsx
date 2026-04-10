import { TreeItem } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    // It's a file
    const isSelected = selectedValue === currentPath;

    return (
      <button
        onClick={() => onSelect?.(currentPath)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md text-left transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
      >
        <FileIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
      </button>
    )
  }

  // It's a folder
  return (
    <div>
      <Collapsible
        className="group/collapsible"
        defaultOpen
      >
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            <ChevronRightIcon className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            <FolderIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
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

