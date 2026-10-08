import { useEffect, useMemo, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import Chart from './Chart';
import type { Estimate } from '../types';
import { num, samples, dateLabel } from '../data';

export default function Forest({ rows, compare }: { rows: Estimate[]; compare: boolean }) {
  const [compact, setCompact] = useState(window.matchMedia('(max-width: 560px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const labels = [...new Set(rows.map(r => r.label))];
  const chart = useMemo(() => {
    const labels = [...new Set(rows.map(r => r.label))];
    const data: Data[] = (['full', 'historical'] as const).filter(sample => rows.some(r => r.sample === sample)).map<Data>(sample => {
      const selected = rows.filter(r => r.sample === sample);
      return {
        type: 'scatter', mode: 'markers', name: samples[sample],
        x: selected.map(r => r.beta),
        y: selected.map(r => labels.indexOf(r.label) + (compare ? (sample === 'full' ? -.14 : .14) : 0)),
        marker: { size: 10, color: sample === 'full' ? '#326658' : '#a87747', symbol: sample === 'full' ? 'circle' : 'square' },
        error_x: { type: 'data', array: selected.map(r => 1.96 * r.se), visible: true, thickness: 1.6, width: 4, color: sample === 'full' ? '#326658' : '#a87747' },
        text: selected.map(r => `${r.label}<br>${samples[r.sample]} · β = ${num(r.beta)}<br>IC 95%: [${num(r.ciLow)}; ${num(r.ciHigh)}]<br>p = ${num(r.p, 3)} · N = ${r.n}<br>${dateLabel(r.first)} — ${dateLabel(r.last)}`),
        hovertemplate: '%{text}<extra></extra>',
      };
    });
    const layout: Partial<Layout> = {
      margin: { l: compact ? 125 : 202, r: compact ? 15 : 24, t: 18, b: 64 }, showlegend: false,
      xaxis: { title: { text: 'Coeficiente de repasse (β)', standoff: 16 }, zeroline: false, gridcolor: '#e7e9e1', ticks: 'outside', tickcolor: '#d4d8cf' },
      yaxis: { tickmode: 'array', tickvals: labels.map((_, i) => i), ticktext: labels.map(label => (compact ? label.replace('Crédito direcionado', 'Direcionado').replace('Crédito livre', 'Livre').replace('Crédito total', 'Total').replace('Commercial paper', 'CP').replace('Empréstimo pessoal', 'Emprést. pessoal').replace('Títulos corporativos', 'Corporativos') : label).replace(' · ', '<br>')), range: [labels.length - .5, -.5], showgrid: false, zeroline: false, tickfont: { size: compact ? 10 : 11 } },
      shapes: [0, 1].map(value => ({ type: 'line', x0: value, x1: value, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: value === 0 ? '#a9b0a4' : '#a87747', width: 1, dash: value === 0 ? 'solid' : 'dot' }, layer: 'below' })),
      annotations: [{ x: 1, y: 1, xref: 'x', yref: 'paper', text: 'β = 1', showarrow: false, yshift: 12, font: { size: 11, color: '#946b45' } }],
      dragmode: false,
    };
    return { data, layout };
  }, [rows, compare, compact]);

  return <Chart {...chart} height={Math.max(230, labels.length * (compare ? 58 : 44) + 96)} label="Coeficientes por modalidade, com intervalos de confiança de 95%. Os mesmos valores estão na tabela de resultados." />;
}
