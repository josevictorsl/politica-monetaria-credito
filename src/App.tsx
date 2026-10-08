import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, ChevronDown, ExternalLink, FileText, Globe2, Info, LineChart, Menu, MoveRight, X } from 'lucide-react';
import type { Data, Layout } from 'plotly.js';
import { base, countries, dateLabel, downloadCsv, num, research, samples, shockLabels, stars } from './data';
import type { Country, Sample, Shock } from './types';
import Forest from './components/Forest';
import Chart from './components/Chart';

const navigation = [
  ['/', 'Visão geral'], ['/resultados', 'Resultados'], ['/surpresas', 'Surpresas monetárias'], ['/metodologia', 'Metodologia'], ['/pesquisa', 'A pesquisa'],
];
const brHighlight = research.estimates.find(r => r.seriesId === 'agregados_livre_pj' && r.sample === 'full' && r.shock === 'DI90')!;
const usHighlight = research.estimates.find(r => r.seriesId === 'us_0' && r.sample === 'full')!;

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const update = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const [path, query = ''] = hash.slice(1).split('?');
  const navigate = (next: string) => {
    window.location.hash = next;
    setHash('#' + next);
  };
  return { path, params: new URLSearchParams(query), navigate };
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}

function PdfLink({ className = 'button secondary', children = 'Ler estudo completo' }: { className?: string; children?: React.ReactNode }) {
  return <a className={className} href={`${base}documentos/estudo-completo.pdf`} target="_blank" rel="noreferrer"><FileText size={16} />{children}<ArrowUpRight size={15} /></a>;
}

function CountrySwitch({ value, onChange }: { value: Country; onChange: (country: Country) => void }) {
  return <div className="segmented" role="group" aria-label="País">
    {(['BR', 'US'] as const).map(country => <button key={country} aria-pressed={value === country} onClick={() => onChange(country)}><span className="country-code">{country === 'US' ? 'US' : 'BR'}</span>{countries[country]}</button>)}
  </div>;
}

function HeroEvidence() {
  const selected = [brHighlight, usHighlight, ...['us_4', 'us_1'].map(id => research.estimates.find(r => r.country === 'US' && r.sample === 'full' && r.seriesId === id)!)];
  const scale = (value: number) => 130 + value * 57;
  return <div className="hero-evidence">
    <div className="evidence-top"><span className="eyebrow">Uma leitura dos resultados</span><BarChart3 size={18} /></div>
    <h3>Surpresas monetárias.<br /><em>Respostas diferentes.</em></h3>
    <p>Estimativas de repasse nas amostras atualizadas, por modalidade.</p>
    <svg viewBox="0 0 410 249" role="img" aria-label="Coeficientes selecionados de Brasil e Estados Unidos, com intervalos de confiança HC0 de 95%.">
      {[0, 1, 2, 3, 4].map(t => <g key={t}><line x1={scale(t)} x2={scale(t)} y1="12" y2="215" stroke={t === 1 ? '#a87747' : '#d7dfd2'} strokeDasharray={t === 1 ? '3 4' : undefined} /><text x={scale(t)} y="239" textAnchor="middle" className="svg-tick">{t}</text></g>)}
      {selected.map((r, i) => <g key={r.seriesId}>
        <text x="0" y={42 + i * 51} className="svg-country">{r.country === 'BR' ? 'BRASIL' : 'EUA'}</text>
        <text x="0" y={58 + i * 51} className="svg-label">{['Livre · empresas', 'CP · não financeiras', 'Taxa prime', 'CP · financeiras'][i]}</text>
        <line x1={scale(r.ciLow)} x2={scale(r.ciHigh)} y1={46 + i * 51} y2={46 + i * 51} stroke={r.country === 'BR' ? '#a87747' : '#326658'} strokeWidth="2" />
        <circle cx={scale(r.beta)} cy={46 + i * 51} r="5" fill={r.country === 'BR' ? '#a87747' : '#326658'} />
        <text x={scale(r.beta)} y={33 + i * 51} textAnchor="middle" className="svg-value">{num(r.beta)}</text>
      </g>)}
    </svg>
    <div className="evidence-note"><span className="legend-line" /> Repasse unitário (β = 1)<span>IC de 95%</span></div>
    <a href="#/resultados" className="evidence-link">Explorar estimativas e incerteza <ArrowRight size={17} /></a>
    <small>Brasil: DI-90 · EUA: FF3. Medidas distintas de surpresa; comparação interpretativa.</small>
  </div>;
}

