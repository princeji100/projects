import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import {
  getBaseUrl,
  getPlatformProfileUrl,
  getPublicProfileUrl,
  getCanonicalProfileUrl,
  normalizeHostname,
} from '../lib/siteUrl.js';
import { getStablePageId } from '../lib/profileIdentity.js';
import Page from '../models/Page.js';
import Subscription from '../models/Subscription.js';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    failed++;
  }
}

console.log('--- Running Milestone v2.1 Wave 3: Profile Identity & Canonical URL Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Identity Contract & Stable Page ID
// ==========================================

await check('identity: Page schema remains unchanged and valid', () => {
  const pagePaths = Page.schema.paths;
  assert.ok(pagePaths.uri, 'Page must have uri');
  assert.ok(pagePaths.owner, 'Page must have owner');
  assert.strictEqual(pagePaths.domain, undefined, 'Page must not have domain field in Wave 3');
  assert.strictEqual(pagePaths.customDomain, undefined, 'Page must not have customDomain field in Wave 3');
});

await check('identity: Page _id remains available as permanent Mongo document identity', () => {
  const mockId = new mongoose.Types.ObjectId();
  const page = { _id: mockId, uri: 'alex' };
  assert.equal(getStablePageId(page), mockId.toString());
});

await check('identity: getStablePageId handles various object shapes safely', () => {
  assert.equal(getStablePageId(null), null);
  assert.equal(getStablePageId(undefined), null);
  assert.equal(getStablePageId('not-an-object'), null);
  assert.equal(getStablePageId({}), null);
  assert.equal(getStablePageId({ id: 'page-123' }), 'page-123');
});

await check('identity: no custom-domain fields added to Subscription model', () => {
  const subPaths = Subscription.schema.paths;
  assert.strictEqual(subPaths.domain, undefined);
  assert.strictEqual(subPaths.customDomain, undefined);
  assert.strictEqual(subPaths.hostname, undefined);
});

await check('identity: no ownership migration introduced in Page or Upload schemas', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  const uploadSrc = fs.readFileSync(path.join(projectRoot, 'models/Upload.js'), 'utf-8');
  assert.ok(pageSrc.includes('owner: {'), 'Page owner remains email');
  assert.ok(uploadSrc.includes('owner: { type: String'), 'Upload owner remains email');
});

// ==========================================
// 2. Platform Profile URL Resolution
// ==========================================

const originalEnvUrl = process.env.NEXT_PUBLIC_URL;
process.env.NEXT_PUBLIC_URL = 'https://linktree.example.com';

await check('platform-url: getPlatformProfileUrl produces standard platform URL', () => {
  assert.equal(getPlatformProfileUrl('alex'), 'https://linktree.example.com/alex');
  assert.equal(getPlatformProfileUrl('/alex/'), 'https://linktree.example.com/alex');
  assert.equal(getPlatformProfileUrl(''), '');
  assert.equal(getPlatformProfileUrl(null), '');
  assert.equal(getPlatformProfileUrl(undefined), '');
});

await check('platform-url: getPublicProfileUrl acts as backward-compatible alias', () => {
  assert.equal(getPublicProfileUrl('alex'), 'https://linktree.example.com/alex');
  assert.equal(getPublicProfileUrl('/alex/'), 'https://linktree.example.com/alex');
});

await check('platform-url: platform base URL trailing slashes are cleanly stripped', () => {
  const saved = process.env.NEXT_PUBLIC_URL;
  try {
    process.env.NEXT_PUBLIC_URL = 'https://linktree.example.com///';
    assert.equal(getBaseUrl(), 'https://linktree.example.com');
    assert.equal(getPlatformProfileUrl('alex'), 'https://linktree.example.com/alex');
  } finally {
    process.env.NEXT_PUBLIC_URL = saved;
  }
});

await check('platform-url: profile path contains no duplicate slashes', () => {
  assert.equal(getPlatformProfileUrl('///alex///'), 'https://linktree.example.com/alex');
});

