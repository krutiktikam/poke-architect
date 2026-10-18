import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const loadFixture = (relPath: string) => {
  return JSON.parse(fs.readFileSync(new URL(relPath, import.meta.url), 'utf-8'));
};

const versionsFixture = loadFixture('../fixtures/api/versions.json');
const dataVersionFixture = loadFixture('../fixtures/api/data_version.json');
const itemPocketsFixture = loadFixture('../fixtures/api/item_pockets.json');
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

test.describe('Game-Aware Workflows E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', (req) =>
      console.log('REQ FAILED:', req.url(), req.failure()?.errorText)
    );

    // Specific endpoints must be handled before the generic pokemon catch-all
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
    // Use regex to strictly match pokemon list queries without matching sub-resources like /encounters
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

  test('game version selector in Header allows selecting a game version and persists', async ({
    page,
  }) => {
    await page.goto('/');

    const versionButton = page.getByRole('button', { name: /select game version/i });
    await expect(versionButton).toBeVisible();

    // Open version selector
    await versionButton.click();

    // Check generation groups are visible
    await expect(page.getByText('Gen I (Kanto)')).toBeVisible();

    // Select Red version
    const redOption = page.getByRole('option', { name: 'Red', exact: true }).first();
    await redOption.click();

    // Dropdown closes and button updates label
    await expect(page.getByRole('listbox')).not.toBeVisible();
    await expect(versionButton).toContainText('Red');

    // Verify localStorage has version persisted
    const storedVersion = await page.evaluate(() =>
      localStorage.getItem('poke_architect_selected_version_id')
    );
    expect(['1', '44']).toContain(storedVersion);
  });

  test('compendium evolution tree renders species hierarchy and branching', async ({ page }) => {
    await page.goto('/compendium');

    // Click on Eevee in the list
    await page.getByText('Eevee', { exact: true }).first().click();

    // Evolution tree details should be displayed
    await expect(page.getByText('Species Detail & Evolution Chain')).toBeVisible();
    await expect(page.getByText('Water Stone')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Thunder Stone')).toBeVisible();
    await expect(page.getByText('Vaporeon')).toBeVisible();
    await expect(page.getByText('Jolteon')).toBeVisible();
  });

  test('encounter modal opens, groups locations, and supports search', async ({ page }) => {
    await page.goto('/compendium');

    // Wait for Eevee to be loaded in compendium list
    await expect(page.getByText('Eevee', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Select Eevee to open detail view
    await page.getByText('Eevee', { exact: true }).first().click();

    // Click 'Where to catch' button in detail header
    const catchButton = page.getByRole('button', { name: /where to catch/i });
    await expect(catchButton).toBeVisible();
    await catchButton.click();

    // Encounter dialog should be open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /where to catch eevee/i })).toBeVisible();

    // Search for a location in fixture
    const searchInput = page.getByPlaceholder(/search locations/i);
    await searchInput.fill('Trophy');

    await expect(page.getByRole('dialog')).toBeVisible();

    // Close dialog with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('item bag drawer opens, switches pockets, and searches items', async ({ page }) => {
    await page.goto('/compendium');

    // Go to items tab
    await page.getByRole('button', { name: 'Items', exact: true }).click();

    // Open Pocket Bag
    await page.getByRole('button', { name: /open pocket bag/i }).click();

    // Bag drawer dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /trainer bag/i })).toBeVisible();

    // Switch pocket to Medicine
    await page.getByRole('tab', { name: 'Medicine' }).click();
    await expect(page.getByText('Hp Up')).toBeVisible();

    // Search for an item
    const searchInput = page.getByPlaceholder(/search items/i);
    await searchInput.fill('Heart Scale');

    await expect(page.getByText('Heart Scale')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('berry planner displays growth timeline, radar chart, and Natural Gift mechanics', async ({
    page,
  }) => {
    await page.goto('/compendium');

    // Go to Berries & Farm tab
    await page.getByRole('button', { name: /berries & farm/i }).click();

    // Check berry details rendered
    await expect(page.getByRole('heading', { name: /cheri berry/i })).toBeVisible();
    await expect(page.getByText('Farm Planner & Growth Timeline')).toBeVisible();
    await expect(page.getByText('12 hours')).toBeVisible();

    // Stages
    await expect(page.getByText('Seedling')).toBeVisible();
    await expect(page.getByText('Berry Yield')).toBeVisible();

    // Flavor profile and Natural Gift
    await expect(page.getByText('Flavor Potency Profile')).toBeVisible();
    await expect(page.getByText('Battle Planner: Natural Gift')).toBeVisible();
    await expect(page.getByText('60 BP', { exact: true })).toBeVisible();
  });

  test('low-power toggle removes canvas slot from the DOM and persists', async ({ page }) => {
    await page.goto('/');

    const qualityBtn = page.getByRole('button', { name: /visual quality mode/i });
    await expect(qualityBtn).toBeVisible();

    // Open quality dropdown
    await qualityBtn.click();
    await page.getByRole('button', { name: /low quality/i }).click();

    // Verify #hero-canvas-slot is removed from the DOM
    await expect(page.locator('#hero-canvas-slot')).toHaveCount(0);

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator('#hero-canvas-slot')).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem('poke_visual_quality_mode'));
    expect(stored).toBe('low');
  });

  test('prefers-reduced-motion forces low mode in auto and removes canvas slot from the DOM', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // In auto mode with reducedMotion: reduce, resolvedQuality is low -> canvas slot unmounted
    await expect(page.locator('#hero-canvas-slot')).toHaveCount(0);
  });
});
