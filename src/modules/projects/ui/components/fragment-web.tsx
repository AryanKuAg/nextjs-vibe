import "remixicon/fonts/remixicon.css";
import { Fragment } from "@/generated/prisma/client";

interface Props {
  data: Fragment;
};

export function FragmentWeb({ data }: Props) {
  const displayUrl = data.deploymentUrl || data.sandboxUrl;

  return (
    <div className="flex flex-col w-full h-full">
      <iframe
        key={data.id}
        className="h-full w-full border-none"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={displayUrl}
      />
    </div>
  )
};