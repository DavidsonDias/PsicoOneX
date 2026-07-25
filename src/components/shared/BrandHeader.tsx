import { cn } from "@/lib/utils";

interface BrandHeaderProps {
  logoUrl?: string | null;
  clinicName?: string | null;
  subtitle?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable branded header showing the psychologist's logo (or clinic mark)
 * centered above documents, reports and patient-facing screens.
 */
export function BrandHeader({
  logoUrl,
  clinicName,
  subtitle,
  className,
  size = "md",
}: BrandHeaderProps) {
  if (!logoUrl && !clinicName) return null;

  const height =
    size === "sm" ? "h-12" : size === "lg" ? "h-24" : "h-16";

  return (
    <div className={cn("flex flex-col items-center text-center gap-2", className)}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={clinicName || "Logo"}
          className={cn(height, "w-auto object-contain")}
        />
      )}
      {clinicName && (
        <p className="document-ink font-semibold text-sm tracking-wide text-foreground">
          {clinicName}
        </p>
      )}
      {subtitle && (
        <p className="document-muted text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
