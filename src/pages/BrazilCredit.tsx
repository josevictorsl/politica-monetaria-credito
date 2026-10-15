import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ChevronDown, Info } from 'lucide-react';
import type { Data, Layout } from 'plotly.js';
import Chart from '../components/Chart';
import { dateLabel, downloadCsv, monthLabel, num, research, shockLabels, stars } from '../data';
import type { Branch, BrazilShock, CreditDetail } from '../types';

const credit = research.brazilCredit;
const colors: Record<Branch, string> = { livre_pf: '#326658', livre_pj: '#a87747', dir_pf: '#486c99', dir_pj: '#7c6085' };
const branchLabel = (branch: Branch) => credit.branches.find(b => b.id === branch)!.label;
const wrap = (text: string, limit: number) => {
  const lines = [''];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    if (lines[last].length + word.length > limit && lines[last]) lines.push(word);
    else lines[last] += (lines[last] ? ' ' : '') + word;
  }
  return lines.join('<br>');
};

export default function BrazilCredit({ params, navigate }: { params: URLSearchParams; navigate: (next: string) => void }) {
  const requestedBranch = params.get('segmento');
  const branch: Branch | 'all' = credit.branches.some(b => b.id === requestedBranch) ? requestedBranch as Branch : 'all';
  const requestedDetail = params.get('modalidade') || '';
  const shock: BrazilShock = params.get('choque') === 'DI30' ? 'DI30' : 'DI90';
  const [compact, setCompact] = useState(window.matchMedia('(max-width: 560px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const change = () => setCompact(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    navigate('/brasil?' + next.toString());
  };
  const selected = useMemo(() => credit.details.filter(r => branch === 'all' || r.branch === branch), [branch]);
  const activeDetail = selected.find(r => r.id === requestedDetail) || null;
  const chooseDetail = (id: string) => update({ modalidade: id });
  const mapped = useMemo(() => selected.filter(r => r.estimates[shock] !== null).sort((a, b) => a.estimates[shock]!.beta - b.estimates[shock]!.beta), [selected, shock]);
  const unmapped = selected.filter(r => r.estimates[shock] === null).reduce((sum, r) => sum + r.shareTotal, 0);
  const bins = [
    { label: 'β ≤ 0', description: 'Estimativa não positiva', value: mapped.filter(r => r.estimates[shock]!.beta <= 0).reduce((s, r) => s + r.shareTotal, 0) },
    { label: '0 < β ≤ 1', description: 'Estimativa entre zero e um', value: mapped.filter(r => r.estimates[shock]!.beta > 0 && r.estimates[shock]!.beta <= 1).reduce((s, r) => s + r.shareTotal, 0) },
    { label: 'β > 1', description: 'Estimativa acima de um', value: mapped.filter(r => r.estimates[shock]!.beta > 1).reduce((s, r) => s + r.shareTotal, 0) },
    { label: 'Sem beta', description: 'Saldo não mapeado', value: unmapped },
  ];
  const binChart = useMemo(() => {
    const binColors = ['#8c6a5b', '#326658', '#a87747', '#bec5bb'];
    const data: Data[] = bins.map((bin, index) => ({ type: 'bar', orientation: 'h', name: bin.label, x: [bin.value], y: ['Saldo nacional'], marker: { color: binColors[index] }, text: [`${bin.label}<br>${num(bin.value)}% do saldo nacional`], hovertemplate: '%{text}<extra></extra>' }));
    const layout: Partial<Layout> = { barmode: 'stack', margin: { l: 8, r: 8, t: 8, b: 43 }, showlegend: true, legend: { orientation: 'h', x: 0, y: 1.45, font: { size: 10 } }, xaxis: { range: [0, 100], ticksuffix: '%', gridcolor: '#e7e9e1', title: { text: 'Participação no saldo total do Brasil', standoff: 11 } }, yaxis: { showticklabels: false, showgrid: false, zeroline: false } };
    return { data, layout };
  }, [bins.map(bin => bin.value).join('|')]);
  const compositionChart = useMemo(() => ({
    data: [{ type: 'pie', labels: credit.branches.map(b => b.label), values: credit.branches.map(b => b.value), hole: .70, sort: false, direction: 'clockwise', textinfo: 'none', marker: { colors: credit.branches.map(b => colors[b.id]), line: { color: '#fdfdf9', width: 3 } }, pull: credit.branches.map(b => b.id === branch ? .05 : 0), text: credit.branches.map(b => `${b.label}<br>${num(b.shareTotal)}% do saldo total<br>R$ ${num(b.value / 1000)} bilhões`), hovertemplate: '%{text}<extra></extra>' }] as Data[],
    layout: { margin: { l: 10, r: 10, t: 12, b: 12 }, showlegend: false, annotations: [{ text: `BRASIL<br><b>R$ ${num(credit.total / 1e6)} tri</b><br>${monthLabel(credit.date)}`, x: .5, y: .5, showarrow: false, font: { size: 13, color: '#172f3d' } }] } as Partial<Layout>,
  }), [branch]);
  const detailChart = useMemo(() => {
    const ordered = [...selected].sort((a, b) => b.value - a.value);
    const top = ordered.slice(0, 10).map(r => ({ id: r.id, label: r.label, value: r.value, shareTotal: r.shareTotal, shareBranch: r.shareBranch, color: colors[r.branch], segment: branchLabel(r.branch) }));
    if (ordered.length > 10) {
      const rest = ordered.slice(10);
      top.push({ id: 'rest', label: 'Demais modalidades e ajustes', value: rest.reduce((s, r) => s + r.value, 0), shareTotal: rest.reduce((s, r) => s + r.shareTotal, 0), shareBranch: rest.reduce((s, r) => s + r.shareBranch, 0), color: '#657469', segment: `${rest.length} modalidades/resíduos agrupados` });
    }
    const data: Data[] = [{ type: 'bar', orientation: 'h', x: top.map(r => r.shareTotal), y: top.map((_, i) => i), customdata: top.map(r => r.id === 'rest' ? null : r.id), marker: { color: top.map(r => r.color), opacity: top.map(r => r.id === requestedDetail ? 1 : .82), line: { color: top.map(r => r.id === requestedDetail ? '#172f3d' : 'rgba(0,0,0,0)'), width: top.map(r => r.id === requestedDetail ? 2 : 0) } }, textposition: 'none', text: top.map(r => `${r.label}<br>${r.segment}<br>${num(r.shareTotal)}% do saldo nacional${branch !== 'all' ? `<br>${num(r.shareBranch)}% do segmento` : ''}<br>R$ ${num(r.value / 1000)} bilhões${r.id === 'rest' ? '' : '<br>Clique para abrir a ficha da modalidade'}`), hovertemplate: '%{text}<extra></extra>', width: .54 }];
    const layout: Partial<Layout> = { margin: { l: compact ? 142 : 240, r: 22, t: 10, b: 65 }, showlegend: false, dragmode: false, xaxis: { title: { text: 'Participação no saldo total (%)', standoff: 14 }, gridcolor: '#e7e9e1', zerolinecolor: '#acb5a9', rangemode: 'tozero' }, yaxis: { tickmode: 'array', tickvals: top.map((_, i) => i), ticktext: top.map(r => wrap(r.label, compact ? 22 : 36)), range: [top.length - .5, -.5], tickfont: { size: compact ? 9 : 11 }, showgrid: false, zeroline: false } };
    return { data, layout, height: top.length * 47 + 85 };
  }, [selected, branch, compact, requestedDetail]);
  const distributionRows = useMemo(() => {
    const bothBetas = selected.flatMap(r => [r.estimates.DI30?.beta, r.estimates.DI90?.beta]).filter((v): v is number => v !== undefined);
    return { min: Math.min(...bothBetas), max: Math.max(...bothBetas) };
  }, [selected]);
  const distributions = useMemo(() => {
    const { min, max } = distributionRows;
    const padding = Math.max((max - min) * .06, .4);
    return (['DI30', 'DI90'] as const).map(horizon => {
      let cumulative = 0;
      const ordered = selected.filter(r => r.estimates[horizon] !== null).sort((a, b) => a.estimates[horizon]!.beta - b.estimates[horizon]!.beta).map(r => ({ ...r, cumulative: cumulative += r.shareTotal }));
      const data: Data[] = [{ type: 'scatter', mode: 'lines', name: 'Saldo acumulado', x: [min - padding, ...ordered.map(r => r.estimates[horizon]!.beta), max + padding], y: [0, ...ordered.map(r => r.cumulative), cumulative], line: { shape: 'hv', color: '#326658', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(50,102,88,.10)', hoverinfo: 'skip' }];
      for (const segment of credit.branches.filter(b => branch === 'all' || b.id === branch)) {
        const subset = ordered.filter(r => r.branch === segment.id);
        if (!subset.length) continue;
        data.push({ type: 'scatter', mode: 'markers', name: segment.label,
          x: subset.map(r => r.estimates[horizon]!.beta), y: subset.map(r => r.cumulative),
          customdata: subset.map(r => r.id), marker: { color: subset.map(r => colors[r.branch]), size: subset.map(r => 6 + Math.sqrt(r.shareTotal) * 3), opacity: subset.map(r => !requestedDetail || r.id === requestedDetail ? 1 : .35), symbol: subset.map(r => r.estimates[horizon]!.p < .05 ? 'circle' : r.estimates[horizon]!.p < .10 ? 'diamond' : 'circle-open'), line: { width: 1.5 } },
          text: subset.map(r => `${r.label}<br>${branchLabel(r.branch)}<br>β = ${num(r.estimates[horizon]!.beta)} · p = ${num(r.estimates[horizon]!.p, 3)}<br>Modalidade: ${num(r.shareTotal)}% do saldo total<br>Acumulado: ${num(r.cumulative)}% do saldo total<br>Mapeamento ${r.mapping}`), hovertemplate: '%{text}<extra></extra>' });
      }
      const layout: Partial<Layout> = { margin: { l: compact ? 50 : 65, r: 20, t: 25, b: 70 }, showlegend: false, dragmode: 'zoom', xaxis: { title: { text: `Coeficiente de repasse · ${shockLabels[horizon]}`, standoff: 16 }, range: [min - padding, max + padding], zeroline: false, gridcolor: '#e7e9e1' }, yaxis: { title: { text: 'Saldo acumulado (%)', standoff: 10 }, range: [0, 105], ticksuffix: '%', gridcolor: '#e7e9e1', zeroline: false }, shapes: [
        ...[0, 1].map(value => ({ type: 'line' as const, x0: value, x1: value, y0: 0, y1: 1, xref: 'x' as const, yref: 'paper' as const, line: { color: value === 0 ? '#a9b0a4' : '#a87747', width: 1, dash: 'dot' as const }, layer: 'below' as const })),
        { type: 'line', x0: 0, x1: 1, y0: 100, y1: 100, xref: 'paper', yref: 'y', line: { color: '#acb5a9', width: 1, dash: 'dash' }, layer: 'below' },
      ], annotations: [{ x: max + padding, y: cumulative, text: `${num(cumulative)}% mapeado`, showarrow: false, xanchor: 'right', yshift: -20, bgcolor: '#fdfdf9', font: { color: '#326658', size: 11 } }] };
      return { shock: horizon, coverage: cumulative, count: ordered.length, data, layout };
    });
  }, [selected, branch, compact, requestedDetail, distributionRows]);
  const exportSelection = () => downloadCsv(`distribuicao-brasil-${shock}-${branch}.csv`, selected.map(r => {
    const e = r.estimates[shock];
    return { referencia_saldo: credit.date, segmento: branchLabel(r.branch), modalidade: r.label, saldo_milhoes_reais: r.value, participacao_saldo_total_pct: r.shareTotal, participacao_segmento_pct: r.shareBranch, surpresa: shockLabels[shock], beta: e?.beta ?? '', erro_padrao_HC0: e?.se ?? '', p_valor: e?.p ?? '', observacoes: e?.n ?? '', primeira_reuniao: e?.first ?? '', ultima_reuniao: e?.last ?? '', ic95_inferior: e?.ciLow ?? '', ic95_superior: e?.ciHigh ?? '', mapeamento: r.mapping, serie_taxa: r.rateSeriesId ?? '', versao: research.meta.version };
  }));
  return <section className="container page-section brazil-page">
    <div className="page-heading"><div><span className="eyebrow">COMPOSIÇÃO E RELEVÂNCIA ECONÔMICA</span><h1>O crédito brasileiro, por dentro.</h1><p>Quem toma crédito, com quais recursos e em quais modalidades? Conecte o tamanho de cada segmento às estimativas de repasse.</p></div><a href="#/motivacao" className="button secondary">Ver a motivação <ArrowRight size={16} /></a></div>
    <div className="credit-reference"><span className="pill">SGS / BCB</span><span>Saldo de <strong>{monthLabel(credit.date)}</strong></span><span>Betas da <strong>amostra completa</strong></span></div>
    <section className="credit-composition"><div className="section-heading"><span className="eyebrow">01 / QUEBRA DO SALDO</span><h2>Quatro segmentos, muitas modalidades.</h2><p>As participações abaixo são relativas ao saldo total nacional, não à quantidade de modalidades.</p></div>
      <div className="composition-overview"><article className="chart-card donut-card"><h3>R$ {num(credit.total / 1e6)} trilhões em crédito</h3><Chart {...compositionChart} height={300} label="Composição do saldo nacional entre crédito livre e direcionado para famílias e empresas. Os percentuais estão nos botões ao lado." /></article><div className="branch-grid">{credit.branches.map(b => <button key={b.id} aria-pressed={branch === b.id} onClick={() => update({ segmento: branch === b.id ? 'all' : b.id })} className="branch-card"><span><i style={{ background: colors[b.id] }} />{b.label}</span><strong>{num(b.shareTotal)}<small>%</small></strong><small>R$ {num(b.value / 1000)} bilhões</small><span className="branch-action">{branch === b.id ? 'Exibindo segmento' : 'Detalhar modalidades'} <ArrowRight size={14} /></span></button>)}</div></div>
    </section>
    <div className="filter-panel credit-filters"><div className="filter-grid"><label>Segmento de crédito<select value={branch} onChange={e => update({ segmento: e.target.value, modalidade: '' })}><option value="all">Todo o mercado brasileiro</option>{credit.branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label><label>Modalidade selecionada<select value={activeDetail?.id || ''} onChange={e => chooseDetail(e.target.value)}><option value="">Selecionar no gráfico ou lista</option>{selected.filter(r => !r.residual).map(r => <option key={r.id} value={r.id}>{branchLabel(r.branch)} · {r.label}</option>)}</select></label><label>Surpresa para a distribuição por beta<select value={shock} onChange={e => update({ choque: e.target.value })}><option value="DI90">DI-90</option><option value="DI30">DI-30</option></select></label></div><p className="caption">Saldo de julho de 2026 · betas estimados até abril de 2026. Filtrar um segmento mantém o saldo nacional como denominador. Clique em uma barra ou ponto para abrir a ficha da modalidade.</p></div>
    {activeDetail && <article className="detail-profile" aria-live="polite"><div className="detail-profile-heading"><div><span className="eyebrow">FICHA DA MODALIDADE</span><h2>{activeDetail.label}</h2><p>{branchLabel(activeDetail.branch)} · {activeDetail.mapping === 'aproximado' ? 'correspondência aproximada de séries' : activeDetail.mapping === 'exato' ? 'correspondência exata de séries' : 'sem correspondência de taxa'}</p></div><button className="button secondary" onClick={() => chooseDetail('')}>Limpar seleção</button></div><div className="detail-profile-stats"><div><span>Saldo em {monthLabel(credit.date)}</span><strong>R$ {num(activeDetail.value / 1000)} bi</strong></div><div><span>Participação nacional</span><strong>{num(activeDetail.shareTotal)}%</strong></div><div><span>Participação no segmento</span><strong>{num(activeDetail.shareBranch)}%</strong></div></div><div className="detail-beta-grid">{(['DI30', 'DI90'] as const).map(horizon => { const estimate = activeDetail.estimates[horizon]; return <div key={horizon}><span className="pill">{shockLabels[horizon]}</span>{estimate ? <><strong>β = {num(estimate.beta)}</strong><span>IC 95% [{num(estimate.ciLow)}; {num(estimate.ciHigh)}]</span><small>p = {num(estimate.p, 3)} · N = {estimate.n} · HC0</small><small>{dateLabel(estimate.first)} — {dateLabel(estimate.last)}</small></> : <span>Sem estimativa mapeada para esta modalidade.</span>}</div>; })}</div><p className="caption">A inferência testa β = 0. O intervalo é aproximado por β ± 1,96 × erro-padrão HC0; as datas de saldo e da regressão não coincidem.</p></article>}
    <article className="chart-card credit-detail-card"><div className="chart-heading"><div><h2>Onde está o saldo?</h2><p>{branch === 'all' ? 'Todo o mercado' : branchLabel(branch)} · maiores modalidades por participação nacional</p></div><span className="pill">{selected.length} modalidades / resíduos</span></div><Chart data={detailChart.data} layout={detailChart.layout} height={detailChart.height} onPointClick={chooseDetail} label="Decomposição do saldo por modalidade, em percentual do saldo total brasileiro. Clique em uma das dez maiores barras para abrir sua ficha. As 45 modalidades estão na lista e na tabela." /><p className="chart-footnote">As dez maiores entradas aparecem individualmente; as restantes são somadas em “Demais modalidades e ajustes”. Clique em uma barra para ligar saldo, segmento e betas. As entradas agrupadas estão detalhadas na tabela.</p></article>
    <section className="credit-distribution" data-testid="credit-distribution"><div className="section-heading"><span className="eyebrow">02 / SALDO AO LONGO DOS BETAS</span><h2>Quanto do mercado está em cada faixa de repasse?</h2><p>A distribuição pondera as estimativas pontuais pelo saldo de cada modalidade. Um salto maior na curva indica maior participação no mercado.</p></div>
      <div className="beta-bins">{bins.map(bin => <div key={bin.label}><span>{bin.label}</span><strong>{num(bin.value)}<small>%</small></strong><p>{bin.description}</p></div>)}</div>
      <p className="caption">{branch === 'all' ? 'Participações no saldo total do Brasil, incluindo modalidades não mapeadas. Diferenças de 0,01 ponto percentual na soma podem ocorrer por arredondamento.' : `Participações de ${branchLabel(branch)} no saldo total do Brasil. As quatro faixas somam a participação desse segmento, não 100%.`}</p>
      <article className="chart-card beta-share-card"><div className="chart-heading"><div><h2>Composição do saldo por faixa de beta · {shockLabels[shock]}</h2><p>Denominador fixo: saldo total nacional. A parcela sem beta fica identificada.</p></div><span className="pill">Estimativas pontuais</span></div><Chart data={binChart.data} layout={binChart.layout} height={125} plotId="saldo-faixas-beta" label={`Composição do saldo pelas faixas de beta ${shockLabels[shock]}. Valores absolutos no painel; quando há filtro de segmento, as barras mostram sua participação no saldo nacional, sem renormalização.`} /><p className="chart-footnote">β não positivo, parcial, acima de um e sem mapeamento. As faixas classificam pontos estimados; não incorporam a incerteza individual de cada modalidade.</p></article>
      <div className="branch-legend distribution-legend">{credit.branches.filter(b => branch === 'all' || b.id === branch).map(b => <span key={b.id}><i style={{ background: colors[b.id] }} />{b.label}</span>)}</div>
      <p className="compare-explainer">Cada painel usa a mesma escala horizontal e o mesmo denominador; assim, as diferenças entre DI-30 e DI-90 ficam diretamente comparáveis.</p>
      <div className="distribution-compare-grid">{distributions.map(distribution => <article className="chart-card cumulative-card" key={distribution.shock}>
        <div className="chart-heading"><div><h2>Saldo acumulado · {shockLabels[distribution.shock]}</h2><p>{distribution.count} modalidades mapeadas · {num(distribution.coverage)}% do saldo nacional</p></div><span className="pill">Função escada</span></div>
        <Chart data={distribution.data} layout={distribution.layout} height={410} plotId={`saldo-beta-${distribution.shock}`} downloadName={`distribuicao-saldo-beta-${distribution.shock.toLowerCase()}-${branch}`} onPointClick={chooseDetail} label={`Distribuição acumulada do saldo por coeficiente ${shockLabels[distribution.shock]}. Escala horizontal idêntica à figura ao lado. Clique em um marcador para selecionar a modalidade. Cobertura ${num(distribution.coverage)}% do saldo total.`} />
        <div className="significance-key"><span>● p &lt; 0,05</span><span>◆ 0,05 ≤ p &lt; 0,10</span><span>○ p ≥ 0,10</span></div>
      </article>)}</div>
      <p className="chart-footnote distribution-footnote">Os dois painéis usam o mesmo denominador (saldo total) e a mesma escala de beta ({num(distributionRows.min)} a {num(distributionRows.max)}). Área e linha mostram saldo acumulado; tamanho dos marcadores, a participação de cada modalidade. Formato do marcador indica significância contra β = 0, não contra β = 1. Clique no mesmo ponto em qualquer painel para abrir a ficha sincronizada.</p>
      <aside className="reading-note"><Info size={21} /><div><h3>O saldo sem beta permanece visível.</h3><p>{num(unmapped)}% do saldo nacional {branch !== 'all' ? `pertence ao segmento ${branchLabel(branch)} e ` : ''}não tem beta correspondente nesta seleção. Essa parcela não entra na curva e não representa repasse zero. A ponderação é uma síntese descritiva: não produz um coeficiente agregado do canal de crédito e não incorpora a incerteza dos betas.</p><p>Há mapeamentos aproximados, como o de renegociação para famílias. Os testes por modalidade são exploratórios e sujeitos a multiplicidade. Coeficientes negativos ou imprecisos não devem ser convertidos automaticamente em conclusões sobre mecanismos econômicos.</p></div></aside>
    </section>
    <div className="table-heading"><div><span className="eyebrow">DADOS DA DECOMPOSIÇÃO</span><h2>Saldo, modalidade e estimativa.</h2></div><button className="button secondary" onClick={exportSelection}><ArrowDownToLine size={16} />Baixar distribuição em CSV</button></div>
    <details className="data-details credit-table-details"><summary>Consultar a tabela de modalidades <ChevronDown size={16} /></summary>
    <div className="table-wrap credit-table" tabIndex={0} aria-label="Tabela de composição e coeficientes com rolagem horizontal"><table><caption className="sr-only">Modalidades de crédito, saldo em milhões de reais, participações e estimativas {shockLabels[shock]}.</caption><thead><tr><th scope="col">Modalidade / segmento</th><th scope="col">Saldo · R$ milhões</th><th scope="col">% do Brasil</th><th scope="col">% do segmento</th><th scope="col">β · {shockLabels[shock]}</th><th scope="col">p-valor</th><th scope="col">Mapeamento</th></tr></thead><tbody>{[...selected].sort((a, b) => b.value - a.value).map((r: CreditDetail) => <tr key={r.id}><th scope="row">{r.label}<small>{branchLabel(r.branch)} · {r.sgsCode === 'residual' || r.sgsCode === 'rounding' ? 'Resíduo / ajuste' : `SGS ${r.sgsCode}`}{r.estimates[shock] && <><br />{dateLabel(r.estimates[shock]!.first)} — {dateLabel(r.estimates[shock]!.last)} · N = {r.estimates[shock]!.n}</>}</small></th><td className="numeric">{num(r.value, 0)}</td><td className="numeric">{num(r.shareTotal)}</td><td className="numeric">{num(r.shareBranch)}</td><td className="numeric">{r.estimates[shock] ? <>{num(r.estimates[shock]!.beta)}<sup>{stars(r.estimates[shock]!.p)}</sup></> : 'Não disponível'}</td><td className="numeric">{r.estimates[shock] ? (r.estimates[shock]!.p < .001 ? '< 0,001' : num(r.estimates[shock]!.p, 3)) : '—'}</td><td>{r.mapping === 'nao mapeado' ? 'Não mapeado' : r.mapping === 'aproximado' ? 'Aproximado' : 'Exato'}</td></tr>)}</tbody></table></div>
    <p className="caption">Saldo em R$ milhões. Ajustes de ± R$ 1 milhão refletem arredondamento das séries oficiais. “Exato” descreve a correspondência entre séries de saldo e taxa, não a precisão estatística do coeficiente.</p>
    </details>
    <div className="credit-end-links"><a className="text-link" href="#/resultados?pais=BR">Voltar às estimativas principais <ArrowRight size={16} /></a><a className="text-link" href="#/metodologia">Consultar o método <ArrowRight size={16} /></a></div>
  </section>;
}