function Home() {
  return <>
    <section className="hero container">
      <div className="hero-copy">
        <div className="research-tag"><span className="status-dot" /> PESQUISA ECONÔMICA <span className="tag-divider" /> EVIDÊNCIAS ATÉ 2026</div>
        <h1>O caminho dos juros,<br />do anúncio<br /><em>ao crédito.</em></h1>
        <p className="hero-intro">Como as surpresas de política monetária chegam às taxas de crédito de famílias e empresas?</p>
        <p className="hero-description">Uma investigação sobre o repasse no Brasil e nos Estados Unidos — da decisão dos bancos centrais aos preços do financiamento.</p>
        <div className="hero-actions"><a href="#/resultados" className="button primary">Explorar resultados <ArrowRight size={18} /></a><PdfLink /></div>
        <div className="author-line"><span className="avatar">JV</span><div><strong>José Victor Santos Lopes</strong><span>Pesquisa acadêmica · FGV EESP</span></div></div>
      </div>
      <HeroEvidence />
    </section>
    <div className="container"><div className="research-strip">
      <div><strong>02</strong><span>Países em análise</span></div>
      <div><strong>03</strong><span>Medidas de surpresa</span></div>
      <div><strong>22</strong><span>Modalidades principais</span></div>
      <div><strong>2026</strong><span>Extensão da pesquisa</span></div>
    </div></div>
    <section className="container section-pad">
      <div className="heading-row"><SectionHeading eyebrow="01 / PRINCIPAIS EVIDÊNCIAS" title="A transmissão não é uniforme.">O repasse varia entre países e segmentos. As estimativas contam uma história de heterogeneidade.</SectionHeading><a className="text-link" href="#/resultados">Ver todos os resultados <ArrowUpRight size={17} /></a></div>
      <div className="insight-grid">
        <article className="insight-card"><div className="country-heading"><span className="country-code">BR</span><span>BRASIL</span><span className="pill">DI-30 / DI-90</span></div><h3>Evidência concentrada<br />no crédito livre a empresas.</h3><p>Na amostra completa, o repasse estimado é próximo de um nesse segmento. Para famílias e outras modalidades, a precisão depende da medida e da amostra.</p><div className="insight-bottom"><div><strong>{num(brHighlight.beta)}<span> β</span></strong><small>Crédito livre · empresas · DI-90</small></div><a href="#/resultados?pais=BR&choque=DI90&modalidade=agregados_livre_pj" className="circle-link" aria-label="Explorar crédito livre a empresas no Brasil"><ArrowUpRight size={20} /></a></div></article>
        <article className="insight-card"><div className="country-heading"><span className="country-code">US</span><span>ESTADOS UNIDOS</span><span className="pill">FF3</span></div><h3>Repasse mais disseminado<br />entre as séries analisadas.</h3><p>Diversas taxas apresentam coeficientes positivos. Em modalidades corporativas, as estimativas pontuais são superiores a um, com incerteza que precisa ser considerada.</p><div className="insight-bottom"><div><strong>{num(usHighlight.beta)}<span> β</span></strong><small>Commercial paper · não financeiras</small></div><a href="#/resultados?pais=US&modalidade=us_0" className="circle-link" aria-label="Explorar commercial paper nos Estados Unidos"><ArrowUpRight size={20} /></a></div></article>
      </div>
      <p className="caption"><Info size={14} /> Coeficientes condicionados ao desenho empírico. Um valor pontual acima de um não equivale, por si só, a rejeitar repasse unitário.</p>
    </section>
    <section className="process-section"><div className="container section-pad">
      <SectionHeading eyebrow="02 / ENTENDA A PESQUISA" title="Da surpresa à estimativa.">Três etapas para medir a resposta dos preços do crédito às decisões monetárias.</SectionHeading>
      <div className="process-grid">
        <article><span className="step-number">01</span><LineChart size={25} /><h3>Identificar a surpresa</h3><p>Separar a parte inesperada do anúncio. Nem toda mudança na taxa básica surpreende o mercado.</p></article>
        <article><span className="step-number">02</span><BarChart3 size={25} /><h3>Observar as taxas</h3><p>Comparar as taxas médias de crédito nas janelas anterior e posterior a cada reunião.</p></article>
        <article><span className="step-number">03</span><BookOpen size={25} /><h3>Estimar o repasse</h3><p>Relacionar a variação das taxas à surpresa, controlando duas defasagens da própria variável.</p></article>
      </div>
      <a href="#/metodologia" className="text-link">Conhecer o método e seus limites <ArrowRight size={17} /></a>
    </div></section>
    <section className="container section-pad glossary-section">
      <SectionHeading eyebrow="03 / CONCEITOS ESSENCIAIS" title="Um guia para a leitura." />
      <div className="glossary">
        {[
          ['O que é uma surpresa monetária?', 'É o componente da decisão ou da trajetória esperada dos juros que não estava incorporado aos preços de mercado. A pesquisa usa FF3 nos EUA e DI-30/DI-90 no Brasil. Essas medidas não equivalem mecanicamente à mudança observada da taxa básica.'],
          ['Como interpretar o coeficiente β?', 'O beta relaciona a surpresa à variação das taxas médias de crédito. Um valor de 1 corresponde a repasse proporcional; entre 0 e 1, a repasse parcial; acima de 1, a amplificação pontual. A leitura deve considerar o intervalo de confiança.'],
          ['O que são crédito livre e direcionado?', 'No crédito livre, as condições são negociadas pelas instituições e pelos tomadores. O crédito direcionado está associado a regras de destinação dos recursos e pode ter taxas ou indexadores específicos.'],
          ['O que o intervalo de confiança mostra?', 'Ele comunica a precisão da estimativa sob as hipóteses do modelo. Intervalos amplos admitem uma gama maior de efeitos. Não rejeitar um coeficiente zero não demonstra que o efeito inexista.'],
          ['Pontos-base e pontos percentuais são iguais?', 'Não. Um ponto percentual corresponde a 100 pontos-base. Os gráficos de surpresas usam pontos-base; as regressões usam surpresa e variação da taxa em pontos percentuais, mantendo o beta como razão sem unidade.'],
        ].map(([title, text]) => <details key={title}><summary>{title}<ChevronDown size={17} /></summary><p>{text}</p></details>)}
      </div>
    </section>
    <div className="container"><section className="closing-card"><div><span className="eyebrow">DADOS ABERTOS, LEITURA TRANSPARENTE</span><h2>Explore além do resumo.</h2><p>Conheça as fontes, examine as estimativas e leia o estudo completo.</p></div><a href="#/pesquisa" className="button light">Acessar a pesquisa <ArrowRight size={18} /></a></section></div>
  </>;
}

