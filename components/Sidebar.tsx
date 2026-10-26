"use client";

import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { BrandWordmark, BrandMark } from "./BrandLogo";
import type { GenerationSummary } from "@/lib/types";

const ICON = { color: "#5b5b63" };

const CITY_CODES: Record<string, string> = {
  london: "LDN", "new york": "NYC", "hong kong": "HKG", paris: "PAR", frankfurt: "FRA",
  munich: "MUC", berlin: "BER", amsterdam: "AMS", brussels: "BRU", madrid: "MAD", barcelona: "BCN",
  milan: "MIL", rome: "ROM", dubai: "DXB", singapore: "SIN", tokyo: "TYO", "hong kong sar": "HKG",
  sydney: "SYD", melbourne: "MEL", toronto: "TOR", stockholm: "STO", oslo: "OSL", copenhagen: "CPH",
  helsinki: "HEL", dublin: "DUB", zurich: "ZRH", geneva: "GVA", vienna: "VIE", warsaw: "WAW",
  prague: "PRG", mumbai: "BOM", "new delhi": "DEL", delhi: "DEL", bengaluru: "BLR", shanghai: "SHA",
  beijing: "BJS", "washington": "DC", "washington, d.c.": "DC", "los angeles": "LA", chicago: "CHI",
  "san francisco": "SF", boston: "BOS", luxembourg: "LUX", lisbon: "LIS", "são paulo": "SAO",
};

function cityCode(location: string | null): string {
  if (!location) return "";
  const city = location.split(",")[0].trim().toLowerCase();
  if (CITY_CODES[city]) return CITY_CODES[city];
  return city.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
}

function SidebarPanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b5b63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
    </svg>
  );
}

export default function Sidebar({
  collapsed,
  onToggle,
  generations,
  activeId,
  onSelect,
  onNew,
  onSearch,
  newActive,
}: {
  collapsed: boolean;
  onToggle: () => void;
  generations: GenerationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSearch: () => void;
  newActive: boolean;
}) {
  const navItem = (key: string, icon: React.ReactNode, label: string, onClick: () => void, active = false) => (
    <button
      key={key}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg text-[13px] font-medium w-full ${
        collapsed ? "justify-center p-2" : "px-2.5 py-2"
      } ${active ? "bg-hover text-ink" : "text-ink hover:bg-hover"}`}
      title={label}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );

  return (
    <aside className="flex h-full flex-col shrink-0 bg-canvas transition-[width] duration-200 ease-out" style={{ width: collapsed ? 64 : 256 }}>
      {/* Brand + collapse toggle */}
      <div className="flex items-center justify-between h-14 px-3">
        {collapsed ? (
          <button onClick={onToggle} className="mx-auto rounded-lg p-1.5 hover:bg-hover" title="Expand sidebar">
            <BrandMark />
          </button>
        ) : (
          <>
            <div className="pl-1.5">
              <BrandWordmark />
            </div>
            <button onClick={onToggle} className="rounded-lg p-1.5 hover:bg-hover" title="Collapse sidebar">
              <SidebarPanelIcon />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="px-3 mt-1 flex flex-col gap-0.5">
        {navItem("new", <AddIcon sx={ICON} fontSize="small" />, "New ad", onNew, newActive)}
        {navItem("search", <SearchIcon sx={ICON} fontSize="small" />, "Search", onSearch)}
      </div>

      {/* History (expanded only) */}
      {!collapsed && (
        <>
          <div className="px-4 mt-5 mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Recents</div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {generations.length === 0 ? (
              <div className="px-2.5 py-2 text-[12.5px] leading-relaxed text-faint">No ads yet.</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {generations.map((g) => {
                  const active = g.id === activeId;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onSelect(g.id)}
                      title={g.firmName ?? g.firmUrl}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left ${active ? "bg-hover" : "hover:bg-hover"}`}
                    >
                      <span className={`truncate text-[13px] ${active ? "text-ink font-medium" : "text-sub"}`}>
                        {g.firmName ?? g.firmUrl}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] font-medium text-faint">{cityCode(g.location)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
