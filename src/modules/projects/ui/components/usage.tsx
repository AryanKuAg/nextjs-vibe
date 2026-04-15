import Link from "next/link";

import { useAuth } from "@clerk/nextjs";
import "remixicon/fonts/remixicon.css";


import { Button } from "@/components/ui/button";

interface Props {
  points: number;
};

export const Usage = ({ points }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });



  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      <div className="flex items-center gap-x-2">
        <div>
          <p className="text-sm">
            {points} {hasProAccess ? "": "free"} credits remaining
          </p>
        </div>
        {!hasProAccess && (
          <Button
            asChild
            size="sm"
            variant="tertiary"
            className="ml-auto"
          >
            <Link href="/pricing">
              <i className="ri-crown-line" /> Upgrade
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
