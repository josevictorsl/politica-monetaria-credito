import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Info, Lightbulb } from 'lucide-react';
import type { Data, Layout } from 'plotly.js';
import { base, research } from '../data';
import Chart from '../components/Chart';

const palette = ['#326658', '#a87747', '#486c99', '#7c6085'];

function chartFor(figure: (typeof research.motivation)[number]): { data: Data[]; layout: Partial<Layout>; height: number } {
  const spec = figure.chart;
  const data: Data[] = spec.series.map((series, index) => {
    if (spec.kind === 'bar') {
      return { type: 'bar', orientation: 'h', name: series.label, x: series.points.map(p => Number(p.x)), y: series.points.map(p => String(p.y)), marker: { color: series.points.map(p => p.color || palette[index % palette.length]) }, text: series.points.map(p => p.text || `${p.y} · ${Number(p.x).toFixed(2)}`), hovertemplate: '%{text}<extra></extra>' };
    }
    return { type: 'scatter', mode: 'lines', name: series.label, x: series.points.map(p => p.x), y: series.points.map(p => Number(p.y)), line: { color: palette[index % palette.length], width: 2.2 }, ...(spec.kind === 'area' ? { fill: index === 0 ? 'tozeroy' : 'tonexty', fillcolor: index === 0 ? 'rgba(50,102,88,.16)' : 'rgba(168,119,71,.18)' } : {}), text: series.points.map(p => p.text || `${series.label}<br>${p.x}<br>${Number(p.y).toFixed(2)}`), hovertemplate: '%{text}<extra></extra>' };
  });
  const shapes = (spec.markers || []).map(marker => ({ type: 'line' as const, x0: marker, x1: marker, y0: 0, y1: 1, xref: 'x' as const, yref: 'paper' as const, line: { color: '#8c6948', width: 1, dash: 'dot' as const }, layer: 'below' as const }));
  const layout: Partial<Layout> = {
    margin: { l: spec.kind === 'bar' ? 132 : 56, r: 24, t: 15, b: 65 },
    showlegend: spec.series.length > 1,
    legend: { orientation: 'h', x: 0, y: 1.15, font: { size: 10 } },
    dragmode: spec.kind === 'bar' ? false : 'zoom',
    xaxis: spec.kind === 'bar'
      ? { title: { text: spec.xTitle, standoff: 13 }, gridcolor: '#e7e9e1', rangemode: 'tozero' }
      : { title: { text: spec.xTitle, standoff: 13 }, type: spec.xTitle === 'Data' ? 'date' : 'linear', gridcolor: '#e7e9e1', zeroline: false },
    yaxis: spec.kind === 'bar'
      ? { title: { text: spec.yTitle }, autorange: 'reversed', tickfont: { size: 10 }, showgrid: false }
      : { title: { text: spec.yTitle, standoff: 10 }, gridcolor: '#e7e9e1', rangemode: spec.kind === 'area' ? undefined : 'normal', ...(spec.kind === 'area' ? { range: [0, 100] } : {}) },
    shapes,
  };
  return { data, layout, height: spec.kind === 'bar' ? 380 : 360 };
}

export default function Motivation() {
  const [theme, setTheme] = useState('all');
  const themes = [...new Set(research.motivation.map(figure => figure.theme))];
  const figures = research.motivation.filter(figure => theme === 'all' || figure.theme === theme);
  return <section className="container page-section motivation-page">
    <div className="page-heading"><div><span className="eyebrow">CONTEXTO E MOTIVAÇÃO</span><h1>Por que investigar o repasse?</h1><p>Tamanho do mercado, spreads e regras de financiamento ajudam a entender a pergunta da pesquisa.</p></div><a className="button secondary" href="#/brasil">Explorar o crédito brasileiro <ArrowRight size={16} /></a></div>
    <aside className="reading-note motivation-note"><Info size={21} /><div><h3>O contexto que dá origem à pergunta.</h3><p>Estas são as sete figuras de motivação do estudo, atualizadas a partir do artigo de referência. Elas descrevem diferenças econômicas e institucionais; a identificação do repasse depende das surpresas monetárias e das regressões. Os dados não constituem uma demonstração causal dos mecanismos.</p></div></aside>
    <div className="filter-panel motivation-filter"><label>Gráficos por tema<select value={theme} onChange={e => setTheme(e.target.value)}><option value="all">Todos os gráficos de motivação</option>{themes.map(value => <option key={value}>{value}</option>)}</select></label><span aria-live="polite">{figures.length} {figures.length === 1 ? 'figura' : 'figuras'} · versão {research.meta.version}</span></div>
    <div className="motivation-gallery">{figures.map(figure => <article key={figure.id} className="motivation-figure">
      <div className="motivation-figure-heading"><div><span className="eyebrow">{figure.theme}</span><h2>{figure.title}</h2></div><a href={base + figure.image} className="text-link" target="_blank" rel="noreferrer">Ampliar figura <ArrowUpRight size={16} /></a></div>
      <p className="motivation-question">{figure.question}</p>
      <div className="motivation-chart"><Chart {...chartFor(figure)} downloadName={`motivacao-${figure.id}`} label={`${figure.title}. ${figure.chart.xTitle}; ${figure.chart.yTitle}. Valores consultáveis ao passar o cursor.`} /></div>
      <div className="motivation-interpretation"><Lightbulb size={18} /><div><strong>Como interpretar</strong><p>{figure.description}</p></div></div>
      <details className="motivation-source"><summary>Fonte, observações e materiais <Info size={16} /></summary><div className="motivation-source-content"><p><strong>Fonte:</strong> {figure.source}. {figure.note}</p><div className="motivation-actions"><a className="button secondary" href={base + figure.dataFile} download><ArrowDownToLine size={16} />Baixar dados da figura</a><a className="text-link" href={base + figure.image} target="_blank" rel="noreferrer">Ver figura original do estudo <ArrowUpRight size={15} /></a></div></div></details>
      {figure.id === 'composicao' && <a className="text-link motivation-detail-link" href="#/brasil">Ver a quebra por famílias, empresas e modalidade <ArrowRight size={16} /></a>}
    </article>)}</div>
    <div className="closing-card motivation-close"><div><span className="eyebrow">DO CONTEXTO À EVIDÊNCIA</span><h2>Como essas diferenças aparecem no repasse?</h2><p>Examine os coeficientes por país e modalidade, junto com os intervalos de confiança.</p></div><a className="button light" href="#/resultados">Explorar resultados <ArrowRight size={17} /></a></div>
  </section>;
}
