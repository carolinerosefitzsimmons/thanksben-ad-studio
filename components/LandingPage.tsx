import { existsSync } from "node:fs";
import { join } from "node:path";
import { BrandWordmark } from "./BrandLogo";
import type { LandingData } from "@/lib/landing";
import { palette, assets } from "@/lib/brand";

const NAV = ["Product", "Solutions", "Security", "Customers", "Company"];

function ArrowCircle({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.9)" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? palette.onPrimary : palette.primaryDeep} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

function BookDemo({ className = "" }: { className?: string }) {
  return (
    <a href="#" className={`inline-flex items-center gap-2.5 rounded-full bg-branddeep py-1.5 pl-5 pr-1.5 text-[14px] font-medium text-white ${className}`}>
      Book a demo
      <ArrowCircle dark />
    </a>
  );
}

const logoSlug = (domain: string) => (domain || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function LandingPage({ firmName, location, landing }: { firmName: string; location: string | null; landing: LandingData }) {
  void location;
  const logos = landing.logos.filter((l) => l.name).slice(0, 6);
  return (
    <div className="min-h-screen bg-white font-sans text-[#1c1c1e]">
      {/* ------- Single view: hero + trusted-by (nothing below the logos) ------- */}
      <section className="flex min-h-screen flex-col">
        <div className="relative flex-1 overflow-hidden">
          {/* hero image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assets.landingHero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />

          {/* nav */}
          <nav className="absolute left-0 top-0 z-20 flex w-full items-center justify-between px-8 py-6 text-white">
            <div className="flex items-center gap-6 text-[14px] text-white/90">
              {NAV.map((n) => (
                <a key={n} href="#" className="hover:text-white">
                  {n}
                </a>
              ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2">
              <BrandWordmark variant="light" height={22} />
            </div>
            <div className="flex items-center gap-5 text-[14px]">
              <a href="#" className="text-white/90 hover:text-white">
                Log in
              </a>
              <BookDemo />
            </div>
          </nav>

          {/* hero copy — headline in REGULAR weight */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-16 text-center text-white">
            <h1 className="max-w-4xl text-[52px] font-normal leading-[1.03] tracking-[-0.02em] md:text-[64px]">{landing.headline}</h1>
            <div className="mt-6 flex items-center gap-5">
              <span className="text-[16px] text-white/85">{landing.subhead}</span>
              <BookDemo />
            </div>
          </div>
        </div>

        {/* trusted by — above the fold, real firm logos rendered as a cohesive monochrome strip */}
        <div className="shrink-0 border-t border-[#ececed] bg-white">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-10 gap-y-4 px-10 py-8">
            <span className="text-[13px] font-medium text-[#9a9aa2]">Trusted by</span>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-10 gap-y-5">
              {logos.map((l, i) => {
                const hasFile = existsSync(join(process.cwd(), "public", "logos", `${logoSlug(l.domain)}.png`));
                return hasFile ? (
                  <span key={i} className="flex items-center" title={l.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/logos/${logoSlug(l.domain)}.png`}
                      alt={l.name}
                      className="h-6 w-auto max-w-[160px] object-contain opacity-70"
                    />
                  </span>
                ) : (
                  <span key={i} className="text-[17px] font-semibold tracking-tight text-[#8a8a92]">
                    {l.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
