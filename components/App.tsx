"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import SearchModal from "./SearchModal";
import Chat from "./Chat";
import type { GenerationSummary } from "@/lib/types";

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<GenerationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadId, setLoadId] = useState<string | null>(null);
  const [convoKey, setConvoKey] = useState(0);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/generations");
      const j = await r.json();
      if (j.generations) setHistory(j.generations);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function newAd() {
    setLoadId(null);
    setActiveId(null);
    setConvoKey((k) => k + 1);
  }
  function openGeneration(id: string) {
    setLoadId(id);
    setActiveId(id);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        generations={history}
        activeId={activeId}
        onSelect={openGeneration}
        onNew={newAd}
        onSearch={() => setSearchOpen(true)}
        newActive={!activeId}
      />

      <main className="flex-1 min-w-0 py-2 pr-2">
        <div className="h-full overflow-hidden rounded-panel border border-line bg-panel">
          <Chat
            key={loadId ?? `new-${convoKey}`}
            loadId={loadId}
            onGenerated={(genId) => {
              setActiveId(genId);
              loadHistory();
            }}
          />
        </div>
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        generations={history}
        onSelect={(id) => openGeneration(id)}
        onNew={newAd}
      />
    </div>
  );
}