function Results({ params, navigate }: { params: URLSearchParams; navigate: (next: string) => void }) {
  const country: Country = params.get('pais') === 'US' ? 'US' : 'BR';
  const shock: Shock = country === 'US' ? 'FF3' : params.get('choque') === 'DI30' ? 'DI30' : 'DI90';
  const sample: Sample = params.get('amostra') === 'historical' ? 'historical' : 'full';
  const compare = params.get('comparar') !== '0';
  const options = research.estimates.filter(r => r.country === country && r.shock === shock && r.sample === sample);
  const requestedId = params.get('modalidade') || 'all';
  const seriesId = options.some(r => r.seriesId === requestedId) ? requestedId : 'all';
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    navigate('/resultados?' + next.toString());
  };
  const rows = useMemo(() => research.estimates.filter(r => r.country === country && r.shock === shock && (compare || r.sample === sample) && (seriesId === 'all' || r.seriesId === seriesId)), [country, shock, compare, sample, seriesId]);
  const primary = rows.filter(r => r.sample === sample);
  const selected = primary.find(r => r.seriesId === (country === 'BR' ? 'agregados_livre_pj' : 'us_0')) || primary[0];
  const exportRows = () => downloadCsv(`resultados-${country}-${shock}.csv`, rows.map(r => ({ pais: countries[r.country], modalidade: r.label, amostra: samples[r.sample], surpresa: shockLabels[r.shock], beta: r.beta, erro_padrao_HC0: r.se, ic95_inferior: r.ciLow, ic95_superior: r.ciHigh, p_valor: r.p, observacoes: r.n, primeira_reuniao: r.first, ultima_reuniao: r.last, frequencia_original: r.frequency, r_quadrado: r.r2, versao: research.meta.version })));
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setCopyError(false);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch { setCopyError(true); }
  }
  return <section className="container page-section">
    <div className="page-heading"><div><span className="eyebrow">EXPLORADOR DE EVIDÊNCIAS</span><h1>Resultados do repasse.</h1><p>Compare modalidades e amostras. Veja a magnitude da estimativa junto com sua incerteza.</p></div><button className="button secondary" onClick={share}>{copied ? <Check size={16} /> : <ExternalLink size={16} />}{copied ? 'Link copiado' : 'Copiar link da análise'}</button></div>
    {copyError && <p role="status" className="caption">Copie o endereço na barra do navegador para compartilhar esta seleção.</p>}
    <div className="filter-panel">
      <CountrySwitch value={country} onChange={pais => update({ pais, modalidade: 'all', choque: pais === 'US' ? 'FF3' : 'DI90' })} />
      <div className="filter-grid">
        <label>Medida de surpresa<select value={shock} disabled={country === 'US'} onChange={e => update({ choque: e.target.value })}>{country === 'US' ? <option value="FF3">FF3 · Fed Funds Futures</option> : <><option value="DI90">DI-90 · horizonte de 90 dias</option><option value="DI30">DI-30 · horizonte de 30 dias</option></>}</select></label>
        <label>Amostra principal<select value={sample} onChange={e => update({ amostra: e.target.value })}><option value="full">Atualizada · extensão até 2026</option><option value="historical">Histórica · {country === 'BR' ? '2003–2019' : '1994–2016'}</option></select></label>
        <label>Modalidade de crédito<select value={seriesId} onChange={e => update({ modalidade: e.target.value })}><option value="all">Todas as modalidades principais</option>{options.map(r => <option key={r.seriesId} value={r.seriesId}>{r.label}</option>)}</select></label>
      </div>
      <div className="filter-bottom"><label className="checkbox-label"><input type="checkbox" checked={compare} onChange={e => update({ comparar: e.target.checked ? '1' : '0' })} />Comparar amostra histórica e atualizada</label><span>Modelos já estimados · erros-padrão HC0</span></div>
    </div>
    <div className="result-summary" aria-live="polite"><div className="summary-title"><span className="eyebrow">{seriesId === 'all' ? 'EM DESTAQUE' : 'MODALIDADE SELECIONADA'}</span><h2>{selected.label}</h2><span>{samples[sample]} · {shockLabels[shock]} · {dateLabel(selected.first)} — {dateLabel(selected.last)}</span></div><div><span>Coeficiente β</span><strong>{num(selected.beta)}</strong></div><div><span>IC de 95%</span><strong className="interval">[{num(selected.ciLow)}; {num(selected.ciHigh)}]</strong></div><div><span>Reuniões efetivas</span><strong>{selected.n}</strong></div></div>
    <article className="chart-card"><div className="chart-heading"><div><h2>Estimativas e intervalos de confiança</h2><p>Uma linha mais longa indica menor precisão da estimativa.</p></div><div className="chart-legend">{(compare ? ['full', 'historical'] as const : [sample]).map(s => <span key={s}><i className={s} />{samples[s]}</span>)}</div></div><Forest rows={rows} compare={compare} /><p className="chart-footnote">Linhas: IC de 95% por aproximação normal (β ± 1,96 × erro-padrão HC0). Linha contínua: zero. Linha pontilhada: repasse unitário. Os períodos efetivos variam por série.</p></article>
    <div className="table-heading"><div><span className="eyebrow">CAMADA TÉCNICA</span><h2>Os números por trás do gráfico.</h2></div><button className="button secondary" onClick={exportRows}><ArrowDownToLine size={16} />Baixar seleção em CSV</button></div>
    <div className="table-wrap" tabIndex={0} aria-label="Tabela de resultados com rolagem horizontal"><table><caption className="sr-only">Estimativas de {countries[country]}, medida {shockLabels[shock]}, com erro-padrão HC0.</caption><thead><tr><th scope="col">Modalidade / período</th><th scope="col">Amostra</th><th scope="col">β</th><th scope="col">Erro-padrão</th><th scope="col">IC 95%</th><th scope="col">p-valor</th><th scope="col">N</th><th scope="col">R²</th></tr></thead><tbody>{rows.map(r => <tr key={`${r.seriesId}-${r.sample}`} className={r.seriesId === selected.seriesId ? 'highlight-row' : ''}><th scope="row">{r.label}<small>{dateLabel(r.first)} — {dateLabel(r.last)}<br />{r.frequency}</small></th><td><span className={`sample-badge ${r.sample}`}>{samples[r.sample]}</span></td><td className="numeric"><strong>{num(r.beta)}</strong><sup>{stars(r.p)}</sup></td><td className="numeric">{num(r.se)}</td><td className="numeric">[{num(r.ciLow)}; {num(r.ciHigh)}]</td><td className="numeric">{r.p < .001 ? '< 0,001' : num(r.p, 3)}</td><td className="numeric">{r.n}</td><td className="numeric">{num(r.r2, 3)}</td></tr>)}</tbody></table></div>
    <p className="caption">*** p &lt; 0,01 · ** p &lt; 0,05 · * p &lt; 0,10. Testes em relação a β = 0; as estrelas não testam β = 1. R² da especificação sem constante.</p>
    <aside className="reading-note"><Info size={21} /><div><h3>Como ler esta comparação</h3><p>Os modelos não incluem constante e controlam duas defasagens da variação das taxas. As medidas FF3 e DI são distintas. Resultados imprecisos não demonstram ausência de efeito. No Brasil, as regressões principais terminam em abril de 2026; nos EUA, a série de hipoteca 5/1 termina em 2022.</p><a href="#/metodologia" className="text-link">Consultar hipóteses e limites <ArrowRight size={16} /></a></div></aside>
  </section>;
}

