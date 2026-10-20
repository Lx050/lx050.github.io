/* Mutation checks: intentional reader migrations pass; unexpected changes fail. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const os = require('node:os');
const {verifySourceContract, LOCAL_READINGS} = require('./wave1-source-contract.cjs');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const island = fs.readFileSync(path.join(root, 'island.html'), 'utf8');
const report = verifySourceContract(html, island);
let rejectedMutations = 0;
function rejectChanged(changed, label) {
  assert.notEqual(changed, html, 'mutation was applied: ' + label);
  assert.throws(() => verifySourceContract(changed, changed), assert.AssertionError, label);
  rejectedMutations++;
}
for (const [index, historical] of LOCAL_READINGS) {
  rejectChanged(html.replace("url:'/?read=" + index + "'", "url:'" + historical + "'"), 'reverting reader ' + index);
  rejectChanged(html.replace("url:'/?read=" + index + "'", "url:'/?read=999'"), 'redirecting reader ' + index);
}
const entries = vm.runInNewContext(html.match(/const LINKS = (\[[\s\S]*?\n\]);/)[1]);
const local = new Set(LOCAL_READINGS.map(([index]) => index));
entries.forEach((entry, index) => {
  if (!local.has(index)) rejectChanged(html.replace("url:'" + entry.url + "'", "url:'https://unexpected.invalid/" + index + "'"), 'external route ' + index);
});
rejectChanged(html.replace("title:'墨息'", "title:'Changed'"), 'navigation title');
rejectChanged(html.replace("x:-20,z:-19", "x:-22,z:-19"), 'layout coordinate');
rejectChanged(html.replace('const TRACKS=[', 'const TRACKS=[\n'), 'music source bytes');
rejectChanged(html.replace("url:'/?read=19'", "url:'/?read=20'"), 'duplicated local route');
rejectChanged(html.replace('</head>', '<script src="https://unexpected.invalid/app.js"></script></head>'), 'external dependency');
assert.throws(() => verifySourceContract(html, island + '\n'), assert.AssertionError);
rejectedMutations++;
const sourceOnly = cp.spawnSync(process.execPath, [path.join(__dirname, 'wave1-check.cjs'), '--source-only'], {
  cwd: root, encoding: 'utf8', timeout: 10000,
  env: {...process.env, WAVE1_ARTIFACTS: fs.mkdtempSync(path.join(os.tmpdir(), 'wave1-source-check-')),
    PLAYWRIGHT_PATH: '/nonexistent/source-only-must-not-load-playwright'}
});
assert.equal(sourceOnly.status, 0, sourceOnly.stderr);
const cliReport = JSON.parse(sourceOnly.stdout);
assert.equal(cliReport.sourcePreflight.passed, true);
assert.equal(cliReport.browserRun, false);
const environmentOut = fs.mkdtempSync(path.join(os.tmpdir(), 'wave1-environment-check-'));
const noBrowser = cp.spawnSync(process.execPath, [path.join(__dirname, 'wave1-check.cjs')], {
  cwd: root, encoding: 'utf8', timeout: 10000,
  env: {...process.env, WAVE1_ARTIFACTS: environmentOut, PLAYWRIGHT_PATH: '/nonexistent/intentional-browser-environment-test'}
});
assert.equal(noBrowser.status, 1);
const failure = JSON.parse(fs.readFileSync(path.join(environmentOut, 'report.json'), 'utf8'));
assert.equal(failure.sourcePreflight.passed, true);
assert.equal(failure.failureStage, 'browser-launch');
assert.equal(failure.failureClassification, 'browser-environment');
assert.equal(failure.browserRun, false);
assert.equal(failure.complete, false);
console.log(JSON.stringify({passed: true, rejectedMutations, sourceOnlyWithoutBrowser: true,
  browserEnvironmentFailureClassified: true, source: report}, null, 2));
