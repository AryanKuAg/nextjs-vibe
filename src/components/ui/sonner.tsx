"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      style={
        {
          "--normal-bg": "var(--grey-bg)",
          "--normal-text": "var(--white)",
          "--normal-border": "var(--white-12)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