function Surprises() {
  const [country, setCountry] = useState<Country>('BR');
  const [shock, setShock] = useState<Shock>('DI90');
  const [period, setPeriod] = useState('all');
  const points = useMemo(() => research.shocks.filter(r => r.country === country && r.shock === shock && (period === 'all' || (period === 'extension' ? r.extension : !r.extension))), [country, shock, period]);
  const stats = useMemo(() => ({ mean: points.reduce((s, r) => s + r.value, 0) / points.length, min: Math.min(...points.map(r => r.value)), max: Math.max(...points.map(r => r.value)) }), [points]);
  const chart = useMemo(() => {
    const data: Data[] = [false, true].map(extension => {
      const selected = points.filter(r => r.extension === extension);
      return { type: 'scatter', mode: 'markers', name: extension ? 'Extensão' : 'Período histórico', x: selected.map(r => r.date), y: selected.map(r => r.value), marker: { color: extension ? '#a87747' : '#326658', size: 7, symbol: extension ? 'triangle-up' : 'circle' }, text: selected.map(r => `${countries[r.country]} · ${shockLabels[r.shock]}<br>${dateLabel(r.date)}<br>Surpresa: ${num(r.value)} pontos-base`), hovertemplate: '%{text}<extra></extra>' } as Data;
    });
    const layout: Partial<Layout> = { margin: { l: 58, r: 20, t: 15, b: 75 }, showlegend: false, dragmode: 'zoom', xaxis: { type: 'date', gridcolor: '#e7e9e1', title: { text: 'Data da reunião', standoff: 18 } }, yaxis: { title: { text: 'Pontos-base', standoff: 8 }, gridcolor: '#e7e9e1', zerolinecolor: '#acb5a9' } };
    return { data, layout };
  }, [points]);
  return <section className="container page-section">
    <div className="page-heading"><div><span className="eyebrow">O COMPONENTE INESPERADO</span><h1>Surpresas monetárias.</h1><p>O que os preços de mercado revelam em torno das reuniões dos bancos centrais.</p></div><LineChart className="page-icon" size={40} /></div>
    <div className="filter-panel"><CountrySwitch value={country} onChange={value => { setCountry(value); setShock(value === 'BR' ? 'DI90' : 'FF3'); }} /><div className="filter-grid two"><label>Medida de surpresa<select value={shock} disabled={country === 'US'} onChange={e => setShock(e.target.value as Shock)}>{country === 'BR' ? <><option value="DI90">DI-90</option><option value="DI30">DI-30</option></> : <option value="FF3">FF3</option>}</select></label><label>Período visualizado<select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Toda a série disponível</option><option value="historical">Período histórico · até {country === 'BR' ? '2019' : '2016'}</option><option value="extension">Extensão · desde {country === 'BR' ? '2020' : '2017'}</option></select></label></div></div>
    <div className="shock-stats"><div><span>Reuniões disponíveis</span><strong>{points.length}</strong></div><div><span>Média · pontos-base</span><strong>{num(stats.mean)}</strong></div><div><span>Mínimo · pontos-base</span><strong>{num(stats.min)}</strong></div><div><span>Máximo · pontos-base</span><strong>{num(stats.max)}</strong></div></div>
    <article className="chart-card"><div className="chart-heading"><div><h2>{countries[country]} · {shockLabels[shock]}</h2><p>{dateLabel(points[0].date)} — {dateLabel(points[points.length - 1].date)} · série de surpresas</p></div><div className="chart-legend"><span><i className="full" />Histórico</span><span><i className="historical" />Extensão</span></div></div><Chart {...chart} height={410} label="Surpresas monetárias por data, em pontos-base. Os valores individuais estão na tabela abaixo." /><p className="chart-footnote">Passe o cursor para ver uma reunião. Arraste uma região para ampliar; dê dois cliques para restaurar. Alterar o período não recalcula regressões.</p></article>
    <aside className="reading-note"><Info size={21} /><div><h3>{country === 'BR' ? 'Fechamento e abertura do pregão seguinte' : 'Reuniões programadas do FOMC'}</h3><p>{country === 'BR' ? 'As surpresas DI comparam o fechamento no dia do Copom à abertura do próximo pregão, com ajuste pelo CDI. A janela inclui notícias noturnas. A extensão, desde 2020, pertence à mesma série reconstruída; não é uma comparação com a série original do artigo.' : 'FF3 captura mudanças no caminho esperado dos juros em horizonte curto, com dados de Jarociński e Karadi. A série inclui apenas reuniões programadas e exclui a decisão emergencial de 3 de março de 2020. FF3 pode combinar política monetária e informação revelada pelo banco central.'}</p></div></aside>
    <details className="data-details"><summary>Consultar valores por reunião <ChevronDown size={17} /></summary><div className="details-toolbar"><p>{points.length} reuniões · {shockLabels[shock]} · pontos-base</p><button className="button secondary" onClick={() => downloadCsv(`surpresas-${country}-${shock}.csv`, points.map(r => ({ data: r.date, pais: countries[r.country], surpresa: shockLabels[r.shock], pontos_base: r.value, periodo: r.extension ? 'Extensão' : 'Histórico', versao: research.meta.version })))}><ArrowDownToLine size={16} />Baixar série em CSV</button></div><div className="table-wrap event-table" tabIndex={0}><table><caption className="sr-only">Surpresas monetárias por reunião</caption><thead><tr><th scope="col">Reunião</th><th scope="col">Surpresa · pontos-base</th><th scope="col">Período</th></tr></thead><tbody>{[...points].reverse().map(r => <tr key={r.date}><th scope="row">{dateLabel(r.date)}</th><td className="numeric">{num(r.value, 3)}</td><td>{r.extension ? 'Extensão' : 'Histórico'}</td></tr>)}</tbody></table></div></details>
  </section>;
}

