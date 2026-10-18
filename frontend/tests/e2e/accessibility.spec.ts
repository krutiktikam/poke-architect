import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const loadFixture = (relPath: string) => {
  return JSON.parse(fs.readFileSync(new URL(relPath, import.meta.url), 'utf-8'));
};

interface PocketCategoryFixture {
  id: number;
  name: string;
  items: unknown[];
}

interface PocketFixture {
  id: number;
  name: string;
  categories: PocketCategoryFixture[];
}

const versionsFixture = loadFixture('../fixtures/api/versions.json');
const dataVersionFixture = loadFixture('../fixtures/api/data_version.json');
const rawItemPockets: PocketFixture[] = loadFixture('../fixtures/api/item_pockets.json');
const itemPocketsFixture = rawItemPockets.map((pocket) => ({
  ...pocket,
  categories: pocket.categories.slice(0, 2).map((cat) => ({
    ...cat,
    items: cat.items.slice(0, 6),
  })),
}));
const berriesFixture = loadFixture('../fixtures/api/berries.json');
const eeveeEvolutionsFixture = loadFixture('../fixtures/api/eevee_evolutions.json');
const pokemonEncountersFixture = loadFixture('../fixtures/api/pokemon_encounters.json');

const samplePokemonList = [
  {
    id: 133,
    name: 'Eevee',
    type1: 'normal',
    type2: null,
    hp: 55,
    attack: 55,
    defense: 50,
    special_attack: 45,
    special_defense: 65,
    speed: 55,
    sprite_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
    generation: 1,
    is_legendary: false,
    is_mythical: false,
    role: 'Support',
    tier: 'OU',
  },
];

const assertNoSeriousOrCriticalViolations = async (page: Page, selector?: string) => {
  const builder = new AxeBuilder({ page }).disableRules(['color-contrast', 'region']);
  if (selector) {
    builder.include(selector);
  }
  const scanResults = await builder.analyze();
  const criticalOrSerious = scanResults.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact || '')
  );
  expect(criticalOrSerious).toEqual([]);
};

test.describe('E2E Accessibility (Axe) Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/versions*', async (route) => {
      await route.fulfill({ status: 200, json: versionsFixture });
    });
    await page.route('**/api/meta/data-version*', async (route) => {
      await route.fulfill({ status: 200, json: dataVersionFixture });
    });
    await page.route('**/api/items/pockets*', async (route) => {
      await route.fulfill({ status: 200, json: itemPocketsFixture });
    });
    await page.route('**/api/berries*', async (route) => {
      await route.fulfill({ status: 200, json: berriesFixture });
    });
    await page.route('**/api/pokemon/*/evolutions*', async (route) => {
      await route.fulfill({ status: 200, json: eeveeEvolutionsFixture });
    });
    await page.route('**/api/pokemon/*/encounters*', async (route) => {
      await route.fulfill({ status: 200, json: pokemonEncountersFixture });
    });
    await page.route(/\/api\/pokemon(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, json: samplePokemonList });
    });
    await page.route(/\/api\/items(\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/moves*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/abilities*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
  });

  test('home/builder page passes axe accessibility scan', async ({ page }) => {
    await page.goto('/');
    await assertNoSeriousOrCriticalViolations(page);
  });

  test('compendium page passes axe accessibility scan', async ({ page }) => {
    await page.goto('/compendium');
    await assertNoSeriousOrCriticalViolations(page);
  });

  test('version selector dropdown open state passes axe accessibility scan', async ({ page }) => {
    await page.goto('/');
    const versionBtn = page.getByRole('button', { name: /select game version/i });
    await versionBtn.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await assertNoSeriousOrCriticalViolations(page);
  });

  test('EncounterModal open state passes axe accessibility scan', async ({ page }) => {
    await page.goto('/compendium');
    await expect(page.getByText('Eevee', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await page.getByText('Eevee', { exact: true }).first().click();

    const catchBtn = page.getByRole('button', { name: /where to catch/i });
    await expect(catchBtn).toBeVisible();
    await catchBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /where to catch eevee/i })).toBeVisible();

    await assertNoSeriousOrCriticalViolations(page);
  });

  test('ItemBagDrawer open state in browse mode passes axe accessibility scan', async ({ page }) => {
    await page.goto('/compendium');
    await page.getByRole('button', { name: 'Items', exact: true }).click();

    const openBagBtn = page.getByRole('button', { name: /open pocket bag/i });
    await expect(openBagBtn).toBeVisible();
    await openBagBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /trainer bag/i })).toBeVisible();

    await assertNoSeriousOrCriticalViolations(page, '[role="dialog"]');
  });

  test('ItemBagDrawer open state in select mode passes axe accessibility scan', async ({ page }) => {
    await page.goto('/compendium');
    await page.getByRole('button', { name: 'Items', exact: true }).click();

    const selectItemBtn = page.getByRole('button', { name: /select held item/i });
    await expect(selectItemBtn).toBeVisible();
    await selectItemBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /trainer bag/i })).toBeVisible();

    await assertNoSeriousOrCriticalViolations(page, '[role="dialog"]');
  });

  test('BerryDetail view passes axe accessibility scan', async ({ page }) => {
    await page.goto('/compendium');
    await page.getByRole('button', { name: /berries & farm/i }).click();
    await expect(page.getByText('Farm Planner & Growth Timeline')).toBeVisible();
    await expect(page.getByRole('heading', { name: /cheri berry/i })).toBeVisible();

    await assertNoSeriousOrCriticalViolations(page);
  });
});
