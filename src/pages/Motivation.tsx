import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import { base, research } from '../data';

export default function Motivation() {
  const [theme, setTheme] = useState('all');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const themes = [...new Set(research.motivation.map(figure => figure.theme))];
  const figures = research.motivation.filter(figure => theme === 'all' || figure.theme === theme);
  return <section className="container page-section motivation-page">
    <div className="page-heading"><div><span className="eyebrow">CONTEXTO E MOTIVAÇÃO</span><h1>Por que investigar o repasse?</h1><p>Tamanho do mercado, spreads e regras de financiamento ajudam a entender a pergunta da pesquisa.</p></div><a className="button secondary" href="#/brasil">Explorar o crédito brasileiro <ArrowRight size={16} /></a></div>
    <aside className="reading-note motivation-note"><Info size={21} /><div><h3>O contexto que dá origem à pergunta.</h3><p>Estas são as sete figuras de motivação do estudo, atualizadas a partir do artigo de referência. Elas descrevem diferenças econômicas e institucionais; a identificação do repasse depende das surpresas monetárias e das regressões. Os dados não constituem uma demonstração causal dos mecanismos.</p></div></aside>
    <div className="filter-panel motivation-filter"><label>Gráficos por tema<select value={theme} onChange={e => setTheme(e.target.value)}><option value="all">Todos os gráficos de motivação</option>{themes.map(value => <option key={value}>{value}</option>)}</select></label><span aria-live="polite">{figures.length} {figures.length === 1 ? 'figura' : 'figuras'} · versão {research.meta.version}</span></div>
    <div className="motivation-gallery">{figures.map(figure => <article key={figure.id} className="motivation-figure">
      <div className="motivation-figure-heading"><div><span className="eyebrow">{figure.theme}</span><h2>{figure.title}</h2></div><a href={base + figure.image} className="text-link" target="_blank" rel="noreferrer">Ampliar figura <ArrowUpRight size={16} /></a></div>
      <p className="motivation-question">{figure.question}</p>
      <figure><a href={base + figure.image} target="_blank" rel="noreferrer" aria-label={`Abrir em tamanho original: ${figure.title}`}><img src={base + figure.image} alt={`${figure.title}. ${figure.description}`} loading="lazy" decoding="async" onError={() => setFailedImages(current => current.includes(figure.id) ? current : [...current, figure.id])} /></a>{failedImages.includes(figure.id) && <p role="alert">Não foi possível carregar a imagem. Use os dados em CSV abaixo ou tente abrir a figura em tamanho original.</p>}<figcaption><strong>Fonte: {figure.source}.</strong><span>{figure.note}</span></figcaption></figure>
      <div className="motivation-figure-bottom"><p>{figure.description}</p><a className="button secondary" href={base + figure.dataFile} download><ArrowDownToLine size={16} />Dados da figura</a></div>
      {figure.id === 'composicao' && <a className="text-link motivation-detail-link" href="#/brasil">Ver a quebra por famílias, empresas e modalidade <ArrowRight size={16} /></a>}
    </article>)}</div>
    <div className="closing-card motivation-close"><div><span className="eyebrow">DO CONTEXTO À EVIDÊNCIA</span><h2>Como essas diferenças aparecem no repasse?</h2><p>Examine os coeficientes por país e modalidade, junto com os intervalos de confiança.</p></div><a className="button light" href="#/resultados">Explorar resultados <ArrowRight size={17} /></a></div>
  </section>;
}
