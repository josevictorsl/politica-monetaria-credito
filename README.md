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
- Metodologia, fontes, estudo completo em PDF e manifesto de versão.

React, TypeScript, Vite, Tailwind CSS, Lucide e Plotly (carregado sob demanda). Sem servidor de aplicação ou coleta em tempo real.

## Atualizar uma versão da pesquisa

O repositório contém somente os dados selecionados para o site e o PDF. O pipeline econométrico e as entradas originais ficam no ambiente de pesquisa.

Requer Python 3.10 ou superior. Na estrutura local original, basta:

```bash
python scripts/exportar_dados.py --version 2026.1
```

Em outro computador, indique a pasta que contém `saidas/` e `documentos/`:

```bash
python scripts/exportar_dados.py --source-root "CAMINHO_DA_PESQUISA" --version 2026.2
```

O exportador confere unicidade, dados finitos, contagens, âncoras brasileiras, equivalência das tabelas americanas e números de observações dos painéis. As datas americanas são recuperadas das linhas completas usadas nos modelos. Os hashes SHA-256 dos arquivos usados são gravados no manifesto.

Revise os conteúdos e as âncoras do exportador ao alterar a amostra. Revise o PDF e o conjunto exportado antes de publicar. O site usa a precisão original dos CSVs; não copia números arredondados de apresentações.

## Convenções científicas

- Modelos principais sem constante, com duas defasagens e erros-padrão HC0.
- ICs por aproximação normal: beta ± 1,96 × HC0. P-valores das regressões originais; as convenções podem divergir perto dos limiares.
- Surpresas originalmente em pontos percentuais são multiplicadas por 100 para exibição em pontos-base.
- FF3 não equivale mecanicamente à variação observada da meta de juros. As medidas DI e FF3 não são idênticas.
- O recorte histórico das surpresas mostra a série disponível reconstruída, não uma comparação com cotações originais do artigo.
- Selecionar datas no gráfico não executa uma nova regressão.
- Não significância não prova ausência de efeito; estrelas testam beta = 0, não beta = 1.

## Verificação

```bash
npx playwright install chromium
npm run build
npm test
```

Testes de integração em computador e celular verificam filtros, URLs, dados exportados, exclusão do evento emergencial, PDF e ausência de transbordamento horizontal da página. Verificações automatizadas com axe-core cobrem regras WCAG A/AA, incluindo contraste e nomes acessíveis dos controles.

## Publicação

`.github/workflows/pages.yml` instala com `npm ci`, gera `dist/` e publica pelo GitHub Pages. Em **Settings → Pages**, selecione **GitHub Actions** como origem. Commits na branch `main` disparam a publicação.

O PDF mantém sua identidade e redação acadêmicas originais. A identidade pública da interface é **Política Monetária e Crédito**. A afiliação acadêmica é informativa; o site é de autoria do pesquisador.
