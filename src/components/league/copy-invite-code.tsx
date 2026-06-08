"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyInviteCodeProps = {
  inviteCode: string;
  leagueName: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
};

export function CopyInviteCode({
  inviteCode,
  leagueName,
  size = "default",
  fullWidth = false,
}: CopyInviteCodeProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const message = `Join my Cup Clash league "${leagueName}" using invite code: ${inviteCode}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={handleCopy}
      className={fullWidth ? "w-full" : ""}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copy invite
        </>
      )}
    </Button>
  );
}