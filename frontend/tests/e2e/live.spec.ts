import { test, expect } from '@playwright/test';

test.describe('Live Backend E2E Tests (Real API)', () => {
  test.beforeEach(async () => {
    test.skip(!process.env.API_URL, 'Skipping live tests: API_URL environment variable is unset');
  });

  test('picks a game version, verifies version persistence and filters', async ({ page }) => {
    await page.goto('/');

    const versionButton = page.getByRole('button', { name: /select game version/i });
    await expect(versionButton).toBeVisible();

    await versionButton.click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    // Pick the first listbox option whose text does NOT match /all games/i (a real game)
    const realGameOption = listbox.getByRole('option').filter({ hasNotText: /all games/i }).first();
    await expect(realGameOption).toBeVisible();

    const optionText = await realGameOption.textContent();
    // Extract short name without trailing checkmark or extra whitespace (e.g. "Red" or "Blue")
    const chosenVersionName = optionText?.replace(/\s+/g, ' ').trim().split(' ')[0] || '';
    expect(chosenVersionName.length).toBeGreaterThan(0);

    await realGameOption.click();
    await expect(listbox).not.toBeVisible();

    // (a) button aria-label no longer contains "All Games" and now contains chosen version's short name
    await expect(versionButton).not.toHaveAttribute('aria-label', /All Games/);
    await expect(versionButton).toHaveAttribute('aria-label', new RegExp(chosenVersionName, 'i'));

    // (b) localStorage holds a non-null selectedVersionId
    const storedVersionId = await page.evaluate(
      () =>
        localStorage.getItem('selectedVersionId') ||
        localStorage.getItem('poke_architect_selected_version_id')
    );
    expect(storedVersionId).not.toBeNull();
    expect(Number(storedVersionId)).toBeGreaterThan(0);

    // (c) persists after page.reload()
    await page.reload();
    await expect(versionButton).not.toHaveAttribute('aria-label', /All Games/);
    await expect(versionButton).toHaveAttribute('aria-label', new RegExp(chosenVersionName, 'i'));
    const reloadedVersionId = await page.evaluate(
      () =>
        localStorage.getItem('selectedVersionId') ||
        localStorage.getItem('poke_architect_selected_version_id')
    );
    expect(reloadedVersionId).toBe(storedVersionId);
  });

  test('inspects where to catch Pikachu in a version where it is catchable (with version_id request assertion)', async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    // Verify against the live /api/pokemon/{id}/encounters response first
    const encountersRes = await request.get(`${apiUrl}/api/pokemon/25/encounters`);
    expect(encountersRes.ok()).toBeTruthy();
    const encountersData = await encountersRes.json();
    expect(encountersData.length).toBeGreaterThan(0);

    // Pick Red (version_id: 1) where Pikachu is catchable in Viridian Forest
    const versionId = 1;
    await page.addInitScript((vId) => {
      localStorage.setItem('selectedVersionId', String(vId));
      localStorage.setItem('poke_architect_selected_version_id', String(vId));
    }, versionId);

    await page.goto('/compendium');

    // Search for Pikachu in compendium
    const searchInput = page.getByPlaceholder(/search\.\.\./i);
    await searchInput.fill('Pikachu');
    await expect(page.getByText('Pikachu', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Click Pikachu card to open species detail
    await page.getByText('Pikachu', { exact: true }).first().click();

    const whereToCatchBtn = page.getByRole('button', { name: /where to catch/i });
    await expect(whereToCatchBtn).toBeVisible();

    // Assertion 4: opening the encounter modal with a version selected issues a request containing version_id=<id>
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/pokemon/25/encounters') &&
        req.url().includes(`version_id=${versionId}`)
    );

    await whereToCatchBtn.click();

    const encounterReq = await requestPromise;
    expect(encounterReq.url()).toContain(`version_id=${versionId}`);

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /where to catch pikachu/i })).toBeVisible();

    // Assert at least one location group renders with a level range and a percentage
    await expect(page.getByText(/viridian forest/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/lv\./i).first()).toBeVisible();
    await expect(page.getByText(/%/).first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('inspects gift or static Pokémon from live API and asserts Gift / Static appears and 0% does not', async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    // Verify Mewtwo (id 150) encounters in live API contain static encounter
    const mewtwoRes = await request.get(`${apiUrl}/api/pokemon/150/encounters`);
    expect(mewtwoRes.ok()).toBeTruthy();
    const mewtwoData = await mewtwoRes.json();
    expect(mewtwoData.length).toBeGreaterThan(0);

    await page.goto('/compendium');

    // Search for Mewtwo in compendium
    const searchInput = page.getByPlaceholder(/search\.\.\./i);
    await searchInput.fill('Mewtwo');
    await expect(page.getByText('Mewtwo', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Click Mewtwo card to open species detail
    await page.getByText('Mewtwo', { exact: true }).first().click();

    const whereToCatchBtn = page.getByRole('button', { name: /where to catch/i });
    await expect(whereToCatchBtn).toBeVisible();
    await whereToCatchBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /where to catch mewtwo/i })).toBeVisible();

    // Assert "Gift / Static" appears and "0%" does not
    await expect(page.getByText('Gift / Static').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0%', { exact: true })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('views Eevee evolution tree with branching evolutions from real API', async ({ page }) => {
    await page.goto('/compendium');

    const searchInput = page.getByPlaceholder(/search\.\.\./i);
    await searchInput.fill('Eevee');
    await expect(page.getByText('Eevee', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    await page.getByText('Eevee', { exact: true }).first().click();
    await expect(page.getByText(/evolution/i).first()).toBeVisible();
    await expect(page.getByText(/vaporeon/i)).toBeVisible();
  });

  test('opens item bag drawer and browses pockets from real API', async ({ page, request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const pocketsRes = await request.get(`${apiUrl}/api/items/pockets`);
    expect(pocketsRes.ok()).toBeTruthy();
    const pocketsData = await pocketsRes.json();
    const expectedPocketCount = pocketsData.length;

    await page.goto('/compendium');
    await page.getByRole('button', { name: 'Items', exact: true }).click();

    const openBagBtn = page.getByRole('button', { name: /open pocket bag/i });
    await expect(openBagBtn).toBeVisible();
    await openBagBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /trainer bag/i })).toBeVisible();

    // Requirement 2: use getByRole('tab', { name: 'Items', exact: true })
    const itemsTab = page.getByRole('tab', { name: 'Items', exact: true });
    await expect(itemsTab).toBeVisible();

    // Requirement 2: assert number of tabs rendered equals number of pockets returned
    const renderedTabs = page.getByRole('tab');
    await expect(renderedTabs).toHaveCount(expectedPocketCount);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
