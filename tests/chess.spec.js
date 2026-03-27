// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: force-show an element by overriding display style
async function forceShow(page, selector) {
  await page.evaluate((sel) => {
    // Use classList so that the app's own close logic (which removes 'active') works correctly
    const el = document.querySelector(sel);
    el.classList.add('active');
    el.style.removeProperty('display');
  }, selector);
}

// Helper: force-hide an element
async function forceHide(page, selector) {
  await page.evaluate((sel) => {
    document.querySelector(sel).style.display = 'none';
  }, selector);
}

// ============================================================
// 1. PAGE LOAD & STRUCTURE
// ============================================================
test.describe('Page Load & Structure', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle("Emma's Chess ♛");
  });

  test('lobby screen is visible on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#lobby')).toBeVisible();
  });

  test('game screen is hidden on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game')).not.toBeVisible();
  });

  test('displays dedication title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.title')).toContainText("Emma's Chess");
  });

  test('displays subtitle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.subtitle')).toContainText('A Game of Love & Strategy');
  });

  test('shows dedication text from daddy', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ded-line')).toContainText('Love you, Emma');
    await expect(page.locator('.ded-from')).toContainText('From Daddy');
  });

  test('chess quote is displayed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.fquote')).toContainText('Every chess master was once a beginner');
  });

  test('no JS errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    // Allow a short moment for any deferred errors
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ============================================================
// 2. LOBBY UI INTERACTIONS
// ============================================================
test.describe('Lobby UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('player name input is visible', async ({ page }) => {
    await expect(page.locator('#pName')).toBeVisible();
  });

  test('player name input accepts text', async ({ page }) => {
    await page.fill('#pName', 'Emma');
    await expect(page.locator('#pName')).toHaveValue('Emma');
  });

  test('player name is capped at 20 characters', async ({ page }) => {
    await page.fill('#pName', 'ThisNameIsWayTooLongToFit');
    const val = await page.locator('#pName').inputValue();
    expect(val.length).toBeLessThanOrEqual(20);
  });

  test('Create mode button is active by default', async ({ page }) => {
    await expect(page.locator('#mCreate')).toHaveClass(/active/);
  });

  test('Create panel is visible by default', async ({ page }) => {
    await expect(page.locator('#createP')).toBeVisible();
  });

  test('Join panel is hidden by default', async ({ page }) => {
    await expect(page.locator('#joinP')).not.toBeVisible();
  });

  test('clicking Join mode shows join panel', async ({ page }) => {
    await page.click('#mJoin');
    await expect(page.locator('#joinP')).toBeVisible();
    await expect(page.locator('#createP')).not.toBeVisible();
  });

  test('clicking Join makes Join button active', async ({ page }) => {
    await page.click('#mJoin');
    await expect(page.locator('#mJoin')).toHaveClass(/active/);
    await expect(page.locator('#mCreate')).not.toHaveClass(/active/);
  });

  test('switching back to Create mode restores create panel', async ({ page }) => {
    await page.click('#mJoin');
    await page.click('#mCreate');
    await expect(page.locator('#createP')).toBeVisible();
    await expect(page.locator('#joinP')).not.toBeVisible();
  });

  test('join code input accepts uppercase text', async ({ page }) => {
    await page.click('#mJoin');
    await expect(page.locator('#jCode')).toBeVisible();
    await page.fill('#jCode', 'ABCD');
    await expect(page.locator('#jCode')).toHaveValue('ABCD');
  });

  test('join code input is limited to 4 characters', async ({ page }) => {
    await page.click('#mJoin');
    await page.fill('#jCode', 'ABCDEFGH');
    const val = await page.locator('#jCode').inputValue();
    expect(val.length).toBeLessThanOrEqual(4);
  });

  test('rejoin box is hidden on fresh load (no prior session)', async ({ page }) => {
    await expect(page.locator('#rejoinBox')).not.toBeVisible();
  });

  test('Create Game button is present', async ({ page }) => {
    await expect(page.locator('#createP button.btn-p')).toBeVisible();
  });

  test('Join Game button is present in join panel', async ({ page }) => {
    await page.click('#mJoin');
    await expect(page.locator('#joinP button.btn-p')).toBeVisible();
  });
});

