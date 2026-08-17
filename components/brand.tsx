import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "md" | "lg";
}) {
  const imgSize = size === "lg" ? "h-16" : "h-8";
  const text = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showText && (
        <Link
          href="/"
          className={cn(
            "font-display font-bold tracking-tight hover:underline",
            text,
          )}
        >
          <img src="/nido_logo_recortado.webp" alt="Nido" className={imgSize} />
        </Link>
      )}
    </span>
  );
}
