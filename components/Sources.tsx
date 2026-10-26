"use client";

// Overlapping circular source logos (white ring; right-most stacked on top) + "N sources".
export default function Sources({
  logos,
  count,
  label = "sources",
}: {
  logos: { name: string; logoUrl: string | null }[];
  count?: number;
  label?: string;
}) {
  const shown = logos.filter((l) => l.logoUrl).slice(0, 5);
  if (!shown.length) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {shown.map((l, i) => (
          <div
            key={i}
            title={l.name}
            style={{ marginLeft: i === 0 ? 0 : -7, zIndex: i + 1 }}
            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.logoUrl!} alt={l.name} className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
      <span className="text-[12.5px] text-faint">
        {count ?? shown.length} {label}
      </span>
    </div>
  );
}
