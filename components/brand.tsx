import { cn } from "@/lib/utils";
import Image from "next/image";
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
  const imgSize = "h-auto"
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
          <Image
            src="/nido_logo_recortado.webp"
            width={60}
            height={50}
            alt="Logo de Nido"
            className={imgSize}
          />
        </Link>
      )}
    </span>
  );
}
