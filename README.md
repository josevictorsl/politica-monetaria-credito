# Política Monetária e Crédito

Site da pesquisa de José Victor Santos Lopes sobre o repasse de surpresas monetárias às taxas de crédito no Brasil e nos Estados Unidos. FGV EESP, orientação de Bernardo de Vasconcellos Guimarães.

**Site:** https://josevictorsl.github.io/politica-monetaria-credito/

## Executar

Requer Node.js 24 e npm.

```bash
npm ci
npm run dev
```

O Vite informa o endereço local; a aplicação usa a base `/politica-monetaria-credito/`. As páginas usam rotas no fragmento (`#/resultados`), compatíveis com abertura direta e recarga no GitHub Pages. Os filtros de resultados são preservados no link.

```bash
npm run build
npm run preview
```

## Conteúdo

- Apresentação didática, conceitos e evidências principais.
- Painel de 9 agregados brasileiros e 13 modalidades americanas.
- Comparação entre amostras histórica e atualizada, DI-30/DI-90/FF3.
- Coeficientes e ICs de 95%, tabela técnica e exportação CSV da seleção.
- Séries de surpresas em pontos-base com recorte de período e download.
- Composição do crédito brasileiro: quatro segmentos e 45 modalidades/resíduos em julho de 2026, com detalhamento por segmento.
- Distribuição acumulada do saldo pelos betas DI-30/DI-90, faixas de repasse e cobertura do mapeamento explicitamente separada.
- Sete gráficos de motivação do estudo, com explicação, fonte, ampliação da imagem original e dados em CSV.
- Gráficos de motivação interativos com tooltips, destaque de marcos e exportação em PNG.
- Comparação DI-30/DI-90 sincronizada, modo de apresentação e exportação PNG/SVG com título, fonte e versão.
- Comparação lado a lado em escalas idênticas e barra empilhada do saldo pelas faixas de beta.
- Fichas por modalidade conectando saldo, participação no segmento e betas DI-30/DI-90.
- Robustez brasileira HC0/HC3/HAC, janelas móveis HC3 e testes estruturais do corte de 2020.
- Metodologia, fontes, estudo completo em PDF e manifesto de versão.

React, TypeScript, Vite, Tailwind CSS, Lucide e Plotly (carregado sob demanda). Sem servidor de aplicação ou coleta em tempo real.

## Atualizar uma versão da pesquisa

O repositório contém somente os dados selecionados para o site e o PDF. O pipeline econométrico e as entradas originais ficam no ambiente de pesquisa.

Requer Python 3.10 ou superior. Na estrutura local original, basta:

```bash
python scripts/exportar_dados.py --version 2026.4
```

Em outro computador, indique a pasta que contém `saidas/` e `documentos/`:

```bash
python scripts/exportar_dados.py --source-root "CAMINHO_DA_PESQUISA" --version 2026.5
```

O exportador confere unicidade, dados finitos, contagens, âncoras brasileiras, equivalência das tabelas americanas e números de observações dos painéis. As datas americanas são recuperadas das linhas completas usadas nos modelos. Os hashes SHA-256 dos arquivos usados são gravados no manifesto.

Para a composição, confere saldo e participações de cada modalidade, fechamento dos quatro segmentos, correspondência com a última observação histórica e equivalência de cada beta com a regressão completa. Preserva os ajustes de arredondamento assinados e os mapeamentos aproximados. A cobertura de 90,64% e as faixas de beta são conferidas com as âncoras do estudo. Os sete PNGs de motivação e suas cinco bases CSV são copiados das saídas da pesquisa e incluídos no manifesto.

As sete figuras de motivação têm versões interativas geradas das mesmas bases: spreads internacionais com o ano individual por país; composição do crédito convertida para participação; séries TJLP/TLP/Selic separadas; spreads livres agregados por média anual; e comparações de crédito/PIB. O exportador também valida betas e p-valores HC0/HC3/HAC, janelas móveis HC3 e testes Chow/Wald antes de publicar a nova página de robustez.

Os metadados de cada gráfico identificam o tipo do eixo horizontal (linear ou data) e o período de referência. As participações da composição são conferidas em 100% por período e as datas trimestrais do BIS permanecem datas, evitando uma escala temporal tratada como contínua numérica.

Revise os conteúdos e as âncoras do exportador ao alterar a amostra. Revise o PDF e o conjunto exportado antes de publicar. O site usa a precisão original dos CSVs; não copia números arredondados de apresentações.

## Convenções científicas

- Modelos principais sem constante, com duas defasagens e erros-padrão HC0.
- ICs por aproximação normal: beta ± 1,96 × HC0. P-valores das regressões originais; as convenções podem divergir perto dos limiares.
- Surpresas originalmente em pontos percentuais são multiplicadas por 100 para exibição em pontos-base.
- FF3 não equivale mecanicamente à variação observada da meta de juros. As medidas DI e FF3 não são idênticas.
- O recorte histórico das surpresas mostra a série disponível reconstruída, não uma comparação com cotações originais do artigo.
- Selecionar datas no gráfico não executa uma nova regressão.
- Não significância não prova ausência de efeito; estrelas testam beta = 0, não beta = 1.
- Na distribuição, todas as participações usam o saldo nacional como denominador, mesmo ao filtrar um segmento. A curva não é renormalizada para 100%: apenas modalidades com beta entram nela.
- Saldo de julho de 2026 pondera betas de regressões encerradas em abril de 2026. A distribuição é descritiva, não um coeficiente agregado, e não incorpora a incerteza dos betas.
- A decomposição mostra as dez maiores entradas e agrupa as restantes nas barras; todas as 45 entradas, incluindo resíduos e ajustes, continuam na tabela e no CSV.
- Figuras de motivação contextualizam os resultados. Anos internacionais heterogêneos e conceitos distintos de saldo são explicitados nas legendas.
- A ficha interativa da modalidade apresenta os dois horizontes e suas amostras. O clique em pontos/barras seleciona o mesmo item, sem recomputar estatísticas.
- As curvas DI-30/DI-90 compartilham limites de eixo; a barra por faixas inclui os betas mapeados e o saldo sem beta no mesmo denominador nacional.
- A exportação do modo apresentação incorpora título, fonte, período e versão; o SVG é vetorial e o PNG destina-se a slides.
- A exemplo de 10 pontos-base no painel, a resposta mostrada é uma escala linear do coeficiente estimado, não uma previsão nem um resultado reestimado.
- Na robustez, os coeficientes são mantidos enquanto HC0/HC3/HAC alteram erros-padrão; janelas móveis são diagnósticos visuais, não testes independentes de quebra.

## Verificação

```bash
npx playwright install chromium
npm run build
npm test
```

Testes de integração em computador e celular verificam filtros, URLs, dados exportados, exclusão do evento emergencial, PDF, eixos/áreas/valores dos gráficos, escalas DI-30/DI-90, fichas de modalidade, exportações PNG/SVG, robustez, acessibilidade axe-core WCAG A/AA e ausência de transbordamento horizontal.

## Publicação

`.github/workflows/pages.yml` instala com `npm ci`, gera `dist/` e publica pelo GitHub Pages. Em **Settings → Pages**, selecione **GitHub Actions** como origem. Commits na branch `main` disparam a publicação.

O PDF mantém sua identidade e redação acadêmicas originais. A identidade pública da interface é **Política Monetária e Crédito**. A afiliação acadêmica é informativa; o site é de autoria do pesquisador.
