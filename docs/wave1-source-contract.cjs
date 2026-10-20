/* Source-only compatibility contract for the historical Wave 1 browser suite.
 * Five destinations deliberately became same-site readers. Verify each exact
 * route first, then normalize only those tokens to compare the historic bytes.
 * No current browser or geometry acceptance is implied by this source check. */
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const LOCAL_READINGS = Object.freeze([
  [13, 'https://ai-two-years.maniforld.com'],
  [14, 'https://biographies.maniforld.com'],
  [15, 'https://causal-web.maniforld.com'],
  [19, 'https://inside-qingmei.maniforld.com'],
  [20, 'https://moon-snow.maniforld.com']
]);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function verifySourceContract(html, island) {
  assert.equal(html, island, 'index.html and island.html must remain byte-identical');
  const links = html.match(/const LINKS = (\[[\s\S]*?\n\]);/);
  const tracks = html.match(/const TRACKS=(\[[\s\S]*?\n\]);/);
  assert(links, 'LINKS source is present');
  assert(tracks, 'TRACKS source is present');
  const entries = vm.runInNewContext(links[1], Object.create(null), {timeout: 1000});
  assert.equal(entries.length, 26, 'exactly 26 courtyard destinations');
  let normalized = links[1];
  for (const [index, historical] of LOCAL_READINGS) {
    const current = '/?read=' + index, token = "url:'" + current + "'";
    assert.equal(entries[index].url, current, 'intentional local reading route ' + index);
    assert.equal(normalized.split(token).length, 2, 'one exact local route token ' + index);
    normalized = normalized.replace(token, "url:'" + historical + "'");
  }
  assert.equal(hash(normalized), 'ace50acab071aea8f309c15e55bc67c2afc8e17f36b5a4544a980c942c1f1d42',
    'all other LINKS bytes retain the historical contract');
  assert.equal(hash(tracks[1]), 'da871476abe678cee5e02d374c710a1ec98d904195550ca94ab30d34ee8a558b',
    'TRACKS bytes retain the historical contract');
  assert(!/<script[^>]+src=["']https?:/.test(html), 'no external script dependency');
  return {
    passed: true,
    scope: 'source compatibility only; not current browser or geometry acceptance',
    sourceSha256: hash(html),
    linksSha256: hash(links[1]),
    historicalNormalizedLinksSha256: hash(normalized),
    tracksSha256: hash(tracks[1]),
    intentionalLocalReadings: LOCAL_READINGS.map(([index]) => ({index, url: '/?read=' + index}))
  };
}
module.exports = {verifySourceContract, LOCAL_READINGS};
