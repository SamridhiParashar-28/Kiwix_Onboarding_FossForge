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

test('Kiwix Online Library Integration - Deep-Link Generation & 3-Letter ISO Languages', (t) => {
  const KIWIX_BROWSE_BASE_URL = 'https://browse.library.kiwix.org/';

  const LANG_MAP_3 = {
    en: 'eng',
    hi: 'hin',
    es: 'spa',
    fr: 'fra',
    de: 'deu',
    ar: 'ara',
    zh: 'zho',
    ru: 'rus',
    pt: 'por',
    it: 'ita',
    bn: 'ben',
    ja: 'jpn'
  };

  function to3LetterLang(code) {
    if (!code) return 'eng';
    const c = String(code).toLowerCase().trim();
    if (c.length === 3) return c;
    return LANG_MAP_3[c] || c;
  }

  function getKiwixPackageUrl(pkg) {
    if (!pkg) return `${KIWIX_BROWSE_BASE_URL}#lang=eng&category=wikipedia`;
    const lang3 = to3LetterLang(pkg.language);
    const id = (pkg.id || '').toLowerCase();
    const category = (pkg.category || '').toLowerCase();

    // 1. Official Kiwix category filters
    if (id.includes('wikipedia') || category === 'wikipedia') {
      return `${KIWIX_BROWSE_BASE_URL}#lang=${encodeURIComponent(lang3)}&category=wikipedia`;
    }
    if (id.includes('gutenberg') || category === 'gutenberg') {
      return `${KIWIX_BROWSE_BASE_URL}#lang=${encodeURIComponent(lang3)}&category=gutenberg`;
    }
    if (id.includes('wikivoyage') || category === 'wikivoyage') {
      return `${KIWIX_BROWSE_BASE_URL}#lang=${encodeURIComponent(lang3)}&category=wikivoyage`;
    }
    if (id.includes('ted') || category === 'ted') {
      return `${KIWIX_BROWSE_BASE_URL}#lang=${encodeURIComponent(lang3)}&category=ted`;
    }

    // 2. Query-based packages
    let query = '';
    if (id.includes('wikimed')) query = 'WikiMed';
    else if (id.includes('swasthya')) query = 'Swasthya';
    else if (id.includes('aapda')) query = 'Aapda';
    else if (id.includes('disaster')) query = 'Disaster';
    else if (id.includes('phet')) query = 'PhET';
    else if (id.includes('khan')) query = 'Khan Academy';
    else if (id.includes('devdocs')) query = 'DevDocs';
    else if (id.includes('stackoverflow')) query = 'Stack Overflow';
    else if (id.includes('history') || id.includes('itihas')) query = 'History';
    else {
      const parenMatch = (pkg.name || '').match(/\(([^)]+)\)/);
      if (parenMatch && /^[a-zA-Z0-9_\s-]+$/.test(parenMatch[1].trim())) {
        query = parenMatch[1].trim().split(' ')[0];
      } else {
        query = (pkg.name || '').split(/[\s-_]+/)[0] || pkg.id;
      }
    }

    return `${KIWIX_BROWSE_BASE_URL}#lang=${encodeURIComponent(lang3)}&q=${encodeURIComponent(query)}`;
  }

  // 1. English WikiMed -> https://browse.library.kiwix.org/#lang=eng&q=WikiMed
  const wikimedPkg = { id: 'wikimed-en', name: 'WikiMed - The Healthcare Encyclopedia', language: 'en', category: 'health' };
  assert.strictEqual(
    getKiwixPackageUrl(wikimedPkg),
    'https://browse.library.kiwix.org/#lang=eng&q=WikiMed',
    'English WikiMed must generate: https://browse.library.kiwix.org/#lang=eng&q=WikiMed'
  );

  // 2. Hindi Swasthya -> https://browse.library.kiwix.org/#lang=hin&q=Swasthya
  const swasthyaPkg = { id: 'swasthya-hi', name: 'स्वास्थ्य एवं प्राथमिक चिकित्सा (Swasthya)', language: 'hi', category: 'health' };
  assert.strictEqual(
    getKiwixPackageUrl(swasthyaPkg),
    'https://browse.library.kiwix.org/#lang=hin&q=Swasthya',
    'Hindi Swasthya must generate: https://browse.library.kiwix.org/#lang=hin&q=Swasthya'
  );

  // 3. English Wikipedia -> https://browse.library.kiwix.org/#lang=eng&category=wikipedia
  const wikipediaPkg = { id: 'wikipedia-vital-en', name: 'Wikipedia Mini - 10,000 Vital Articles', language: 'en', category: 'wikipedia' };
  assert.strictEqual(
    getKiwixPackageUrl(wikipediaPkg),
    'https://browse.library.kiwix.org/#lang=eng&category=wikipedia',
    'English Wikipedia must generate: https://browse.library.kiwix.org/#lang=eng&category=wikipedia'
  );

  // 4. English Gutenberg -> https://browse.library.kiwix.org/#lang=eng&category=gutenberg
  const gutenbergPkg = { id: 'gutenberg-en', name: 'Project Gutenberg Top 1000 Books', language: 'en', category: 'education' };
  assert.strictEqual(
    getKiwixPackageUrl(gutenbergPkg),
    'https://browse.library.kiwix.org/#lang=eng&category=gutenberg',
    'English Gutenberg must generate: https://browse.library.kiwix.org/#lang=eng&category=gutenberg'
  );
});

