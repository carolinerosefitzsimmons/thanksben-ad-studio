export interface LegoraClient {
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
  name: string; // e.g. "M&A / Corporate"
  industries: string[]; // client sectors it serves
  blurb?: string; // short description of the firm's strength here
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
  imageDataUri: string; // data:image/png;base64,...
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