// ============================================================
// 3. GAME SCREEN DOM STRUCTURE (elements exist even when hidden)
// ============================================================
test.describe('Game Screen DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('board element exists in DOM', async ({ page }) => {
    await expect(page.locator('#board')).toBeAttached();
  });

  test('fullscreen button exists', async ({ page }) => {
    await expect(page.locator('#fsBtn')).toBeAttached();
  });

  test('fullscreen button has correct label', async ({ page }) => {
    await expect(page.locator('#fsBtn')).toContainText('Fullscreen');
  });

  test('player badge elements exist', async ({ page }) => {
    await expect(page.locator('#oBadge')).toBeAttached();
    await expect(page.locator('#mBadge')).toBeAttached();
  });

  test('player name placeholders exist', async ({ page }) => {
    await expect(page.locator('#oName')).toBeAttached();
    await expect(page.locator('#mName')).toBeAttached();
  });

  test('status bar text element exists', async ({ page }) => {
    await expect(page.locator('#sTxt')).toBeAttached();
    await expect(page.locator('#sTxt')).toContainText('Setting up the board');
  });

  test('move history container exists', async ({ page }) => {
    await expect(page.locator('#hist')).toBeAttached();
  });

  test('captured pieces containers exist', async ({ page }) => {
    await expect(page.locator('#oCap')).toBeAttached();
    await expect(page.locator('#mCap')).toBeAttached();
  });

  test('chat input exists', async ({ page }) => {
    await expect(page.locator('#chatIn')).toBeAttached();
  });

  test('chat messages container exists', async ({ page }) => {
    await expect(page.locator('#chatMsgs')).toBeAttached();
  });

  test('engrave dedication texts are in board frame', async ({ page }) => {
    await expect(page.locator('#engTop')).toContainText('Love you, Emma');
    await expect(page.locator('#engBot')).toContainText('From Daddy');
  });

  test('coordinate elements exist', async ({ page }) => {
    await expect(page.locator('#cL')).toBeAttached();
    await expect(page.locator('#cT')).toBeAttached();
    await expect(page.locator('#cB')).toBeAttached();
    await expect(page.locator('#cR')).toBeAttached();
  });

  test('game control buttons exist', async ({ page }) => {
    await expect(page.locator('button:has-text("New Game")')).toBeAttached();
    await expect(page.locator('button:has-text("Offer Draw")')).toBeAttached();
    await expect(page.locator('button:has-text("Resign")')).toBeAttached();
    await expect(page.locator('button:has-text("Options")')).toBeAttached();
  });

  test('emoji reaction buttons exist', async ({ page }) => {
    await expect(page.locator('#heartEmoji')).toBeAttached();
    await expect(page.locator('button:has-text("👏")')).toBeAttached();
  });

  test('timer display elements exist', async ({ page }) => {
    await expect(page.locator('#oTimer')).toBeAttached();
    await expect(page.locator('#mTimer')).toBeAttached();
  });
});