await check('platform-url: current callers produce platform URLs when domain is absent', () => {
  const page = { uri: 'alex' };
  assert.equal(getCanonicalProfileUrl(page), 'https://linktree.example.com/alex');
  assert.equal(getCanonicalProfileUrl('alex'), 'https://linktree.example.com/alex');
});

// ==========================================
// 3. Canonical Fallback & Trusted Domain Contract
// ==========================================

await check('canonical-fallback: missing domain returns platform URL', () => {
  assert.equal(getCanonicalProfileUrl({ uri: 'alex' }), 'https://linktree.example.com/alex');
});

await check('canonical-fallback: null or undefined domain options return platform URL', () => {
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: null }),
    'https://linktree.example.com/alex'
  );
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: undefined }),
    'https://linktree.example.com/alex'
  );
});

await check('canonical-fallback: malformed non-object domain returns platform URL', () => {
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: 'alexcreator.com' }),
    'https://linktree.example.com/alex'
  );
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: ['alexcreator.com'] }),
    'https://linktree.example.com/alex'
  );
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: 12345 }),
    'https://linktree.example.com/alex'
  );
});

await check('canonical-fallback: unverified domain returns platform URL', () => {
  const unverifiedDomain = {
    hostname: 'alexcreator.com',
    status: 'pending',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: unverifiedDomain }),
    'https://linktree.example.com/alex'
  );
});

await check('canonical-fallback: verified but non-primary domain returns platform URL', () => {
  const nonPrimaryDomain = {
    hostname: 'alexcreator.com',
    status: 'verified',
    isPrimary: false,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: nonPrimaryDomain }),
    'https://linktree.example.com/alex'
  );
});

await check('canonical: verified primary valid hostname produces HTTPS root custom-domain URL', () => {
  const validDomain = {
    hostname: 'alexcreator.com',
    status: 'verified',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: validDomain }),
    'https://alexcreator.com/'
  );
});

// ==========================================
// 4. Custom Domain Formatting & Hostname Security
// ==========================================

await check('custom-domain: custom URL does NOT append /{uri} (serves at root /)', () => {
  const validDomain = {
    hostname: 'creator.example',
    status: 'verified',
    isPrimary: true,
  };
  const canonical = getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: validDomain });
  assert.equal(canonical, 'https://creator.example/');
  const parsed = new URL(canonical);
  assert.equal(parsed.pathname, '/', 'Custom domain canonical URL must serve at root / path');
  assert.ok(!parsed.pathname.includes('alex'), 'Must not append uri handle to custom domain path');
});

await check('custom-domain: hostname normalized to lowercase', () => {
  const domainUpper = {
    hostname: 'ALEXCREATOR.COM',
    status: 'verified',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: domainUpper }),
    'https://alexcreator.com/'
  );
});

await check('custom-domain: harmless trailing dot handled cleanly', () => {
  const domainDot = {
    hostname: 'alexcreator.com.',
    status: 'verified',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: domainDot }),
    'https://alexcreator.com/'
  );
});

await check('custom-domain: scheme in hostname input is rejected', () => {
  assert.equal(normalizeHostname('https://evil.example').ok, false);
  assert.equal(normalizeHostname('http://evil.example').ok, false);
  assert.equal(normalizeHostname('//evil.example').ok, false);

  const domainScheme = {
    hostname: 'https://evil.example',
    status: 'verified',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: domainScheme }),
    'https://linktree.example.com/alex'
  );
});

await check('custom-domain: path-bearing hostname is rejected', () => {
  assert.equal(normalizeHostname('creator.example/path').ok, false);
  const domainPath = {
    hostname: 'creator.example/path',
    status: 'verified',
    isPrimary: true,
  };
  assert.equal(
    getCanonicalProfileUrl({ uri: 'alex' }, { verifiedPrimaryDomain: domainPath }),
    'https://linktree.example.com/alex'
  );
});

await check('custom-domain: query-bearing hostname is rejected', () => {
  assert.equal(normalizeHostname('creator.example?x=1').ok, false);
});

await check('custom-domain: fragment-bearing hostname is rejected', () => {
  assert.equal(normalizeHostname('creator.example#fragment').ok, false);
});

await check('custom-domain: credentials-like hostname is rejected', () => {
  assert.equal(normalizeHostname('user@creator.example').ok, false);
});

