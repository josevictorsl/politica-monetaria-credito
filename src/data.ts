import snapshot from './data/research.json';
import type { Research, Country, Sample, Shock } from './types';

export const research = snapshot as Research;
export const base = import.meta.env.BASE_URL;
export const countries: Record<Country, string> = { BR: 'Brasil', US: 'Estados Unidos' };
export const samples: Record<Sample, string> = { full: 'Atualizada', historical: 'Histórica' };
export const shockLabels: Record<Shock, string> = { DI30: 'DI-30', DI90: 'DI-90', FF3: 'FF3' };
export const num = (value: number, digits = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
export const monthLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00Z`));
export const stars = (p: number) => p < .01 ? '***' : p < .05 ? '**' : p < .1 ? '*' : '';

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const fields = Object.keys(rows[0]);
  const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const text = '\uFEFF' + [fields.map(quote).join(';'), ...rows.map(row => fields.map(field => quote(row[field])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