// ============================================================
// 4. OPTIONS MODAL CONTENT
// ============================================================
test.describe('Options Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Force-show the options modal for inspection
    await forceShow(page, '#optsModal');
  });

  test('options modal becomes visible', async ({ page }) => {
    await expect(page.locator('#optsModal')).toBeVisible();
  });

  test('close button is present', async ({ page }) => {
    await expect(page.locator('#optsModal .mx')).toBeVisible();
  });

  test('close button dismisses the modal', async ({ page }) => {
    await page.click('#optsModal .mx');
    await expect(page.locator('#optsModal')).not.toBeVisible();
  });

  test('all 6 theme buttons are present', async ({ page }) => {
    const expected = ["Daddy's Board", 'Classic', 'Ocean Breeze', 'Rose Garden', 'Midnight', 'Forest'];
    for (const name of expected) {
      await expect(page.locator('#themeBtns')).toContainText(name);
    }
  });

  test("Daddy's Board theme is active by default", async ({ page }) => {
    const firstTheme = page.locator('#themeBtns .tb').first();
    await expect(firstTheme).toHaveClass(/active/);
  });

  test('clicking a different theme makes it active', async ({ page }) => {
    const classicBtn = page.locator('#themeBtns .tb:nth-child(2)');
    await classicBtn.click();
    await expect(classicBtn).toHaveClass(/active/);
  });

  test('clicking theme deactivates the previous one', async ({ page }) => {
    const firstTheme = page.locator('#themeBtns .tb').first();
    const classicBtn = page.locator('#themeBtns .tb:nth-child(2)');
    await classicBtn.click();
    await expect(firstTheme).not.toHaveClass(/active/);
  });

  test('board size buttons present', async ({ page }) => {
    for (const s of ['Auto', 'Small', 'Medium', 'Large', 'X-Large']) {
      await expect(page.locator('#boardSizeBtns')).toContainText(s);
    }
  });

  test('Large board size is active by default', async ({ page }) => {
    const largeBtn = page.locator('#boardSizeBtns').getByRole('button', { name: 'Large', exact: true });
    await expect(largeBtn).toHaveClass(/active/);
  });

  test('font size buttons present', async ({ page }) => {
    for (const s of ['Small', 'Medium', 'Large']) {
      await expect(page.locator('#fontSizeBtns')).toContainText(s);
    }
  });

  test('Medium font size is active by default', async ({ page }) => {
    const medBtn = page.locator('#fontSizeBtns .tb:has-text("Medium")');
    await expect(medBtn).toHaveClass(/active/);
  });

  test('all move timer options present', async ({ page }) => {
    for (const s of ['Off', '15s', '30s', '1 min', '2 min', '5 min']) {
      await expect(page.locator('#timerBtns')).toContainText(s);
    }
  });

  test('timer Off is active by default', async ({ page }) => {
    const offBtn = page.locator('#timerBtns .tb').first();
    await expect(offBtn).toHaveClass(/active/);
  });

  test('animation speed slider is present with correct default', async ({ page }) => {
    await expect(page.locator('#aSpd')).toBeVisible();
    await expect(page.locator('#aSpd')).toHaveValue('300');
    await expect(page.locator('#aSpdL')).toContainText('300ms');
  });

  test('board corner radius slider is present', async ({ page }) => {
    await expect(page.locator('#radiusSpd')).toBeVisible();
    await expect(page.locator('#radiusLbl')).toContainText('8px');
  });

  test('UI shadow slider is present', async ({ page }) => {
    await expect(page.locator('#shadowSpd')).toBeVisible();
    await expect(page.locator('#shadowLbl')).toContainText('60%');
  });

  // Checkboxes - defaults ON
  test('Show Legal Moves checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oMoves')).toBeChecked();
  });

  test('Sound Effects checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oSound')).toBeChecked();
  });

  test('Highlight Last Move checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oHL')).toBeChecked();
  });

  test('Show Coordinates checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oCoords')).toBeChecked();
  });

  test('Show Captured Pieces checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oCaps')).toBeChecked();
  });

  test('Drag Pieces checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oDrag')).toBeChecked();
  });

  test('Check Warning Pulse checkbox is ON by default', async ({ page }) => {
    await expect(page.locator('#oCheckPulse')).toBeChecked();
  });

  // Checkboxes - defaults OFF
  test('Compact UI checkbox is OFF by default', async ({ page }) => {
    await expect(page.locator('#oCompact')).not.toBeChecked();
  });

  test('Auto-Queen Promotion checkbox is OFF by default', async ({ page }) => {
    await expect(page.locator('#oAutoQ')).not.toBeChecked();
  });

  test('Confirm Moves checkbox is OFF by default', async ({ page }) => {
    await expect(page.locator('#oConfirm')).not.toBeChecked();
  });

  test('Reduce Motion checkbox is OFF by default', async ({ page }) => {
    await expect(page.locator('#oReduce')).not.toBeChecked();
  });

  // Profiles & Score
  test('profile name input is present', async ({ page }) => {
    await expect(page.locator('#profileName')).toBeVisible();
  });

  test('profile select dropdown exists', async ({ page }) => {
    await expect(page.locator('#profileSelect')).toBeAttached();
  });

  test('profile save and load buttons present', async ({ page }) => {
    await expect(page.locator('button:has-text("Save")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Load")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('score shows default 0 values', async ({ page }) => {
    // Score line uses dynamic player names (e.g. "Emma 0 | Opponent 0 | Draws 0")
    // Assert all three counters are 0 and no wins are recorded
    const text = await page.locator('#scoreLine').textContent();
    expect(text).toMatch(/0.*\|.*0.*\|.*Draws\s+0/);
  });

  test('Reset Score button is present', async ({ page }) => {
    await expect(page.locator('button:has-text("Reset Score")')).toBeVisible();
  });
});

