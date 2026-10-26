// Brand marks, cut out of the official Ben logo plate and recoloured for transparent
// backgrounds. Two variants because the sidebar sits on a light surface and the
// landing-page nav sits over a gradient.
/* eslint-disable @next/next/no-img-element */
import { vendor, assets } from "@/lib/brand";

type Variant = "dark" | "light";

export function BrandWordmark({
  className = "",
  variant = "dark",
  height = 20,
}: { className?: string; variant?: Variant; height?: number }) {
  return (
    <img
      src={variant === "light" ? assets.wordmarkLight : assets.wordmark}
      alt={vendor.name}
      height={height}
      style={{ height, width: "auto" }}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}

export function BrandMark({
  className = "",
  variant = "dark",
  size = 22,
}: { className?: string; variant?: Variant; size?: number }) {
  return (
    <img
      src={variant === "light" ? assets.markLight : assets.mark}
      alt={vendor.name}
      width={size}
      height={size}
      style={{ height: size, width: "auto" }}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}
