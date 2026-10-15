export type Country = 'BR' | 'US';
export type Sample = 'full' | 'historical';
export type Shock = 'DI30' | 'DI90' | 'FF3';

export interface Estimate {
  country: Country;
  seriesId: string;
  label: string;
  sample: Sample;
  shock: Shock;
  beta: number;
  se: number;
  p: number;
  n: number;
  r2: number;
  first: string;
  last: string;
  frequency: string;
  ciLow: number;
  ciHigh: number;
}

export interface MonetaryShock {
  country: Country;
  shock: Shock;
  date: string;
  value: number;
  extension: boolean;
}

export interface Research {
  meta: {
    version: string;
    publishedDate: string;
    title: string;
    author: string;
    confidence: string;
    sources: Record<string, string>;
  };
  estimates: Estimate[];
  shocks: MonetaryShock[];
  brazilCredit: {
    date: string;
    total: number;
    unit: string;
    branches: { id: Branch; label: string; value: number; shareTotal: number }[];
    details: CreditDetail[];
  };
  motivation: {
    id: string;
    theme: string;
    title: string;
    source: string;
    question: string;
    description: string;
    note: string;
    image: string;
    dataFile: string;
  }[];
}

export type Branch = 'livre_pf' | 'livre_pj' | 'dir_pf' | 'dir_pj';
export type BrazilShock = 'DI30' | 'DI90';
export interface CreditDetail {
  id: string;
  branch: Branch;
  label: string;
  value: number;
  shareTotal: number;
  shareBranch: number;
  residual: boolean;
  sgsCode: string;
  rateSeriesId: string | null;
  mapping: string;
  estimates: Record<BrazilShock, Pick<Estimate, 'beta' | 'se' | 'p' | 'n' | 'first' | 'last' | 'ciLow' | 'ciHigh'> | null>;
}
