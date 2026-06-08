"use client"

import type * as React from "react"
import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type SubmitButtonProps = {
  children: React.ReactNode
  pendingText?: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}

function SubmitButton({
  children,
  pendingText = "Please wait...",
  className,
  variant,
  size,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className={className}
      variant={variant}
      size={size}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export { SubmitButton }
