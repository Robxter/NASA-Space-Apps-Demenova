// "How reliable is this?" (D-028): the counts on screen are the counts in verification.json, read here from the
// committed file; never POD, FAR, CSI or a percentage (CLAUDE.md Rule zero 4: counts, never unmeasured percentages).
import { expect, numbersWithoutOrigin, shot, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY, verification } from '../lib/demo';

test('the reliability sheet shows the verification counts and no skill scores or percentages', async ({ page }) => {
  const unit = bannerUnit(DEMO_DAY)!;
  await page.goto(`/#lot/${encodeURIComponent(unit.unit_id)}`);
  await page.getByRole('button', { name: t('en', 'reliability.open') }).click();
  const sheet = page.getByRole('dialog', { name: t('en', 'reliability.title') });
  await expect(sheet).toBeVisible();

  const counts = sheet.locator('section', { has: page.getByRole('heading', { name: t('en', 'reliability.counts') }) });
  const row = (label: string) => counts.getByRole('listitem').filter({ hasText: t('en', label) });
  await expect(row('reliability.hits')).toContainText(new RegExp(`(^|\\D)${verification.hits}(\\D|$)`));
  await expect(row('reliability.misses')).toContainText(new RegExp(`(^|\\D)${verification.misses}(\\D|$)`));
  await expect(row('reliability.falseAlarms')).toContainText(new RegExp(`(^|\\D)${verification.false_alarms}(\\D|$)`));

  const events = sheet.locator('section', { has: page.getByRole('heading', { name: t('en', 'reliability.events') }) });
  await expect(events.getByRole('listitem')).toHaveCount(verification.events.length);

  const text = await sheet.innerText();
  expect(text, 'no POD, FAR or CSI').not.toMatch(/\b(POD|FAR|CSI)\b/);
  expect(text, 'no skill wording').not.toMatch(/probability of detection|false alarm ratio|critical success/i);
  expect(text, 'no percentages').not.toMatch(/%|\bpercent\b|por ciento/i);
  await shot(page, 'reliability-sheet');

  const { offenders } = await numbersWithoutOrigin(page);
  expect(offenders).toEqual([]);

  await sheet.getByRole('button', { name: t('en', 'common.close') }).click();
  await expect(sheet).toHaveCount(0);
});
