// Brand marks: wordmark (expanded sidebar) + icon mark (collapsed sidebar).
// REPLACE both SVG paths with your own; colours come from palette in lib/brand.ts.
import { vendor, palette } from "@/lib/brand";

export function BrandWordmark({
  className = "",
  fill = palette.primary,
  height = 20,
}: { className?: string; fill?: string; height?: number }) {
  return (
    <svg viewBox="0 0 1500 291" height={height} className={className} role="img" aria-label={vendor.name}>
      <path
        fill={fill}
        d="M0 4h57v230h118v53H0V4zm262 0h181v52H319v63h110v51H319v64h128v53H262V4zM548 4h66l108 171V4h55v283h-62L604 113v174h-56V4zm379 0h57v283h-57V4zm185 0h135c66 0 103 37 103 97 0 44-20 74-57 88l62 98h-66l-53-88h-67v88h-57V4zm57 52v81h72c32 0 48-14 48-41 0-26-16-40-48-40h-72z"
      />
    </svg>
  );
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" height="22" width="22" className={className} role="img" aria-label={vendor.name}>
      <path
        fill={palette.primary}
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      />
    </svg>
  );
}
