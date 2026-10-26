"use client";

import { useEffect, useRef, useState } from "react";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import LoadingDots from "./LoadingDots";
import Sources from "./Sources";
import SelectWizard from "./SelectWizard";
import type { Ad, FirmResearch, Office } from "@/lib/types";

type Phase = "empty" | "researching" | "selecting" | "generating" | "done";

function domainFromUrl(u: string): string {
  const s = u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return s.split("/")[0] || u.trim();
}


export default function Chat({ loadId, onGenerated }: { loadId: string | null; onGenerated: (genId: string) => void }) {
  const [phase, setPhase] = useState<Phase>("empty");
  const [url, setUrl] = useState("");
  const [firm, setFirm] = useState<FirmResearch | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [markets, setMarkets] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [ads, setAds] = useState<Ad[]>([]);
  const [remixing, setRemixing] = useState<Record<string, boolean>>({});
  const [genId, setGenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBottom = () => requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));

  useEffect(() => {
    if (!loadId) return;
    (async () => {
      setError(null);
      setPhase("researching");
      try {
        const r = await fetch(`/api/generations/${loadId}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        setFirm(j.generation);
        setAds(j.ads);
        setReasoning("");
        setGenId(loadId);
        setPhase("done");
      } catch (e) {
        setError((e as Error).message);
        setPhase("empty");
      }
    })();
  }, [loadId]);

  useEffect(() => {
    scrollBottom();
  }, [phase, ads, reasoning]);

  const chosenMarkets = (): Office[] => markets.map((i) => firm!.offices[i]).filter(Boolean);

  async function research() {
    if (!url.trim() || phase === "researching") return;
    setError(null);
    setFirm(null);
    setAds([]);
    setReasoning("");
    setPhase("researching");
    try {
      const res = await fetch("/api/research-stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok || !res.body) throw new Error("Research failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
      }
      const m = (acc.split("###DATA###")[1] || "").match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse research");
      const data = JSON.parse(m[0]) as FirmResearch;
      const f: FirmResearch = {
        ...data,
        firmDomain: domainFromUrl(url),
        offices: data.offices?.length ? data.offices : [{ city: data.location?.split(",")[0] || "HQ", country: "" }],
        specialties: data.specialties?.length ? data.specialties : [{ name: "Legal Services", industries: [] }],
      };
      setFirm(f);
      setSpecialties([]);
      setMarkets([]);
      setPhase("selecting");
    } catch (e) {
      setError((e as Error).message);
      setPhase("empty");
    }
  }

  async function streamRationale(mkts: Office[]) {
    try {
      const res = await fetch("/api/rationale-stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firm, selected: specialties, markets: mkts }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setReasoning((r) => r + dec.decode(value, { stream: true }));
      }
    } catch {
      /* ignore */
    }
  }

  async function generate() {
    if (!firm || !specialties.length || !markets.length) return;
    const mkts = chosenMarkets();
    setReasoning("");
    setPhase("generating");
    setError(null);
    streamRationale(mkts); // stream reasoning concurrently to mask the wait
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firm, selected: specialties, markets: mkts }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed");
      setAds(j.ads);
      setGenId(j.generationId);
      setPhase("done");
      onGenerated(j.generationId);
    } catch (e) {
      setError((e as Error).message);
      setPhase("selecting");
    }
  }

  async function remix(ad: Ad) {
    if (!firm) return;
    const [cityRaw, specialtyName] = ad.specialty.split(" · ");
    const city = (cityRaw || "").trim();
    const office = firm.offices?.find((o) => o.city === city);
    const market: Office = { city, country: office?.country || locationCountry(firm.location) || "" };
    setRemixing((m) => ({ ...m, [ad.id]: true }));
    try {
      const r = await fetch("/api/regenerate-ad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adId: ad.id, firm, specialtyName: (specialtyName || "").trim() || firm.specialties[0].name, market }),
      });
      const j = await r.json();
      if (r.ok) setAds((prev) => prev.map((a) => (a.id === ad.id ? j.ad : a)));
    } finally {
      setRemixing((m) => ({ ...m, [ad.id]: false }));
    }
  }

  function download(ad: Ad) {
    const a = document.createElement("a");
    a.href = ad.imageDataUri;
    a.download = `legora-${(firm?.firmDomain || "ad").replace(/\W+/g, "-")}-${ad.specialty.replace(/\W+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  /* ---------- Empty state ---------- */
  if (phase === "empty") {
    return (
      <div className="relative flex h-full flex-col items-center justify-center px-6">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(55% 45% at 50% 40%, rgba(0,0,0,0.022), transparent 70%)" }} />
        <div className="relative z-10 -mt-8 w-full max-w-2xl">
          <div className="flex justify-center">
            <img src="/legora-wordmark.svg" alt="Legora" draggable={false} className="w-[500px] max-w-[82%] select-none" />
          </div>
          {/* pulled up so the bottom quarter of the wordmark tucks behind this white card */}
          <div className="relative z-10 -mt-[20px] rounded-2xl border border-line2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && research()}
              placeholder="Enter a law firm URL  (e.g. linklaters.com)"
              className="w-full bg-transparent px-4 pt-4 pb-2 text-[15px] outline-none placeholder:text-faint"
              autoFocus
            />
            <div className="flex items-center justify-end px-3 pb-3 pt-1">
              <button onClick={research} disabled={!url.trim()} className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition disabled:opacity-30" title="Research firm">
                <ArrowUpwardIcon style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          {error && <div className="mt-4 text-center text-[13px] text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  const answered = phase === "generating" || phase === "done";

  /* ---------- Conversation ---------- */
  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="slidein mx-auto max-w-3xl px-6 py-8">
          {/* user: url */}
          <div className="mb-6 flex justify-end">
            <div className="rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14px] text-white">{firm?.firmDomain || url}</div>
          </div>

          {/* research: just the shimmer — no ticks/bullets */}
          {phase === "researching" && (
            <Assistant pulse>
              <div className="shimmer-text pt-0.5 text-[14px] font-medium">Researching {firm?.firmDomain || domainFromUrl(url)}…</div>
            </Assistant>
          )}

          {/* firm overview — single chat bubble, uniform text */}
          {firm && phase !== "researching" && (
            <Assistant>
              <div className="rounded-2xl rounded-tl-sm bg-[#eef0f1] px-4 py-3 text-[14px] leading-relaxed text-ink">
                {firm.firmName} — {firm.location}. {firm.summary}
              </div>
            </Assistant>
          )}

          {/* answered: static Q + A, streamed reasoning, then loaders / ads */}
          {answered && firm && (
            <>
              <Assistant>
                <div className="rounded-2xl rounded-tl-sm bg-[#eef0f1] px-4 py-3 text-[14px] leading-relaxed text-ink">
                  Which specialisms and markets should I use?
                </div>
              </Assistant>
              <div className="mb-6 flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14px] text-white">
                  {specialties.join(", ")}
                  {chosenMarkets().length ? ` — ${chosenMarkets().map((m) => m.city).join(", ")}` : ""}
                </div>
              </div>

              {reasoning && (
                <Assistant>
                  <div className="rounded-2xl rounded-tl-sm bg-[#eef0f1] px-4 py-3 text-[14px] leading-relaxed text-ink">
                    {reasoning}
                    {phase === "generating" && <span className="ml-0.5 inline-block h-4 w-[2px] -translate-y-[1px] animate-pulse bg-ink align-middle" />}
                  </div>
                </Assistant>
              )}

              {phase === "generating" && (
                <Assistant>
                  <div className="flex max-w-[480px] flex-col gap-6">
                    {chosenMarkets().map((_, i) => (
                      <LoadingDots key={i} />
                    ))}
                  </div>
                </Assistant>
              )}

              {phase === "done" && (
                <Assistant>
                  <div className="flex max-w-[480px] flex-col gap-7">
                    {ads.map((ad) => (
                      <div key={ad.id}>
                        {remixing[ad.id] ? (
                          <LoadingDots />
                        ) : (
                          <img src={ad.imageDataUri} alt={ad.headline} onLoad={scrollBottom} className="w-full rounded-xl border border-line" />
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          <IconBtn title="Download" onClick={() => download(ad)}><DownloadOutlinedIcon style={{ fontSize: 18 }} /></IconBtn>
                          <IconBtn title="Remix / retry" onClick={() => remix(ad)} disabled={remixing[ad.id]}><AutorenewOutlinedIcon style={{ fontSize: 18 }} /></IconBtn>
                          <span className="mx-2 h-4 w-px bg-line2" />
                          <Sources logos={ad.logos} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Assistant>
              )}

              {phase === "done" && genId && (
                <Assistant>
                  <div className="rounded-2xl rounded-tl-sm bg-[#eef0f1] px-4 py-3 text-[14px] leading-relaxed text-ink">
                    I&apos;ve also built a tailored landing page for {firm.firmName} — same copy and social proof, ready to share.
                  </div>
                  <a
                    href={`/lp/${genId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line2 bg-white px-3.5 py-2 text-[13.5px] font-medium text-ink hover:bg-hover"
                  >
                    View landing page ↗
                  </a>
                </Assistant>
              )}

              {error && <div className="mb-6 text-[13px] text-red-600">{error}</div>}
            </>
          )}
        </div>
      </div>

      {/* docked selection wizard — fixed at the bottom */}
      {phase === "selecting" && firm && (
        <div className="shrink-0 px-6 pb-6 pt-2">
          <div className="mx-auto max-w-3xl">
            <SelectWizard firm={firm} specialties={specialties} setSpecialties={setSpecialties} markets={markets} setMarkets={setMarkets} onGenerate={generate} />
            {error && <div className="mt-3 text-[13px] text-red-600">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function locationCountry(loc: string | null): string | null {
  if (!loc) return null;
  const parts = loc.split(",");
  return parts.length ? parts[parts.length - 1].trim() : loc;
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="rounded-lg p-1.5 text-sub transition hover:bg-hover disabled:opacity-40">
      {children}
    </button>
  );
}

function Assistant({ children, pulse = false }: { children: React.ReactNode; pulse?: boolean }) {
  return (
    <div className="mb-6 flex gap-3 fadein">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eaeaec]">
        <svg viewBox="0 0 24 24" width="15" height="15" className={pulse ? "softpulse" : ""}>
          <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" fill="#005230" />
        </svg>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </div>
  );
}

