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
  for (const route of ['/', '/resultados', '/surpresas', '/metodologia', '/pesquisa']) {
    await page.goto(`./#${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (['/resultados', '/surpresas'].includes(route)) {
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
  for (const route of ['/', '/resultados', '/surpresas', '/metodologia', '/pesquisa']) {
    await page.goto(`./#${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
