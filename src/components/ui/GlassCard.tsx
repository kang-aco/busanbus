import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "green" | "none";
  onClick?: () => void;
  tabIndex?: number;
  role?: string;
  "aria-label"?: string;
}

export default function GlassCard({
  children,
  className = "",
  glowColor = "none",
  onClick,
  tabIndex,
  role,
  "aria-label": ariaLabel,
}: GlassCardProps) {
  const glowClass =
    glowColor === "blue"
      ? "neon-glow-blue"
      : glowColor === "green"
        ? "neon-glow-green"
        : "";

  return (
    <div
      className={cn("glass-card p-4", glowClass, className)}
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