await check('custom-domain: explicit arbitrary port is rejected', () => {
  assert.equal(normalizeHostname('creator.example:8080').ok, false);
});

// ==========================================
// 5. Centralization & Callers Audit
// ==========================================

await check('centralization: public profile page imports and uses getCanonicalProfileUrl', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('getCanonicalProfileUrl'), 'page.js must import getCanonicalProfileUrl');
  assert.ok(pageSrc.includes('alternates: canonicalUrl'), 'page.js metadata must specify canonical alternate');
  assert.ok(pageSrc.includes('PublicShareButton'), 'page.js must pass canonical URL to PublicShareButton');
});

await check('centralization: dashboard layout and analytics use getCanonicalProfileUrl', () => {
  const layoutSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/layout.js'), 'utf-8');
  const analyticsSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/analytics/page.js'), 'utf-8');
  const pageApiSrc = fs.readFileSync(path.join(projectRoot, 'app/api/page/route.js'), 'utf-8');

  assert.ok(layoutSrc.includes('getCanonicalProfileUrl'), 'layout.js must use getCanonicalProfileUrl');
  assert.ok(analyticsSrc.includes('getCanonicalProfileUrl'), 'analytics page must use getCanonicalProfileUrl');
  assert.ok(pageApiSrc.includes('getCanonicalProfileUrl'), 'page API route must use getCanonicalProfileUrl');
});

await check('centralization: no ad-hoc manual ${base}/${uri} concatenation in edited surfaces', () => {
  const layoutSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/layout.js'), 'utf-8');
  assert.ok(!layoutSrc.includes('${baseUrl}/${page?.uri}'));
});

await check('centralization: PublicShareButton safely consumes supplied URL or falls back to window.location', () => {
  const shareBtnSrc = fs.readFileSync(path.join(projectRoot, 'components/buttons/PublicShareButton.js'), 'utf-8');
  assert.ok(shareBtnSrc.includes('url || window.location.href'));
});

// ==========================================
// 6. Non-Regression & Safety Invariants
// ==========================================

await check('safety: zero Domain models or collections created in Wave 3', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'models/Domain.js')));
});

await check('safety: zero host routing middleware created in Wave 3', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'middleware.js')));
});

await check('safety: Event schema remains untouched and URI-keyed', () => {
  const eventSrc = fs.readFileSync(path.join(projectRoot, 'models/Event.js'), 'utf-8');
  assert.ok(eventSrc.includes('page: { type: String'), 'Event.page remains String URI');
  assert.strictEqual(Event.schema?.paths?.pageId, undefined);
});

await check('safety: /api/click route remains untouched and functional', () => {
  const clickSrc = fs.readFileSync(path.join(projectRoot, 'app/api/click/route.js'), 'utf-8');
  assert.ok(clickSrc.includes('normalizeReferrer'));
});

await check('safety: S3 upload key generation remains UUID-based and decoupled from domains', () => {
  const uploadSrc = fs.readFileSync(path.join(projectRoot, 'app/api/upload/route.js'), 'utf-8');
  assert.ok(uploadSrc.includes('uuidv4()'), 'Upload key generation uses uuidv4');
  assert.ok(!uploadSrc.includes('domain'));
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.tldjs);
  assert.ok(!allDeps.psl);
});

await check('safety: existing public profile route remains [uri]', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'app/(page)/[uri]/page.js')));
});

await check('safety: prior wave suites (Wave 1 & Wave 2) remain 100% green', () => {
  const wave1Output = execSync('node scripts/verify-v2.1-wave1.js', {
    cwd: projectRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  assert.ok(wave1Output.includes('FAILED:  0'), 'Wave 1 suite must pass');

  const wave2Output = execSync('node scripts/verify-v2.1-wave2.js', {
    cwd: projectRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  assert.ok(wave2Output.includes('FAILED:  0'), 'Wave 2 suite must pass');
});

// Restore original env
process.env.NEXT_PUBLIC_URL = originalEnvUrl;

console.log('\n================================');
console.log('Wave 3 Profile Identity & URL Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
