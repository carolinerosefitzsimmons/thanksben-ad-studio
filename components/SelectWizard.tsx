"use client";

import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { FirmResearch } from "@/lib/types";

// Two-step, paginated selection card (Claude-style) that sits where the input would be.
export default function SelectWizard({
  firm,
  specialties,
  setSpecialties,
  markets,
  setMarkets,
  onGenerate,
}: {
  firm: FirmResearch;
  specialties: string[];
  setSpecialties: (v: string[]) => void;
  markets: number[];
  setMarkets: (v: number[]) => void;
  onGenerate: () => void;
}) {
  const [step, setStep] = useState(0);
  const toggle = (arr: any[], set: (v: any) => void, v: any) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const steps = [
    {
      title: "Select the specialism(s) to create ads for",
      hint: "Choose one or more — each is highlighted in the ad.",
      rows: firm.specialties.map((s) => ({
        key: s.name,
        title: s.name,
        sub: s.blurb || s.industries.join(", ") || undefined,
        selected: specialties.includes(s.name),
        onClick: () => toggle(specialties, setSpecialties, s.name),
      })),
      canAdvance: specialties.length > 0,
    },
    {
      title: "Select the market(s)",
      hint: "Each market becomes its own ad — that city's skyline and a local professional.",
      rows: firm.offices.map((o, i) => ({
        key: String(i),
        title: o.city + (o.country ? `, ${o.country}` : ""),
        sub: undefined,
        selected: markets.includes(i),
        onClick: () => toggle(markets, setMarkets, i),
      })),
      canAdvance: markets.length > 0,
    },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-line2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* header: question + pagination */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
        <div className="text-[14.5px] font-medium text-ink">{cur.title}</div>
        <div className="flex shrink-0 items-center gap-1 text-[12px] text-faint">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-md p-0.5 hover:bg-hover disabled:opacity-30" title="Back">
            <ChevronLeftIcon style={{ fontSize: 18 }} />
          </button>
          <span className="tabular-nums">
            {step + 1} of {steps.length}
          </span>
          <button onClick={() => cur.canAdvance && !last && setStep((s) => s + 1)} disabled={last || !cur.canAdvance} className="rounded-md p-0.5 hover:bg-hover disabled:opacity-30" title="Next">
            <ChevronRightIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* options (swipe between steps) */}
      <div key={step} className="swipe-in flex flex-col gap-1.5 px-2.5 pb-2">
        {cur.rows.map((r) => (
          <button
            key={r.key}
            onClick={r.onClick}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
              r.selected ? "border-[#005230]/45 bg-[#f1f6f3]" : "border-transparent hover:bg-hover"
            }`}
          >
            <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${r.selected ? "border-[#005230] bg-[#005230]" : "border-[#c4c4cc]"}`}>
              {r.selected && <CheckIcon style={{ fontSize: 12, color: "#fff" }} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] text-ink">{r.title}</span>
              {r.sub && <span className="block truncate text-[12.5px] text-faint">{r.sub}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* footer: primary action */}
      <div className="flex items-center justify-end border-t border-line px-4 py-3">
        <button
          onClick={() => (last ? onGenerate() : cur.canAdvance && setStep((s) => s + 1))}
          disabled={!cur.canAdvance}
          className="rounded-lg bg-ink px-4 py-2 text-[13.5px] font-medium text-white transition hover:bg-black disabled:opacity-40"
        >
          {last ? "Create ads" : "Continue"}
        </button>
      </div>
    </div>
  );
}
