export interface VaultClient {
  name: string;
  domain: string;
  logoUrl: string | null;
  practiceAreas: string[];
  industries: string[];
  geoCountry: string | null;
  geoRegion: string | null;
  tier: string | null;
}

export interface Specialty {
  name: string; // one of the prospect's segments
  industries: string[]; // client sectors it serves
  blurb?: string; // short description of their strength here
}

export interface Office {
  city: string;
  country: string;
}

export interface FirmResearch {
  firmName: string;
  firmDomain: string;
  location: string; // e.g. "London, United Kingdom"
  region: string | null; // coarse bucket: "UK & Ireland", "Nordics", etc.
  specialties: Specialty[];
  offices: Office[]; // selectable geographic markets (HQ first)
  summary: string;
}

export interface Ad {
  id: string;
  specialty: string;
  headline: string;
  subhead: string | null;
  imageUrl: string; // /api/ads/<id> — bytes live in object storage
  logos: { name: string; logoUrl: string | null }[];
}

export interface GenerationSummary {
  id: string;
  firmName: string | null;
  firmUrl: string;
  location: string | null;
  createdAt: string;
  adCount: number;
}
