import { useMemo } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import type { Data, Layout } from 'plotly.js';
import Chart from '../components/Chart';
import { dateLabel, num, research, shockLabels } from '../data';
import type { BrazilShock } from '../types';

const source = research.brazilRobustness;
const methods = ['HC0', 'HC3', 'HAC · 4 defasagens'];

export default function Robustness({ params, navigate }: { params: URLSearchParams; navigate: (next: string) => void }) {
  const shock: BrazilShock = params.get('choque') === 'DI30' ? 'DI30' : 'DI90';
  const series = params.get('serie') || 'Crédito livre: empresas';
  const seriesLabels = [...new Set(source.comparisons.map(r => r.series))];
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    navigate('/robustez?' + next.toString());
  };
  const comparisons = source.comparisons.filter(r => r.shock === shock && r.series === series);
  const rollingLabel = series === 'Crédito livre: famílias' ? 'Crédito livre · famílias' : series === 'Crédito livre: empresas' ? 'Crédito livre · empresas' : null;
  const selectedRolling = rollingLabel ? source.rolling.find(r => r.label === rollingLabel && r.shock === shock) : undefined;
  const forest = useMemo(() => {
    const data: Data[] = [{
      type: 'scatter', mode: 'markers', name: 'Estimativa',
      x: comparisons.map(r => r.beta), y: comparisons.map(r => methods.indexOf(r.method)),
      marker: { color: ['#326658', '#486c99', '#a87747'], size: 11, symbol: ['circle', 'diamond', 'square'] },
      error_x: { type: 'data', array: comparisons.map(r => 1.96 * r.se), visible: true, thickness: 1.5, width: 5, color: '#657469' },
      text: comparisons.map(r => `${r.series} · ${shockLabels[r.shock]}<br>${r.method}<br>β = ${num(r.beta)}<br>IC 95% aprox.: [${num(r.ciLow)}; ${num(r.ciHigh)}]<br>p = ${num(r.p, 3)} · N = ${r.n}`), hovertemplate: '%{text}<extra></extra>',
    }];
    const layout: Partial<Layout> = { margin: { l: 110, r: 24, t: 18, b: 68 }, showlegend: false, dragmode: false, xaxis: { title: { text: 'Coeficiente de repasse (β)', standoff: 16 }, gridcolor: '#e7e9e1', zeroline: false }, yaxis: { tickmode: 'array', tickvals: [0, 1, 2], ticktext: methods, range: [2.5, -.5], showgrid: false, zeroline: false }, shapes: [0, 1].map(value => ({ type: 'line' as const, x0: value, x1: value, y0: 0, y1: 1, xref: 'x' as const, yref: 'paper' as const, line: { color: value === 0 ? '#a9b0a4' : '#a87747', width: 1, dash: 'dot' as const }, layer: 'below' as const })) };
    return { data, layout };
  }, [comparisons]);
  const rolling = useMemo(() => {
    if (!selectedRolling) return null;
    const rows = selectedRolling.points;
    const data: Data[] = [
      { type: 'scatter', mode: 'lines', x: rows.map(r => r.date), y: rows.map(r => r.high), line: { width: 0 }, hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', mode: 'lines', x: rows.map(r => r.date), y: rows.map(r => r.low), line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(50,102,88,.14)', hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', mode: 'lines', name: 'Beta em janela móvel', x: rows.map(r => r.date), y: rows.map(r => r.beta), line: { color: '#326658', width: 2 }, text: rows.map(r => `${selectedRolling.label}<br>${dateLabel(r.date)}<br>β = ${num(r.beta)}<br>IC 95% HC3: [${num(r.low)}; ${num(r.high)}]`), hovertemplate: '%{text}<extra></extra>' },
    ];
    const layout: Partial<Layout> = { margin: { l: 58, r: 20, t: 15, b: 70 }, showlegend: false, dragmode: 'zoom', xaxis: { type: 'date', title: { text: 'Data final da janela de estimação', standoff: 15 }, gridcolor: '#e7e9e1' }, yaxis: { title: { text: 'Beta móvel · janela de 60 reuniões' }, gridcolor: '#e7e9e1', zeroline: false }, shapes: [0, 1].map(value => ({ type: 'line' as const, x0: 0, x1: 1, y0: value, y1: value, xref: 'paper' as const, yref: 'y' as const, line: { color: value === 0 ? '#a9b0a4' : '#a87747', width: 1, dash: 'dot' as const }, layer: 'below' as const })) };
    return { data, layout };
  }, [selectedRolling]);
  const structural = source.structural.filter(r => r.shock === shock && (r.series === series || r.series === 'Crédito livre' || r.series === 'Crédito direcionado'));
  return <section className="container page-section robustness-page">
    <div className="page-heading"><div><span className="eyebrow">SENSIBILIDADE E ESTABILIDADE</span><h1>O que resiste a outras escolhas?</h1><p>Compare erros-padrão, acompanhe janelas móveis e consulte os testes de quebra já estimados.</p></div></div>
    <aside className="reading-note"><Info size={21} /><div><h3>O coeficiente e sua inferência são coisas distintas.</h3><p>HC0, HC3 e HAC usam o mesmo coeficiente estimado e ajustam o cálculo da incerteza. As janelas móveis reestimam o modelo em períodos que avançam no tempo; os pontos variam, mas isso não equivale, por si só, a um teste de quebra.</p></div></aside>
    <div className="filter-panel robustness-filters"><div className="filter-grid two"><label>Segmento estimado<select value={series} onChange={e => update({ serie: e.target.value })}>{seriesLabels.map(label => <option key={label}>{label}</option>)}</select></label><label>Medida de surpresa<select value={shock} onChange={e => update({ choque: e.target.value })}><option value="DI90">DI-90</option><option value="DI30">DI-30</option></select></label></div></div>
    <section className="robust-block"><div className="section-heading"><span className="eyebrow">01 / INFERÊNCIA</span><h2>A precisão muda com o estimador?</h2><p>O ponto é o mesmo; barras horizontais mostram intervalos aproximados de 95% a partir de cada erro-padrão robusto.</p></div><article className="chart-card robustness-chart"><div className="robust-legend">{methods.map((method, i) => <span key={method}><i className={`method-${i}`} />{method}</span>)}</div><Chart {...forest} height={290} downloadName={`robustez-${shock}-${series.replaceAll(' ', '-')}`} label={`Comparação do coeficiente ${series} com ${shockLabels[shock]} sob erros-padrão HC0, HC3 e HAC.`} /><p className="chart-footnote">P-valores das regressões originais. Intervalos desenhados por aproximação normal (β ± 1,96 × erro-padrão); eles não substituem o teste t usado para os p-valores. Testes são contra β = 0.</p></article>
      <div className="table-wrap robustness-table robustness-errors-table" tabIndex={0} aria-label="Robustez dos erros-padrão"><table><caption className="sr-only">Estimativas e inferência por tipo de erro-padrão</caption><thead><tr><th scope="col">Inferência</th><th scope="col">β</th><th scope="col">Erro-padrão</th><th scope="col">p-valor</th><th scope="col">N</th></tr></thead><tbody>{comparisons.map(r => <tr key={r.method}><th scope="row">{r.method}</th><td className="numeric">{num(r.beta)}</td><td className="numeric">{num(r.se)}</td><td className="numeric">{num(r.p, 3)}</td><td className="numeric">{r.n}</td></tr>)}</tbody></table></div>
    </section>
    {selectedRolling && rolling && <section className="robust-block"><div className="section-heading"><span className="eyebrow">02 / ESTABILIDADE VISUAL</span><h2>Como variam as estimativas no tempo?</h2><p>Cada ponto usa uma janela móvel de {selectedRolling.window} reuniões. A faixa acompanha o intervalo de 95% HC3 calculado no estudo.</p></div><article className="chart-card robustness-chart"><Chart {...rolling} height={390} downloadName={`janelas-moveis-${shock}-${selectedRolling.seriesKey.replaceAll(' ', '-')}`} label={`Coeficiente móvel ${shockLabels[shock]} para ${selectedRolling.label}, com intervalos HC3 de 95%.`} /><p className="chart-footnote">As janelas se sobrepõem e são estatisticamente dependentes. Oscilações pontuais não constituem teste de quebra. Arraste para ampliar; dois cliques restauram a escala.</p></article></section>}
    <section className="robust-block"><div className="section-heading"><span className="eyebrow">03 / TESTE FORMAL</span><h2>O teste de Chow rejeita estabilidade?</h2><p>O teste compara coeficientes antes e depois de 2020. A tabela preserva o p-valor de Chow e o teste conjunto de Wald robusto HC0.</p></div><div className="table-wrap structural-table" tabIndex={0}><table><caption className="sr-only">Testes de estabilidade estrutural brasileira no corte de 2020</caption><thead><tr><th scope="col">Série</th><th scope="col">p · Chow</th><th scope="col">p · Wald HC0</th><th scope="col">N</th><th scope="col">Leitura</th></tr></thead><tbody>{structural.map(r => <tr key={r.series}><th scope="row">{r.series}</th><td className="numeric">{num(r.p, 3)}</td><td className="numeric">{num(r.waldP, 3)}</td><td className="numeric">{r.n}</td><td>{r.reject ? 'Rejeita a 5%' : 'Não rejeita a 5%'}</td></tr>)}</tbody></table></div><p className="caption">Não rejeitar estabilidade não prova que o coeficiente seja constante; o poder dos testes para mudanças específicas é limitado.</p></section>
    <div className="credit-end-links"><a className="text-link" href={`#/resultados?pais=BR&choque=${shock}`}>Ver resultados principais <ArrowRight size={16} /></a><a className="text-link" href="#/metodologia">Rever método e limites <ArrowRight size={16} /></a></div>
  </section>;
}
