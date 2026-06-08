"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyInviteCodeProps = {
  inviteCode: string;
  leagueName: string;
};

export function CopyInviteCode({
  inviteCode,
  leagueName,
}: CopyInviteCodeProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(
      `Join my Cup Clash league "${leagueName}" using invite code: ${inviteCode}`
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copy code
        </>
      )}
    </Button>
  );
}