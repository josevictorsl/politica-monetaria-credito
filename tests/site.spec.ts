import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('leitura inicial, navegação e PDF publicado', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O caminho dos juros');
  await expect(page.locator('.hero-evidence svg g').filter({ hasText: 'Taxa prime' })).toContainText('1,62');
  await expect(page.locator('.hero-evidence svg g').filter({ hasText: 'CP · financeiras' })).toContainText('2,43');
  await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true });
  await page.getByRole('link', { name: 'Explorar resultados', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resultados do repasse.');
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('.js-plotly-plot')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toHaveCount(18);
  await page.screenshot({ path: testInfo.outputPath('resultados.png'), fullPage: true });
  const pdf = await request.get('documentos/estudo-completo.pdf');
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(errors).toEqual([]);
});

test('conteúdo e controles atendem verificações WCAG AA', async ({ page }) => {
  for (const route of ['/', '/motivacao', '/resultados', '/brasil', '/robustez', '/surpresas', '/metodologia', '/pesquisa']) {
    await page.goto(`./#${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (['/resultados', '/brasil', '/robustez', '/surpresas', '/motivacao'].includes(route)) {
      await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations, `${route}: ${JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  }
});

test('filtros mantêm consistência entre URL, tabela e CSV', async ({ page }) => {
  await page.goto('./#/resultados?pais=BR&choque=DI90&modalidade=agregados_livre_pj');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody tr').first()).toContainText('0,93');
  await expect(page.locator('.coefficient-example')).toContainText('9,27 p.b.');
  await expect(page.locator('.coefficient-example')).toContainText('[1,98; 16,56] p.b.');
  await page.getByLabel('Medida de surpresa').selectOption('DI30');
  await expect(page.locator('tbody tr').first()).toContainText('1,12');
  await page.getByLabel('Comparar amostra histórica e atualizada').uncheck();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar seleção em CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('resultados-BR-DI30.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('1.11625634067979');
  expect(csv).toContain('2026-04-29');
  expect(csv.trim().split('\r\n')).toHaveLength(2);
  await page.getByRole('button', { name: 'US Estados Unidos' }).click();
  await expect(page.getByLabel('Medida de surpresa')).toBeDisabled();
  await expect(page.locator('tbody tr')).toHaveCount(13);
  await page.getByLabel('Modalidade de crédito').selectOption('us_2');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('2022');
  await page.reload();
  await expect(page.getByLabel('Modalidade de crédito')).toHaveValue('us_2');
});

test('série de surpresas preserva unidade e amostra efetiva', async ({ page }) => {
  await page.goto('./#/surpresas');
  await expect(page.locator('.shock-stats')).toContainText('200');
  await page.getByText('Consultar valores por reunião').click();
  await expect(page.locator('tbody tr')).toHaveCount(200);
  await page.getByLabel('Período visualizado').selectOption('extension');
  await expect(page.locator('tbody tr')).toHaveCount(52);
  await page.getByRole('button', { name: 'US Estados Unidos' }).click();
  await page.getByLabel('Período visualizado').selectOption('all');
  await expect(page.locator('tbody tr')).toHaveCount(257);
  await expect(page.locator('tbody')).not.toContainText('03/03/2020');
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
});

test('layout cabe na tela e menu funciona no celular', async ({ page }, testInfo) => {
  await page.goto('./');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Metodologia' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Como o repasse é estimado.');
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  }
  for (const route of ['/', '/motivacao', '/resultados', '/brasil', '/robustez', '/surpresas', '/metodologia', '/pesquisa']) {
    await page.goto(`./#${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('composição e distribuição mantêm cobertura e denominador nacional', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/brasil');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('O crédito brasileiro, por dentro.');
  await expect(page.locator('.credit-table tbody tr')).toHaveCount(45);
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('.js-plotly-plot')).toHaveCount(5);
  const binValues = () => page.locator('.beta-bins strong').allTextContents();
  expect((await binValues()).map(v => v.replace(/\s/g, ''))).toEqual(['24,32%', '50,39%', '15,93%', '9,36%']);
  const curve = (horizon: 'DI30' | 'DI90' = 'DI90') => page.getByTestId(`saldo-beta-${horizon}`).evaluate(element => {
    const trace = (element as HTMLElement & { data: { name: string; x: number[]; y: number[] }[] }).data.find(d => d.name === 'Saldo acumulado')!;
    return { first: trace.y[0], last: trace.y[trace.y.length - 1], monotone: trace.y.every((y, i) => i === 0 || y >= trace.y[i - 1]), ordered: trace.x.every((x, i) => i === 0 || x >= trace.x[i - 1]) };
  });
  await expect.poll(async () => (await curve()).last.toFixed(2)).toBe('90.64');
  await expect.poll(async () => (await curve('DI30')).last.toFixed(2)).toBe('90.64');
  expect(await curve()).toMatchObject({ first: 0, monotone: true, ordered: true });
  const pairedAxes = await page.locator('.distribution-compare-grid .js-plotly-plot').evaluateAll(nodes => nodes.map(node => (node as HTMLElement & { layout: { xaxis: { range: number[] }; yaxis: { range: number[] } } }).layout));
  expect(pairedAxes[0].xaxis.range).toEqual(pairedAxes[1].xaxis.range);
  expect(pairedAxes[0].yaxis.range).toEqual(pairedAxes[1].yaxis.range);
  const shares = await page.getByTestId('saldo-faixas-beta').evaluate(element => (element as HTMLElement & { data: { name: string; x: number[] }[] }).data.reduce((sum, trace) => sum + trace.x[0], 0));
  expect(shares).toBeCloseTo(100, 1);
  await page.screenshot({ path: testInfo.outputPath('brasil.png'), fullPage: true });
  await page.getByText('Consultar a tabela de modalidades', { exact: true }).click();
  await expect(page.locator('.credit-table')).toBeVisible();
  await page.getByLabel('Surpresa para a distribuição por beta').selectOption('DI30');
  expect((await binValues()).map(v => v.replace(/\s/g, ''))).toEqual(['30,87%', '47,40%', '12,36%', '9,36%']);
  await page.getByRole('combobox', { name: 'Segmento de crédito', exact: true }).selectOption('livre_pf');
  await expect(page.locator('.credit-table tbody tr')).toHaveCount(9);
  const segmentShare = await page.getByTestId('saldo-faixas-beta').evaluate(element => (element as HTMLElement & { data: { x: number[] }[] }).data.reduce((sum, trace) => sum + trace.x[0], 0));
  expect(segmentShare).toBeCloseTo(34.73, 1);
  await expect.poll(async () => (await curve('DI30')).last.toFixed(2)).toBe('33.85');
  await expect(page.locator('.credit-table tbody tr').filter({ hasText: 'Ajuste de arredondamento' })).toContainText('-1');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar distribuição em CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('distribuicao-brasil-DI30-livre_pf.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.trim().split('\r\n')).toHaveLength(10);
  expect(csv).toContain('"-1"');
  expect(csv).toContain('"DI-30";"";"";""');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Segmento de crédito', exact: true })).toHaveValue('livre_pf');
  await expect(page.getByLabel('Surpresa para a distribuição por beta')).toHaveValue('DI30');
  expect(errors).toEqual([]);
});

test('sete figuras de motivação têm imagens, fontes e dados acessíveis', async ({ page, request }) => {
  await page.goto('./#/motivacao');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Por que investigar o repasse?');
  await expect(page.locator('.motivation-figure')).toHaveCount(7);
  await expect(page.locator('.motivation-figure .js-plotly-plot')).toHaveCount(7);
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
  const charts = await page.locator('.motivation-figure .js-plotly-plot').evaluateAll(nodes => nodes.map(node => (node as HTMLElement & { data: { name: string; x: (string | number)[]; y: number[] }[] }).data));
  expect(charts[0].map(trace => trace.name)).toEqual(['Recursos livres', 'Recursos direcionados', 'Total']);
  expect(charts[0][2].y.at(-1)).toBeCloseTo(56, 0);
  expect(charts[1][0].x[charts[1][0].y.indexOf('Brazil')]).toBeCloseTo(32.52, 1);
  expect(charts[2][0].y[10] + charts[2][1].y[10]).toBeCloseTo(100, 8);
  const compositionTraces = await page.locator('.motivation-figure .js-plotly-plot').nth(2).evaluate(element => (element as HTMLElement & { data: { stackgroup?: string }[] }).data.map(trace => trace.stackgroup));
  expect(compositionTraces).toEqual(['credit-share', 'credit-share']);
  expect(charts[3].map(trace => trace.name)).toEqual(['TJLP', 'TLP', 'Selic meta']);
  const axisTypes = await page.locator('.motivation-figure .js-plotly-plot').evaluateAll(nodes => nodes.map(node => (node as HTMLElement & { layout: { xaxis: { type: string }; yaxis: { range: number[] } } }).layout));
  expect(axisTypes[5].xaxis.type).toBe('date');
  expect(axisTypes[3].xaxis.type).toBe('date');
  expect(axisTypes[2].yaxis.range).toEqual([0, 100]);
  await expect(page.locator('.chart-export')).toHaveCount(7);
  const pngPromise = page.waitForEvent('download');
  await page.locator('.chart-export').first().click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe('motivacao-credito-pib.png');
  const pngStream = await png.createReadStream();
  const pngBytes: Buffer[] = [];
  for await (const chunk of pngStream!) pngBytes.push(Buffer.from(chunk));
  expect(Buffer.concat(pngBytes).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  for (const link of await page.locator('.motivation-source a').filter({ hasText: 'Ver figura original do estudo' }).all()) {
    const response = await request.get((await link.getAttribute('href'))!);
    expect(response.status()).toBe(200);
    expect((await response.body()).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  for (const link of await page.locator('.motivation-source a[download]').all()) {
    const response = await request.get((await link.getAttribute('href'))!);
    expect(response.status()).toBe(200);
    expect((await response.text()).split('\n').length).toBeGreaterThan(2);
  }
  await expect(page.locator('.motivation-gallery')).toContainText('entre 2017 e 2024');
  await page.getByLabel('Gráficos por tema').selectOption('Taxas de referência');
  await expect(page.locator('.motivation-figure')).toHaveCount(2);
  await expect(page.locator('.motivation-gallery')).toContainText('equivalente anual composto');
  await page.getByLabel('Gráficos por tema').selectOption('Escala e custo');
  await page.getByRole('button', { name: 'Modo apresentação' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Fonte: Banco Central do Brasil');
  const presentationAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(presentationAudit.violations.map(v => v.id)).toEqual([]);
  await expect(dialog.locator('.chart-export')).toHaveText(['PNG', 'SVG']);
  const svgPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'SVG' }).click();
  const svg = await svgPromise;
  expect(svg.suggestedFilename()).toMatch(/\.svg$/);
  const svgStream = await svg.createReadStream();
  const svgBytes: Buffer[] = [];
  for await (const chunk of svgStream!) svgBytes.push(Buffer.from(chunk));
  const svgText = Buffer.concat(svgBytes).toString('utf8');
  expect(svgText.slice(0, 500)).toContain('<svg');
  expect(svgText).toContain('Crédito no Brasil (% do PIB)');
  expect(svgText).toContain('Banco Central do Brasil');
  expect(svgText).toContain('2007–2025');
  expect(svgText).toContain('2026.4');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('robustez compara inferência sem confundi-la com quebra', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/robustez');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('O que resiste a outras escolhas?');
  await expect(page.locator('.robustness-errors-table tbody tr')).toHaveCount(3);
  await expect(page.locator('.robustness-page .chart-export')).toHaveCount(2);
  await expect(page.locator('.robustness-errors-table tbody')).toContainText('0,024');
  await expect(page.locator('.robustness-chart .js-plotly-plot')).toHaveCount(2);
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByLabel('Medida de surpresa').selectOption('DI30');
  await expect(page.locator('.robustness-errors-table tbody')).toContainText('0,044');
  await page.getByLabel('Segmento estimado').selectOption('Direcionado: empresas');
  await expect(page.locator('.robustness-chart .js-plotly-plot')).toHaveCount(1);
  await expect(page.locator('.robustness-errors-table tbody tr')).toHaveCount(3);
  await expect(page.locator('.robustness-page')).toContainText('Não rejeita a 5%');
  expect(errors).toEqual([]);
});

test('seleção de modalidade conecta barra, curva acumulada e ficha dos dois horizontes', async ({ page }) => {
  await page.goto('./#/brasil');
  await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByLabel('Modalidade selecionada').selectOption('livre_pj_20550');
  await expect(page.locator('.detail-profile')).toContainText('Capital de giro');
  await expect(page.locator('.detail-profile')).toContainText('DI-30');
  await expect(page.locator('.detail-profile')).toContainText('DI-90');
  await expect(page.locator('.detail-profile')).toContainText('1,85');
  await expect(page.locator('.detail-profile')).toContainText('1,59');
  await expect(page).toHaveURL(/modalidade=livre_pj_20550/);
  await page.getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(page.locator('.detail-profile')).toHaveCount(0);
  await page.getByTestId('saldo-beta-DI90').evaluate(element => {
    const plot = element as HTMLElement & { emit: (name: string, data: unknown) => void };
    plot.emit('plotly_click', { points: [{ customdata: 'livre_pj_20550' }] });
  });
  await expect(page.locator('.detail-profile')).toContainText('Capital de giro');
});