function Methodology() {
  return <section className="container page-section">
    <div className="page-heading"><div><span className="eyebrow">DESENHO EMPÍRICO</span><h1>Como o repasse é estimado.</h1><p>Replicação, extensão temporal e uma leitura explícita das hipóteses de identificação.</p></div><PdfLink /></div>
    <div className="method-layout"><aside className="method-index"><span className="eyebrow">NESTA PÁGINA</span>{[['pergunta', 'Pergunta e desenho'], ['dados', 'Dados e fontes'], ['janelas', 'Construção das janelas'], ['modelo', 'Modelo econométrico'], ['limites', 'Interpretação e limites']].map(([id, label]) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{label}<ArrowDown size={13} /></button>)}</aside>
      <div className="method-content">
        <section id="pergunta"><span className="eyebrow">01 / PERGUNTA</span><h2>O padrão de repasse permanece com dados mais recentes?</h2><p>A pesquisa replica e atualiza Elias e Guimarães (2024), ampliando as amostras de Brasil e Estados Unidos até 2026. O foco é a resposta das <strong>taxas e dos spreads de crédito</strong> a surpresas monetárias, e não uma medida completa de todos os efeitos do canal de crédito.</p></section>
        <section id="dados"><span className="eyebrow">02 / DADOS</span><h2>Fontes e frequências.</h2><div className="source-grid"><article><span className="country-code">BR</span><h3>Brasil</h3><p>Crédito: séries oficiais do Banco Central (SGS). Surpresas: contratos de DI futuro da Bloomberg, reconstruídos com calendário de negociação.</p><span className="pill">DI-30 e DI-90</span></article><article><span className="country-code">US</span><h3>Estados Unidos</h3><p>Crédito: Federal Reserve e FRED. Surpresas: componente FF3 do repositório atualizado de Jarociński e Karadi.</p><span className="pill">FF3</span></article></div><p>Séries mensais, semanais e trimestrais são desagregadas para a frequência diária com <code>tempdisagg</code>. O método principal, <code>fast</code>, preserva a média do período original. Conversão em blocos e última observação disponível são alternativas quando necessárias.</p><p>Os valores diários gerados não são observações efetivamente negociadas a cada dia. O painel identifica a frequência original de cada modalidade.</p></section>
        <section id="janelas"><span className="eyebrow">03 / JANELAS</span><h2>Antes e depois de cada reunião.</h2><div className="window-diagram"><div><small>REUNIÃO ANTERIOR</small><span>Média anterior</span></div><MoveRight size={24} /><div className="meeting-point"><span>Reunião t</span><small>SURPRESA sₜ</small></div><MoveRight size={24} /><div><small>REUNIÃO SEGUINTE</small><span>Média posterior</span></div></div><p>A variável dependente é a diferença entre a média posterior e a média anterior à reunião: <strong>Δrₜ = r̄ₜ,ₜ₊₁ − r̄ₜ₋₁,ₜ</strong>.</p><p>A primeira janela começa 35 dias antes do evento; janelas anteriores com menos de 30 dias observados são descartadas. A transição metodológica das séries brasileiras em março de 2011 recebe tratamento específico, com variações contaminadas e defasagens relacionadas ausentes.</p><p>As amostras históricas são desagregadas separadamente para evitar influência de dados posteriores. A última reunião da regressão depende da disponibilidade da janela seguinte.</p></section>
        <section id="modelo"><span className="eyebrow">04 / MODELO</span><h2>O coeficiente de interesse é β.</h2><div className="equation" role="math" aria-label="Delta r no período t igual a beta vezes surpresa no período t, mais gama vezes delta r defasado um período, mais xi vezes delta r defasado dois períodos, mais erro">Δr<sub>t</sub> = βs<sub>t</sub> + γΔr<sub>t−1</sub> + ξΔr<sub>t−2</sub> + ε<sub>t</sub></div><dl className="model-definitions"><div><dt>Δrₜ</dt><dd>Variação entre médias consecutivas da taxa de crédito.</dd></div><div><dt>sₜ</dt><dd>Surpresa monetária: DI-30/DI-90 no Brasil ou FF3 nos EUA.</dd></div><div><dt>β</dt><dd>Coeficiente de repasse contemporâneo, condicionado ao modelo.</dd></div></dl><p>A especificação principal não inclui constante e usa duas defasagens. O site apresenta erros-padrão HC0. O estudo completo contém verificações HC3 e HAC/Newey–West para o Brasil, além de análises de estabilidade.</p><div className="interpret-grid"><div><strong>0 &lt; β &lt; 1</strong><span>Repasse parcial</span></div><div><strong>β ≈ 1</strong><span>Repasse proporcional</span></div><div><strong>β &gt; 1</strong><span>Amplificação pontual</span></div></div><p>Essas descrições exigem leitura dos intervalos de confiança. Os ICs do site usam aproximação normal (± 1,96 × HC0); os p-valores vêm das regressões originais. As duas convenções podem diferir perto de limiares.</p></section>
        <section id="limites"><span className="eyebrow">05 / INTERPRETAÇÃO</span><h2>Precisão, identificação e alcance.</h2><ul className="method-list"><li><strong>Exogeneidade.</strong> A interpretação causal requer que a surpresa não esteja correlacionada com outros determinantes das taxas, condicionada às defasagens.</li><li><strong>Informação e notícias.</strong> FF3 pode incorporar informação revelada pelo Fed. As surpresas DI incluem o período noturno, sujeito a outras notícias.</li><li><strong>Desagregação.</strong> A inferência não incorpora incerteza adicional da geração dos valores diários.</li><li><strong>Precisão.</strong> Não rejeitar β = 0 não prova ausência de efeito. Não rejeitar estabilidade também não prova que o parâmetro seja invariável.</li><li><strong>Alcance.</strong> O desenho não identifica diretamente efeitos sobre volume de crédito, consumo, investimento ou atividade, nem isola os mecanismos institucionais da diferença entre países.</li></ul><p>Nos EUA, a exclusão do evento emergencial de março de 2020 alonga uma janela para 91 dias. A hipoteca 5/1 ARM termina em 2022, quando a série foi descontinuada. No Brasil, a amostra efetiva varia entre agregados livres e séries modernas.</p></section>
        <a href="#/resultados" className="button primary">Explorar os resultados <ArrowRight size={17} /></a>
      </div>
    </div>
  </section>;
}

