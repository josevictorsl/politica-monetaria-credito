import { useEffect, useRef, useState } from 'react';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';

interface Props {
  data: Data[];
  layout: Partial<Layout>;
  label: string;
  height: number;
}

export default function Chart({ data, layout, label, height }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let plot: PlotlyHTMLElement | undefined;
    let purge: (() => void) | undefined;
    let frame = 0;
    import('plotly.js-basic-dist-min').then(async ({ default: Plotly }) => {
      if (cancelled) return;
      purge = () => Plotly.purge(element);
      plot = await Plotly.react(element, data, {
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
        font: { family: 'Arial, sans-serif', size: 12, color: '#52615c' },
        separators: ',.',
        hoverlabel: { bgcolor: '#172f3d', font: { color: '#ffffff', size: 13 }, bordercolor: '#172f3d' },
        ...layout, autosize: true, height,
      }, { responsive: true, displayModeBar: false, scrollZoom: false });
      if (cancelled) { purge(); return; }
      setStatus('ready');
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { if (!cancelled && plot) void Plotly.Plots.resize(plot); });
      });
      observer.observe(element);
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; observer?.disconnect(); cancelAnimationFrame(frame); purge?.(); };
  }, [data, layout, height]);

  return <div className="chart-shell" style={{ minHeight: height }}>
    {status === 'loading' && <div className="chart-loading" role="status">Carregando visualização…</div>}
    {status === 'error' && <div className="chart-loading" role="alert">Não foi possível carregar o gráfico. Os valores continuam disponíveis na tabela abaixo.</div>}
    <div ref={container} role="img" aria-label={label} className="plot" data-testid="plot" />
  </div>;
}
