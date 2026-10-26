import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BrandWordmark } from "./BrandLogo";
import { palette, assets, vendor } from "@/lib/brand";
import type { LandingData } from "@/lib/landing";

/* eslint-disable @next/next/no-img-element */

// Exactly as they appear on thanksben.com, including which carry a dropdown caret.
const NAV: { label: string; caret?: boolean }[] = [
  { label: "Solutions", caret: true },
  { label: "How it works" },
  { label: "Customer Stories" },
  { label: "Pricing" },
  { label: "Resources", caret: true },
  { label: "Brokers" },
  { label: "Company", caret: true },
];

function Caret() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const slugOf = (domain: string) =>
  (domain || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every customer logo we hold in colour, for the marquee. Read once per render. */
function colourLogos(): string[] {
  try {
    return readdirSync(join(process.cwd(), "public", "logos", "color"))
      .filter((f) => f.endsWith(".png"))
      .sort();
  } catch {
    return [];
  }
}

function Arrow({ light = false }: { light?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke={light ? palette.primary : palette.onPrimary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Button({ children, variant = "solid" }: { children: React.ReactNode; variant?: "solid" | "ghost" }) {
  const solid = variant === "solid";
  return (
    <a href="#demo"
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14.5px] font-medium transition
        ${solid ? "bg-brand text-white hover:bg-branddeep" : "border border-brand/25 text-brand hover:bg-brand/5"}`}>
      {children}
      <Arrow light={!solid} />
    </a>
  );
}

function Check() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-[3px] shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={palette.primary} opacity="0.1" />
      <path d="M7.5 12.3l3 3 6-6.6" stroke={palette.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage({
  firmName,
  location,
  landing,
}: { firmName: string; location: string | null; landing: LandingData }) {
  const peers = landing.logos.filter((l) => l.name).slice(0, 6);
  const marquee = colourLogos();
  // Two passes of the same track make the scroll seamless; a short list is repeated
  // so the strip is always wider than the viewport.
  const reps = marquee.length ? Math.max(2, Math.ceil(14 / marquee.length)) : 0;
  const track = Array.from({ length: reps }, () => marquee).flat();

  return (
    <div className="min-h-screen bg-white font-ben text-ink antialiased">
      {/* ── nav ─────────────────────────────────────────────── */}
      {/* Measured against thanksben.com: 83px tall, white, logo 34px, links bold
          17px in #002924, "Login" in #4E7A70, and a 170x62 solid button at 12px
          radius. */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex h-[83px] max-w-[1600px] items-center gap-10 px-8 xl:px-12">
          <a href="#" aria-label={vendor.name} className="shrink-0">
            <BrandWordmark height={34} />
          </a>
          <nav className="hidden flex-1 items-center gap-8 xl:flex">
            {NAV.map((n) => (
              <a key={n.label} href="#"
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-[17px] font-bold leading-none text-brand transition hover:opacity-70">
                {n.label}
                {n.caret && <Caret />}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-7">
            <a href="#" className="hidden text-[17px] font-medium leading-none text-navmuted transition hover:text-brand sm:block">
              Login
            </a>
            <a href="#demo"
              className="inline-flex h-[62px] items-center justify-center rounded-[12px] bg-brand px-8 text-[17px] font-bold leading-none text-white transition hover:bg-branddeep">
              Book a demo
            </a>
          </div>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <img src={assets.landingHero} alt="" aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.38) 45%, rgba(255,255,255,0.92) 100%)" }} />
        <div className="relative mx-auto max-w-[1180px] px-6 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="max-w-[760px]">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-brand/15 bg-white/80 py-1.5 pl-1.5 pr-4 text-[13px] text-ink/75">
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">For</span>
              {firmName}{location ? ` · ${location}` : ""}
            </div>
            <h1 className="text-[clamp(2.4rem,6vw,4.1rem)] font-semibold leading-[1.04] tracking-[-0.025em] text-brand"
              style={{ textWrap: "balance" } as React.CSSProperties}>
              {landing.headline}
            </h1>
            <p className="mt-6 max-w-[620px] text-[clamp(1.05rem,2vw,1.2rem)] leading-relaxed text-ink/75">
              {landing.subhead}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button>Book a demo</Button>
              <Button variant="ghost">See {vendor.name} in action</Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── animated logo marquee ───────────────────────────── */}
      {track.length > 0 && (
        <section className="border-y border-black/5 bg-white py-12">
          <p className="mb-8 text-center text-[13.5px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Enterprises operating across 140+ countries choose {vendor.name}
          </p>
          <div className="marquee" aria-label={`Customers of ${vendor.name}`}>
            <div className="marquee-track">
              {/* duplicated once; the animation translates by exactly -50% */}
              {[0, 1].map((pass) => (
                <div className="marquee-group" key={pass} aria-hidden={pass === 1}>
                  {track.map((f, i) => (
                    // Not lazy: these sit inside a track translated by exactly -50%, so
                    // every image must contribute its width before the animation starts.
                    <img key={`${pass}-${i}`} src={`/logos/color/${f}`} alt={pass === 0 ? f.replace(/-/g, ".").replace(".png", "") : ""}
                      className="marquee-logo" decoding="sync" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── problem ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-6 py-20 md:py-28">
        <h2 className="max-w-[900px] text-[clamp(1.9rem,4.4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-brand"
          style={{ textWrap: "balance" } as React.CSSProperties}>
          {landing.problem}
        </h2>
        <p className="mt-5 max-w-[640px] text-[17px] leading-relaxed text-ink/65">
          Most benefits platforms weren&apos;t built for modern enterprise. One system, not five tools
          pretending to be one.
        </p>
      </section>

      {/* ── three pillars ───────────────────────────────────── */}
      <section className="border-y border-black/5 bg-[#FAFBF8]">
        <div className="mx-auto grid max-w-[1180px] gap-px bg-black/[0.06] px-6 py-0 md:grid-cols-3">
          {landing.points.map((p, i) => (
            <div key={p.title} className="bg-[#FAFBF8] px-0 py-12 md:px-8">
              <div className="mb-5 font-mono text-[12px] font-medium tracking-[0.1em] text-brand/45">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mb-3 text-[1.45rem] font-semibold tracking-[-0.015em] text-brand">{p.title}</h3>
              <p className="mb-6 text-[15.5px] leading-relaxed text-ink/70">{p.body}</p>
              <a href="#demo" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline">
                Explore {p.title.toLowerCase()} <Arrow light />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-[clamp(1.8rem,4vw,2.7rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-brand"
              style={{ textWrap: "balance" } as React.CSSProperties}>
              Other platforms added AI. {vendor.name} was built with it.
            </h2>
            <ul className="mt-8 flex flex-col gap-4">
              {[
                "Benefits data reconciled against payroll as it changes, not after payday.",
                "Eligibility rules that depend on other rules, resolved across entities and borders.",
                `An assistant trained on ${firmName}'s own policies, answering employees directly.`,
                "Answers bounded by your own documents, so nothing is invented about someone's cover.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15.5px] leading-relaxed text-ink/75"><Check />{t}</li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-[#F8F9F3] p-8">
            <img src={assets.benimals} alt="" className="w-full" />
          </div>
        </div>
      </section>

      {/* ── stats ───────────────────────────────────────────── */}
      <section className="border-y border-black/5 bg-brand text-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["140+", "countries covered by one programme"],
            ["98%", "retention since implementing Ben"],
            ["ISO 27001:2022", "zero non-conformities at last audit"],
            ["4.7", "average customer rating"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold tracking-[-0.02em]">{n}</div>
              <div className="mt-2 text-[14.5px] leading-snug text-white/65">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── peers matched to this prospect ──────────────────── */}
      {peers.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 py-20 md:py-24">
          <h2 className="text-[clamp(1.6rem,3.4vw,2.2rem)] font-semibold tracking-[-0.02em] text-brand">
            Organisations like {firmName} already run on {vendor.name}.
          </h2>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {peers.map((l) => {
              const file = `/logos/color/${slugOf(l.domain)}.png`;
              const has = existsSync(join(process.cwd(), "public", "logos", "color", `${slugOf(l.domain)}.png`));
              return (
                <span key={l.domain}
                  className="inline-flex items-center gap-2.5 rounded-full border border-black/8 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  {has
                    ? <img src={file} alt={l.name} className="h-5 w-auto max-w-[96px] object-contain" />
                    : <span className="text-[14.5px] font-medium text-ink/80">{l.name}</span>}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section id="demo" className="border-t border-black/5 bg-[#F8F9F3]">
        <div className="mx-auto max-w-[1180px] px-6 py-20 text-center md:py-28">
          <h2 className="mx-auto max-w-[720px] text-[clamp(1.9rem,4.4vw,2.9rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-brand"
            style={{ textWrap: "balance" } as React.CSSProperties}>
            Ready to see {vendor.name} in action, {firmName}?
          </h2>
          <p className="mx-auto mt-5 max-w-[540px] text-[17px] leading-relaxed text-ink/65">
            Real data. No firefighting. Benefits employees use. Most platforms promise one. Some promise two.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button>Book a demo</Button>
            <Button variant="ghost">See {vendor.name} in action</Button>
          </div>
        </div>
      </section>

      {/* ── footer ──────────────────────────────────────────── */}
      <footer className="bg-brand text-white/70">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <BrandWordmark variant="light" height={24} />
          <p className="text-[13px] leading-relaxed">
            © {new Date().getFullYear()} Thanks Ben LTD. Page generated for {firmName}.
          </p>
        </div>
      </footer>
    </div>
  );
}