function ResearchPage() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const citation = 'LOPES, José Victor Santos. Repasse da política monetária às taxas de crédito: evidência atualizada para o Brasil e os Estados Unidos. São Paulo: FGV EESP, 2026. Versão do site ' + research.meta.version + '. Disponível em: https://josevictorsl.github.io/politica-monetaria-credito/.';
  return <section className="container page-section">
    <div className="page-heading"><div><span className="eyebrow">AUTORIA, MATERIAIS E REFERÊNCIAS</span><h1>Sobre a pesquisa.</h1><p>Uma atualização da evidência sobre o repasse monetário aos preços do crédito.</p></div><Globe2 className="page-icon" size={40} /></div>
    <article className="research-cover"><div><span className="eyebrow">ESTUDO COMPLETO · 2026</span><h2>Repasse da política monetária às taxas de crédito: evidência atualizada para o Brasil e os Estados Unidos.</h2><p>A pesquisa replica Elias e Guimarães (2024), reconstrói medidas de surpresa monetária, estende as amostras e examina a estabilidade dos resultados.</p><PdfLink className="button primary">Abrir estudo em PDF</PdfLink></div><div className="cover-meta"><span className="avatar large">JV</span><h3>José Victor Santos Lopes</h3><p>Autor</p><hr /><strong>FGV EESP</strong><p>Escola de Economia de São Paulo<br />Fundação Getulio Vargas</p><strong>Orientação</strong><p>Bernardo de Vasconcellos Guimarães</p></div></article>
    <div className="materials-heading"><SectionHeading eyebrow="MATERIAIS DA VERSÃO PUBLICADA" title="Dados que acompanham a leitura." /></div>
    <div className="download-grid">
      {[
        ['dados/resultados.csv', 'Resultados principais', '62 estimativas · coeficientes, erros-padrão, períodos e precisão.', 'CSV'],
        ['dados/pesquisa.json', 'Dados do site', 'Estimativas e séries de surpresas, com metadados da versão.', 'JSON'],
        ['dados/manifesto.json', 'Manifesto de fontes', 'Rastreabilidade dos arquivos de origem por hashes SHA-256.', 'JSON'],
      ].map(([href, title, text, format]) => <a key={href} className="download-card" href={base + href} download><div><span className="pill">{format}</span><ArrowDownToLine size={19} /></div><h3>{title}</h3><p>{text}</p></a>)}
    </div>
    <div className="version-note"><Check size={19} /><div><strong>Versão {research.meta.version} · publicada em {dateLabel(research.meta.publishedDate)}</strong><p>Conjunto fixo de resultados da pesquisa. O site não faz coleta em tempo real nem executa regressões ao alterar os filtros. Os gráficos são gerados a partir das saídas numéricas, sem copiar os valores arredondados dos slides.</p></div></div>
    <section className="citation-section"><SectionHeading eyebrow="CITAÇÃO" title="Como referenciar." /><blockquote>{citation}</blockquote><button className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(citation); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check size={16} /> : <FileText size={16} />}{copied ? 'Referência copiada' : 'Copiar referência'}</button>{copyError && <p role="status">Selecione e copie a referência acima.</p>}</section>
    <section className="references-section"><SectionHeading eyebrow="BASE CIENTÍFICA" title="Referências e fontes essenciais." /><ul className="references"><li><strong>Elias e Guimarães (2024).</strong><span>Artigo de referência do desenho de replicação. Referência bibliográfica completa no estudo em PDF.</span></li><li><strong>Jarociński e Karadi (2020).</strong><span>Deconstructing Monetary Policy Surprises—The Role of Information Shocks. <a href="https://doi.org/10.1257/mac.20180090" target="_blank" rel="noreferrer">American Economic Journal: Macroeconomics <ArrowUpRight size={13} /></a></span></li><li><strong>Banco Central do Brasil.</strong><span>Sistema Gerenciador de Séries Temporais (SGS). <a href="https://www3.bcb.gov.br/sgspub/" target="_blank" rel="noreferrer">Consultar fonte <ArrowUpRight size={13} /></a></span></li><li><strong>Federal Reserve / FRED.</strong><span>Séries de taxas e spreads de crédito dos Estados Unidos. <a href="https://fred.stlouisfed.org/" target="_blank" rel="noreferrer">Consultar fonte <ArrowUpRight size={13} /></a></span></li><li><strong>Bloomberg.</strong><span>Cotações históricas de contratos DI usadas na reconstrução das surpresas brasileiras.</span></li><li><strong>Sax e Steiner (2013).</strong><span>Temporal Disaggregation of Time Series. <a href="https://doi.org/10.32614/RJ-2013-028" target="_blank" rel="noreferrer">The R Journal <ArrowUpRight size={13} /></a></span></li></ul></section>
    <a href="https://github.com/josevictorsl/politica-monetaria-credito" target="_blank" rel="noreferrer" className="text-link">Código e histórico de versões no GitHub <ArrowUpRight size={17} /></a>
  </section>;
}

