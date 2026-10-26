"use client";

// Small inline spinner (kept dependency-free so it works inside buttons of any colour).
export default function Spinner() {
  return (
    <span
      className="spin inline-block rounded-full border-2 border-current border-t-transparent align-[-2px]"
      style={{ width: 15, height: 15 }}
      aria-label="loading"
    />
  );
}
