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
}