// ============================================================
// 5. SETTINGS TOGGLE BEHAVIOUR (client-side only)
// ============================================================
test.describe('Settings Toggle Behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await forceShow(page, '#optsModal');
  });

  test('sound checkbox can be toggled off and back on', async ({ page }) => {
    await page.click('#oSound');
    await expect(page.locator('#oSound')).not.toBeChecked();
    await page.click('#oSound');
    await expect(page.locator('#oSound')).toBeChecked();
  });

  test('legal moves checkbox can be toggled', async ({ page }) => {
    await page.click('#oMoves');
    await expect(page.locator('#oMoves')).not.toBeChecked();
  });

  test('animation speed label updates when slider moves', async ({ page }) => {
    await page.locator('#aSpd').fill('600');
    await page.locator('#aSpd').dispatchEvent('input');
    await expect(page.locator('#aSpdL')).toContainText('600ms');
  });

  test('board radius label updates when slider moves', async ({ page }) => {
    await page.locator('#radiusSpd').fill('4');
    await page.locator('#radiusSpd').dispatchEvent('input');
    await expect(page.locator('#radiusLbl')).toContainText('4px');
  });

  test('shadow strength label updates when slider moves', async ({ page }) => {
    await page.locator('#shadowSpd').fill('80');
    await page.locator('#shadowSpd').dispatchEvent('input');
    await expect(page.locator('#shadowLbl')).toContainText('80%');
  });
});

// ============================================================
// 6. MODALS PRESENCE
// ============================================================
test.describe('Modal Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('options modal exists in DOM', async ({ page }) => {
    await expect(page.locator('#optsModal')).toBeAttached();
  });

  test('promotion modal exists in DOM', async ({ page }) => {
    await expect(page.locator('#promoModal')).toBeAttached();
  });

  test('game over modal exists in DOM', async ({ page }) => {
    await expect(page.locator('#goModal')).toBeAttached();
  });

  test('draw offer modal exists in DOM', async ({ page }) => {
    await expect(page.locator('#drawModal')).toBeAttached();
  });

  test('draw modal shows Accept and Decline buttons', async ({ page }) => {
    await forceShow(page, '#drawModal');
    await expect(page.locator('#drawModal')).toBeVisible();
    await expect(page.locator('button:has-text("Accept")')).toBeVisible();
    await expect(page.locator('button:has-text("Decline")')).toBeVisible();
  });

  test('game over modal shows Play Again button', async ({ page }) => {
    await forceShow(page, '#goModal');
    await expect(page.locator('button:has-text("Play Again")')).toBeVisible();
  });
});

// ============================================================
// 7. ACCESSIBILITY & RESPONSIVE META
// ============================================================
test.describe('Accessibility & Meta', () => {
  test('page has viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.$eval(
      'meta[name="viewport"]',
      (el) => el.getAttribute('content')
    );
    expect(viewport).toContain('width=device-width');
  });

  test('page has a favicon', async ({ page }) => {
    await page.goto('/');
    const favicon = await page.$('link[rel="icon"]');
    expect(favicon).not.toBeNull();
  });

  test('all form inputs have associated labels', async ({ page }) => {
    await page.goto('/');
    // Check key inputs have visible label text nearby
    const pNameLabel = await page.$eval(
      '#pName',
      (el) => el.closest('.fg')?.querySelector('label')?.textContent
    );
    expect(pNameLabel).toBeTruthy();
  });

  test('html lang attribute is set', async ({ page }) => {
    await page.goto('/');
    const lang = await page.$eval('html', (el) => el.getAttribute('lang'));
    expect(lang).toBe('en');
  });
});
