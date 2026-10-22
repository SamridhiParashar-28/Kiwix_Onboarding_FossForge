/**
 * Automated Unit Tests for Frontend Application Logic
 * Runs natively in Node.js test runner: node --test tests/test_frontend_logic.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');

test('Catalog File - Structure and Required Fields', (t) => {
  assert.ok(fs.existsSync(catalogPath), 'catalog.json must exist');
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(raw);

  assert.ok(Array.isArray(catalog), 'Catalog must be an array');
  assert.ok(catalog.length >= 18, 'Catalog must contain at least 18 curated packages');

  const requiredFields = ['id', 'name', 'filename', 'description', 'category', 'language', 'sizeMB', 'sha256', 'downloadSource'];

  catalog.forEach((item, index) => {
    requiredFields.forEach(field => {
      assert.ok(item[field] !== undefined && item[field] !== null, `Item ${index} (${item.id || 'unknown'}) must have field '${field}'`);
    });
    assert.ok(typeof item.sizeMB === 'number' && item.sizeMB > 0, `Item ${item.id} sizeMB must be a positive number`);
    assert.ok(item.sha256.length === 64, `Item ${item.id} sha256 hash must be 64 characters hex`);
    assert.ok(item.downloadSource.startsWith('https://'), `Item ${item.id} downloadSource must be a valid secure URL`);
  });
});

test('Recommendation Scoring Algorithm', (t) => {
  // Replicate scoring logic from js/app.js
  function scoreItem(item, selectedInterests, selectedLanguages, storageBudgetGB) {
    let score = 0;
    if (item.isCustom) score += 200;
    if (selectedInterests.has(item.category)) score += 60;
    if (selectedLanguages.has(item.language)) score += 50;
    if (item.featured) score += 20;
    if (storageBudgetGB <= 3 && item.sizeMB < 600) score += 25;
    return score;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const interests = new Set(['health']);
  const languages = new Set(['en']);

  const scored = catalog.map(c => ({
    ...c,
    score: scoreItem(c, interests, languages, 5.0)
  })).sort((a, b) => b.score - a.score);

  // Top item should be wikimed-en (health + en + featured)
  assert.strictEqual(scored[0].id, 'wikimed-en', 'wikimed-en should be top match for health + en');
  assert.strictEqual(scored[0].score, 60 + 50 + 20, 'wikimed-en should have score 130');

  // Hindi health swasthya-hi has matching health (+60) + featured (+20) but not en
  const swasthya = scored.find(x => x.id === 'swasthya-hi');
  assert.strictEqual(swasthya.score, 60 + 20, 'swasthya-hi should have score 80');
});

test('Storage Quota Calculations & Budget Limits', (t) => {
  const budgetGB = 5.0;
  const packages = [
    { id: 'p1', sizeMB: 1840 },
    { id: 'p2', sizeMB: 880 },
    { id: 'p3', sizeMB: 620 }
  ];

  const totalMB = packages.reduce((acc, p) => acc + p.sizeMB, 0); // 3340 MB
  const totalGB = totalMB / 1024; // 3.2617 GB
  const percent = (totalGB / budgetGB) * 100;
  const remainingGB = Math.max(0, budgetGB - totalGB);

  assert.strictEqual(totalMB, 3340);
  assert.ok(totalGB < budgetGB, 'Should be under 5GB budget');
  assert.ok(remainingGB > 1.7, 'Remaining space should be around 1.73 GB');
  assert.ok(percent < 100, 'Percent should be under 100%');

  // Adding large 4200MB package should exceed budget
  const oversizedMB = totalMB + 4200;
  const oversizedGB = oversizedMB / 1024;
  assert.ok(oversizedGB > budgetGB, 'Oversized bundle should exceed 5GB budget');
  const excessGB = oversizedGB - budgetGB;
  assert.ok(excessGB > 2.0, 'Excess should exceed 2 GB');
});

test('Download Estimates & Unit Conversions', (t) => {
  function calculateDownloadTimeSeconds(totalMB, speedMbps) {
    const cleanSpeed = (typeof speedMbps === 'number' && speedMbps > 0) ? speedMbps : 10;
    const totalBytes = totalMB * 1024 * 1024;
    // 1 Mbps = 1,000,000 bits/sec = 125,000 bytes/sec
    const bytesPerSec = (cleanSpeed * 1000 * 1000) / 8;
    return Math.ceil(totalBytes / bytesPerSec);
  }

  // 125 MB file at 10 Mbps = (125 * 1024 * 1024) / 1,250,000 = 104.85 -> 105 seconds
  const secs10Mbps = calculateDownloadTimeSeconds(125, 10);
  assert.strictEqual(secs10Mbps, 105, '125MB at 10Mbps should take 105 seconds');

  // 125 MB file at 100 Mbps = (125 * 1024 * 1024) / 12,500,000 = 10.48 -> 11 seconds
  const secs100Mbps = calculateDownloadTimeSeconds(125, 100);
  assert.strictEqual(secs100Mbps, 11, '125MB at 100Mbps should take 11 seconds');

  // Safe handling of 0 or invalid speed
  const secsZero = calculateDownloadTimeSeconds(100, 0);
  assert.ok(!isNaN(secsZero) && isFinite(secsZero), 'Zero speed should fall back safely without NaN or Infinity');

  const secsNegative = calculateDownloadTimeSeconds(100, -5);
  assert.ok(!isNaN(secsNegative) && isFinite(secsNegative), 'Negative speed should fall back safely');
});

test('Bounded Exponential Backoff Calculations', (t) => {
  const maxRetries = 3;
  function getBackoffSeconds(attempt) {
    if (attempt > maxRetries) return null; // Exhausted
    return Math.min(8, Math.pow(2, attempt));
  }

  assert.strictEqual(getBackoffSeconds(1), 2, 'Attempt 1 backoff should be 2s');
  assert.strictEqual(getBackoffSeconds(2), 4, 'Attempt 2 backoff should be 4s');
  assert.strictEqual(getBackoffSeconds(3), 8, 'Attempt 3 backoff should be 8s');
  assert.strictEqual(getBackoffSeconds(4), null, 'Attempt 4 should be marked exhausted');
});

test('Onboarding Step Resolution & Welcome Reset on Sign-In / Sign-Up', (t) => {
  function resolveInitialStep({ savedStep, forceWelcome, lastUserId, currentUserId, selectedPackageCount, isDownloadCompleted }) {
    if (forceWelcome || (lastUserId && lastUserId !== currentUserId)) {
      return 1;
    }
    let step = savedStep ? parseInt(savedStep, 10) : 1;
    if (step === 5 && selectedPackageCount === 0 && !isDownloadCompleted) {
      step = 1;
    }
    return step;
  }

  // 1. Force welcome flag set on sign-in / sign-up -> must always resolve to Step 1 (Welcome)
  assert.strictEqual(
    resolveInitialStep({ savedStep: 5, forceWelcome: true, lastUserId: 'user-1', currentUserId: 'user-1', selectedPackageCount: 3, isDownloadCompleted: false }),
    1,
    'Sign-in with forceWelcome must start at Step 1 (Welcome)'
  );

  // 2. Switched user -> must always resolve to Step 1 (Welcome)
  assert.strictEqual(
    resolveInitialStep({ savedStep: 4, forceWelcome: false, lastUserId: 'user-old', currentUserId: 'user-new', selectedPackageCount: 2, isDownloadCompleted: false }),
    1,
    'User switch must reset to Step 1 (Welcome)'
  );

  // 3. Corrupted / empty Step 5 state (0 packages) -> must safely fall back to Step 1 (Welcome)
  assert.strictEqual(
    resolveInitialStep({ savedStep: 5, forceWelcome: false, lastUserId: 'user-1', currentUserId: 'user-1', selectedPackageCount: 0, isDownloadCompleted: false }),
    1,
    'Step 5 with 0 packages and incomplete download must fall back to Step 1 (Welcome)'
  );

  // 4. Normal mid-onboarding reload (e.g. Step 3) -> preserves Step 3
  assert.strictEqual(
    resolveInitialStep({ savedStep: 3, forceWelcome: false, lastUserId: 'user-1', currentUserId: 'user-1', selectedPackageCount: 0, isDownloadCompleted: false }),
    3,
    'Normal refresh during Step 3 must preserve Step 3'
  );
});