export default function App() {
  const { path, params, navigate } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(path);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    const title = navigation.find(([route]) => route === path)?.[1] || 'Visão geral';
    document.title = `${title} | Política Monetária e Crédito`;
    if (previousPath.current !== path) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      main.current?.focus({ preventScroll: true });
      previousPath.current = path;
    }
  }, [path]);
  return <>
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); main.current?.focus(); }}>Pular para o conteúdo</a>
    <header className="site-header"><div className="container header-inner"><a className="brand" href="#/" aria-label="Política Monetária e Crédito — início"><span className="brand-icon"><BarChart3 size={23} strokeWidth={1.7} /></span><span>Política Monetária<br /><strong>e Crédito</strong></span></a><nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Navegação principal">{navigation.map(([route, title]) => <a key={route} href={`#${route}`} aria-current={path === route ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{title}</a>)}</nav><a className="header-study" href={`${base}documentos/estudo-completo.pdf`} target="_blank" rel="noreferrer">Estudo completo <ArrowUpRight size={15} /></a><button className="menu-button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button></div></header>
    <main id="main" ref={main} tabIndex={-1}>{path === '/resultados' ? <Results params={params} navigate={navigate} /> : path === '/surpresas' ? <Surprises /> : path === '/metodologia' ? <Methodology /> : path === '/pesquisa' ? <ResearchPage /> : <Home />}</main>
    <footer className="site-footer"><div className="container footer-top"><a href="#/" className="brand"><span className="brand-icon"><BarChart3 size={23} /></span><span>Política Monetária<br /><strong>e Crédito</strong></span></a><p>Uma pesquisa sobre o repasse monetário<br />no Brasil e nos Estados Unidos.</p><a href="#/pesquisa" className="text-link">Fontes e materiais <ArrowUpRight size={16} /></a></div><div className="container footer-bottom"><span>José Victor Santos Lopes · 2026</span><span>Versão {research.meta.version} · FGV EESP</span><a href="https://github.com/josevictorsl/politica-monetaria-credito" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a></div></footer>
  </>;
}