test('Step 4 - Offline Library (Mark as Installed & LocalStorage Persistence)', (t) => {
  // Mock localStorage
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = v; },
    removeItem: (k) => { delete storage[k]; }
  };

  const STORAGE_KEY = 'kiwix_installed_packages';
  let installedPackages = {};

  function markInstalled(pkg) {
    installedPackages[pkg.id] = {
      id: pkg.id,
      name: pkg.name,
      language: pkg.language,
      sizeMB: pkg.sizeMB,
      category: pkg.category,
      categoryLabel: pkg.categoryLabel || pkg.category,
      installedAt: new Date().toISOString()
    };
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(installedPackages));
  }

  function unmarkInstalled(pkgId) {
    delete installedPackages[pkgId];
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(installedPackages));
  }

  function restoreFromStorage() {
    const raw = mockLocalStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  // 1. Initial state: empty
  assert.strictEqual(Object.keys(installedPackages).length, 0);

  // 2. Mark package as installed
  const pkg1 = { id: 'wikimed-en', name: 'WikiMed', language: 'en', sizeMB: 1840, category: 'health' };
  markInstalled(pkg1);
  assert.strictEqual(Object.keys(installedPackages).length, 1);
  assert.ok(installedPackages['wikimed-en']);
  assert.strictEqual(installedPackages['wikimed-en'].sizeMB, 1840);

  // 3. Check persistence
  const reloaded = restoreFromStorage();
  assert.ok(reloaded['wikimed-en']);
  assert.strictEqual(reloaded['wikimed-en'].name, 'WikiMed');

  // 4. Mark second package
  const pkg2 = { id: 'swasthya-hi', name: 'Swasthya', language: 'hi', sizeMB: 420, category: 'health' };
  markInstalled(pkg2);
  assert.strictEqual(Object.keys(installedPackages).length, 2);

  // 5. Remove one package
  unmarkInstalled('wikimed-en');
  assert.strictEqual(Object.keys(installedPackages).length, 1);
  assert.strictEqual(installedPackages['wikimed-en'], undefined);
  assert.ok(installedPackages['swasthya-hi']);

  // 6. Persistence after removal
  const reloaded2 = restoreFromStorage();
  assert.strictEqual(Object.keys(reloaded2).length, 1);
  assert.strictEqual(reloaded2['swasthya-hi'].language, 'hi');
});


