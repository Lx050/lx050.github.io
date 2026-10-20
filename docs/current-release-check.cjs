/* Current release CPU acceptance.
 * Current source/geometry is checked without normalization. Historical release
 * isolation scripts run on an immutable previous-main fixture, not on modified
 * production objects. Neither stage substitutes for browser/WebGL acceptance.
 * Run: node docs/current-release-check.cjs
 * --current-only is an explicitly partial run, never full acceptance.
 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = 'd09bdecd0ccb15ad0877c49c48704cd0f6a257d0';
const out = path.join(root, 'qa-results/current-release');
fs.mkdirSync(out, {recursive: true});
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const git = args => cp.execFileSync('git', ['-C', root, ...args], {maxBuffer: 128 * 1024 * 1024});
const old = file => git(['show', baseline + ':' + file]);
const current = file => fs.readFileSync(path.join(root, file));
const beforeGuide = "      returnedPath(b, s, 3.55, -6.7, 6.8, 'ceramic');";
const afterGuide = [
  '      if (s > 0) {',
  '        // Follow the verified bypass around the fixed reading rest, not through it.',
  "        C.pathLine(b, [[0, -6.9], [2.1, -6.9], [2.1, -4.7], [3.55, -4.7], [3.55, 6.8], [0, 6.8]], 'ceramic', .04);",
  "      } else returnedPath(b, s, 3.55, -6.7, 6.8, 'ceramic');"
].join('\n');
const baselineRepairs = [
  ['editor', '1ea616745a1eb7c1d9bf1d4051dce15e35785e0b', '386c2b123a5a30e785714aec22a354f998af03d9', 'ef87ae85ed90cfe2752d7c47727fb5bb12709dc7', 'EDITOR_DETAIL.md'],
  ['nuanling-app', '3ffb1a60f3e3f887180e80cb39923154da73b23d', '9f2743e5e095da869a5594e8c266fe3de7709c76', 'bc4edb9ebca38cf22b4fb5f6fac54cfbd5644546', 'NUANLING_APP_DETAIL.md']
];
function verifyGuideDelta(candidate) {
  const original = old('assets/content-services.js').toString();
  assert.equal(original.split(beforeGuide).length, 2, 'one baseline API guide site');
  assert.equal(candidate, original.replace(beforeGuide, afterGuide), 'only the exact approved east-guide source delta');
}
function verifySources() {
  verifyGuideDelta(current('assets/content-services.js').toString());
  const beforeToken = hash(old('assets/content-services.js')).slice(0, 16);
  const afterToken = hash(current('assets/content-services.js')).slice(0, 16);
  const production = git(['ls-tree', '-r', '--name-only', baseline, 'assets', 'vendor']).toString().trim().split('\n');
  const actual = git(['ls-files', '--cached', '--others', '--exclude-standard', 'assets', 'vendor']).toString().trim().split('\n');
  assert.deepEqual(actual.sort(), production.slice().sort(), 'no added or removed runtime asset');
  for (const file of production) {
    if (file === 'assets/content-services.js') continue;
    assert.equal(hash(current(file)), hash(old(file)), 'unchanged production bytes ' + file);
  }
  for (const file of ['index.html', 'island.html']) {
    const expected = old(file).toString().replace('assets/content-services.js?v=' + beforeToken, 'assets/content-services.js?v=' + afterToken);
    assert.equal(current(file).toString(), expected, 'entry changes only the exact service cache token ' + file);
  }
  assert.equal(current('index.html').toString(), current('island.html').toString());
  for (const file of ['garden.html', 'editorial.html', 'CNAME', 'README-COURTYARD.md'])
    assert.equal(hash(current(file)), hash(old(file)), 'unchanged root source ' + file);
  let deltaMutationsRejected = 0;
  for (const changed of [
    old('assets/content-services.js').toString(),
    current('assets/content-services.js').toString().replace('[2.1, -4.7]', '[3.55, -4.7]'),
    current('assets/content-services.js').toString().replace("phaseLabels: ['配置', '连接', '观察']", "phaseLabels: ['Changed', '连接', '观察']"),
    current('assets/content-services.js').toString() + '\n// unexpected production edit\n'
  ]) {
    assert.throws(() => verifyGuideDelta(changed), assert.AssertionError);
    deltaMutationsRejected++;
  }
  const manifestPage = current('docs/deployment-verify.html').toString();
  const manifest = JSON.parse(manifestPage.match(/const expected=(\{.*?\});/)[1]);
  const previous = JSON.parse(old('docs/deployment-verify.html').toString().match(/const expected=(\{.*?\});/)[1]);
  assert.deepEqual(Object.keys(manifest), Object.keys(previous), 'release manifest retains all entries');
  for (const [file, digest] of Object.entries(manifest)) assert.equal(hash(current(file)), digest, 'current manifest hash ' + file);
  const expectedManifestPage = old('docs/deployment-verify.html').toString().replace(/const expected=(\{.*?\});/,
    'const expected=' + JSON.stringify(manifest) + ';');
  assert.equal(manifestPage, expectedManifestPage, 'manifest page changes hashes only');
  const htmlFiles = git(['ls-files', '--cached', '--others', '--exclude-standard']).toString().trim().split('\n').filter(file => file.endsWith('.html') && !file.startsWith('qa-results/'));
  let cacheTokens = 0;
  for (const page of htmlFiles) for (const match of current(page).toString().matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]{16})"/g)) {
    const file = path.posix.normalize(path.posix.join(path.posix.dirname(page), match[1]));
    assert.equal(hash(current(file)).slice(0, 16), match[2], 'current cache token ' + page + ': ' + file);
    cacheTokens++;
  }
  for (const [name, unavailable, published, child, document] of baselineRepairs) {
    assert.equal(git(['rev-parse', child + '^']).toString().trim(), published, 'published baseline is exact refinement parent');
    assert(old('docs/' + document).toString().includes(published), 'baseline documented in original release');
    const file = 'docs/' + name + '-regression.cjs', original = old(file).toString();
    assert.equal(original.split(unavailable).length, 3);
    const header = '/* Published baseline ' + published + ' is the exact parent of\n * ' + child + ' and is documented in ' + document + '.\n * The prior unpublished SHA was not fetchable from origin. Equality checks are unchanged. */\n';
    const expected = header + original.replaceAll(unavailable, published).replace("baseline:'" + unavailable.slice(0, 7) + "'", "baseline:'" + published.slice(0, 7) + "'");
    assert.equal(current(file).toString(), expected, 'historical repair preserves all equality assertions ' + file);
  }
  return {passed: true, productionFilesPinned: production.length, allowedProductionChanges: ['assets/content-services.js', 'index.html: cache token only', 'island.html: cache token only'], manifestEntries: Object.keys(manifest).length, cacheTokens, deltaMutationsRejected};
}
const report = {
  baseline, generatedAt: new Date().toISOString(), complete: false, passed: false,
  scope: 'CPU current-source/current-geometry checks plus explicitly historical fixture checks; no browser/GPU acceptance',
  current: [], historicalFixture: [], limits: [
    'Historical release-isolation scripts intentionally assert old complete assemblies and old file bytes.',
    'They run against the exact previous-main checkout with only two verified published-baseline reference repairs.',
    'Current production is never normalized or rewritten for tests.',
    'Current browser/WebGL movement, collisions, weather, butterfly animation, narrow viewport and device FPS remain unverified.'
  ]
};
function runTest(file, cwd, scope) {
  const name = file.replaceAll('/', '_').replace(/\.cjs$/, '');
  const started = Date.now();
  const result = cp.spawnSync(process.execPath, [file], {cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024});
  fs.writeFileSync(path.join(out, scope + '-' + name + '.log'), (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''));
  const row = {file, scope, passed: result.status === 0 && !result.error, exitCode: result.status, milliseconds: Date.now() - started};
  console.log(JSON.stringify(row)); return row;
}
try {
  report.source = verifySources();
  console.log(JSON.stringify({scope: 'CURRENT source', ...report.source}));
  const historical = git(['ls-tree', '-r', '--name-only', baseline, 'docs']).toString().trim().split('\n').filter(file => file.endsWith('.cjs') && !file.startsWith('docs/navigation-qa/') && file !== 'docs/wave1-check.cjs');
  assert.equal(historical.length, 65, 'complete previous-main CPU suite');
  // These detail audits also freeze the complete service source from their own
  // release, even when auditing a different building. Keep those assertions.
  const frozenOnly = new Set([
    'docs/detail-lod-check.cjs', 'docs/gateway-detail-check.cjs', 'docs/shield-detail-check.cjs',
    'docs/reme-detail-check.cjs', 'docs/mindcare-detail-check.cjs', 'docs/alternate-detail-check.cjs',
    'docs/dossier-detail-check.cjs', 'docs/rss-detail-check.cjs', 'docs/vault-detail-check.cjs'
  ]);
  const repairedFiles = new Set(baselineRepairs.map(([name]) => 'docs/' + name + '-regression.cjs'));
  for (const file of historical) if (!repairedFiles.has(file))
    assert.equal(hash(current(file)), hash(old(file)), 'archived/current inherited test assertions unchanged ' + file);
  const currentTests = historical.filter(file => !file.endsWith('-regression.cjs') && !frozenOnly.has(file));
  currentTests.push('docs/wave1-source-contract-check.cjs', 'docs/gateway-guide-check.cjs');
  for (const file of currentTests) report.current.push(runTest(file, root, 'current'));
  report.currentPassed = report.current.every(row => row.passed);
  report.historicalOnlyReasons = historical.filter(file => !currentTests.includes(file)).map(file => ({
    file, reason: file.endsWith('-regression.cjs') ? 'Exact historical release source/assembly identity' : file === 'docs/detail-lod-check.cjs' ? 'Exact historical cumulative assembly totals' : 'Historical service source/original-assembly identity'
  }));
  if (!process.argv.includes('--current-only')) {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'courtyard-historical-fixture-'));
    cp.execFileSync('git', ['clone', '--shared', '--quiet', '--no-checkout', root, fixture]);
    cp.execFileSync('git', ['-C', fixture, 'checkout', '--quiet', '--detach', baseline]);
    report.fixturePath = fixture;
    report.fixtureCommit = cp.execFileSync('git', ['-C', fixture, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    assert.equal(report.fixtureCommit, baseline);
    for (const [name] of baselineRepairs) fs.copyFileSync(path.join(root, 'docs/' + name + '-regression.cjs'), path.join(fixture, 'docs/' + name + '-regression.cjs'));
    for (const file of historical) report.historicalFixture.push(runTest(file, fixture, 'historical-fixture'));
    report.historicalPassed = report.historicalFixture.every(row => row.passed);
    report.complete = true; report.passed = report.currentPassed && report.historicalPassed;
  } else {
    report.partial = true; report.passed = report.currentPassed;
  }
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.failure = String(error); process.exitCode = 1; console.error(error);
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, complete: report.complete, currentChecks: report.current.length, historicalFixtureChecks: report.historicalFixture.length, report: path.join(out, 'report.json')}));
}
