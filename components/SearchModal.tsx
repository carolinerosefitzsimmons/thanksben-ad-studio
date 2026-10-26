"use client";

import { useEffect, useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import type { GenerationSummary } from "@/lib/types";

export default function SearchModal({
  open,
  onClose,
  generations,
  onSelect,
  onNew,
}: {
  open: boolean;
  onClose: () => void;
  generations: GenerationSummary[];
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return generations;
    return generations.filter((g) =>
      `${g.firmName ?? ""} ${g.firmUrl ?? ""} ${g.location ?? ""}`.toLowerCase().includes(t),
    );
  }, [generations, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center fadein" role="dialog" aria-modal="true">
      {/* darkened backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose} />

      {/* modal card */}
      <div className="relative z-10 mt-[13vh] w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        {/* search header */}
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <SearchIcon sx={{ color: "#8a8a92" }} fontSize="small" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search firms…"
            className="flex-1 bg-transparent py-3.5 text-[15px] outline-none placeholder:text-faint"
          />
          <button onClick={onClose} className="rounded-md p-1 hover:bg-hover" title="Close (Esc)">
            <CloseIcon sx={{ color: "#8a8a92" }} fontSize="small" />
          </button>
        </div>

        {/* results */}
        <div className="max-h-[54vh] overflow-y-auto p-2">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] text-ink hover:bg-hover"
          >
            <AddIcon sx={{ color: "#5b5b63" }} fontSize="small" />
            New ad
          </button>

          {filtered.length > 0 && (
            <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">History</div>
          )}

          {filtered.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                onSelect(g.id);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-hover"
            >
              <ArticleOutlinedIcon sx={{ color: "#8a8a92" }} fontSize="small" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-ink">{g.firmName ?? g.firmUrl}</span>
                <span className="block truncate text-[12px] text-faint">
                  {g.adCount} ad{g.adCount === 1 ? "" : "s"}
                  {g.location && g.location !== "Unknown" ? ` · ${g.location}` : ""}
                </span>
              </span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-faint">
              {q.trim() ? "No matching firms." : "No ads yet — close this and enter a law firm URL."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
