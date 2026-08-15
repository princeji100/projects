import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');

let totalPassed = 0;
let totalFailed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    totalPassed++;
  } catch (error) {
    console.error(`  ✗ ${name}: ${error.message}`);
    totalFailed++;
    failures.push({ name, error: error.message });
  }
}

console.log('\n============================================================');
console.log('  MILESTONE V2.0 FINAL UNIFIED RELEASE GATE VERIFICATION');
console.log('============================================================\n');

// 1. Sanitize environment for all child verification executions
const sanitizedEnv = { ...process.env };
delete sanitizedEnv.MONGODB_URI;
delete sanitizedEnv.BUCKET_NAME;
delete sanitizedEnv.S3_ACCESS_KEY;
delete sanitizedEnv.S3_SECRET_KEY;

// 2. Execute all 14 V2 Wave verification suites in order
console.log('[SECTION 1] Executing Milestone V2 Wave Verification Suites (1..14):');

const v2WaveSuites = [
  { id: 'Wave 01', file: 'scripts/verify-v2-wave1.js', desc: 'Typography Schema & Registry' },
  { id: 'Wave 02', file: 'scripts/verify-v2-wave2.js', desc: 'Typography UI & Live Preview' },
  { id: 'Wave 03', file: 'scripts/verify-v2-wave3.js', desc: 'Link Badge Data Model & Normalization' },
  { id: 'Wave 04', file: 'scripts/verify-v2-wave4.js', desc: 'Link Badge UI & Rendering' },
  { id: 'Wave 05', file: 'scripts/verify-v2-wave5.js', desc: 'Tip Jar Data Model & Validation' },
  { id: 'Wave 06', file: 'scripts/verify-v2-wave6.js', desc: 'Tip Jar Settings UI & Preview' },
  { id: 'Wave 07', file: 'scripts/verify-v2-wave7.js', desc: 'Public Tip Jar Modal & QR Intent' },
  { id: 'Wave 08', file: 'scripts/verify-v2-wave8.js', desc: 'Media Embed Parser & Security' },
  { id: 'Wave 09', file: 'scripts/verify-v2-wave9.js', desc: 'YouTube Embed UI & Lazy Mount' },
  { id: 'Wave 10', file: 'scripts/verify-v2-wave10.js', desc: 'Spotify Embed UI & Lazy Mount' },
  { id: 'Wave 11', file: 'scripts/verify-v2-wave11.js', desc: 'Apple Music Embed UI & Lazy Mount' },
  { id: 'Wave 12', file: 'scripts/verify-v2-wave12.js', desc: 'SoundCloud Embed UI & Lazy Mount' },
  { id: 'Wave 13', file: 'scripts/verify-v2-wave13.js', desc: 'Analytics CSV Export & Formula Safety' },
  { id: 'Wave 14', file: 'scripts/verify-v2-wave14.js', desc: 'Print / Save as PDF Scoped Styles' },
];

for (const [idx, wave] of v2WaveSuites.entries()) {
  // Self-recursion safety invariant: verify-v2-final.js must never be in child suite list
  assert.notEqual(wave.file, 'scripts/verify-v2-final.js', 'Release verifier must not invoke itself');

  check(`[${String(idx + 1).padStart(2, '0')}/14] ${wave.id}: ${wave.desc}`, () => {
    const fullPath = path.join(projectRoot, wave.file);
    assert.ok(fs.existsSync(fullPath), `Suite file ${wave.file} must exist`);

    const output = execFileSync(process.execPath, [fullPath], {
      cwd: projectRoot,
      env: sanitizedEnv,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    assert.ok(output.includes('FAILED:  0'), `Suite ${wave.file} must report 0 failures`);
  });
}

console.log('\n[SECTION 2] Milestone V2 Release Invariants & Asset Integrity Audits:');

// 3. V2 Architecture Modules Presence
check('architecture-modules: all 10 core V2 library and component modules exist', () => {
  const expectedModules = [
    'lib/fonts.js',
    'lib/linkBadges.js',
    'lib/tipJar.js',
    'lib/mediaEmbeds.js',
    'lib/analyticsCsv.js',
    'components/tipjar/PublicTipJar.js',
    'components/media/YouTubeEmbed.js',
    'components/media/SpotifyEmbed.js',
    'components/media/AppleMusicEmbed.js',
    'components/media/SoundCloudEmbed.js',
  ];

  for (const mod of expectedModules) {
    const fullPath = path.join(projectRoot, mod);
    assert.ok(fs.existsSync(fullPath), `Required module ${mod} must exist in repository`);
  }
});

// 4. Zero Forbidden Runtime Dependencies & Zero Paid APIs
check('dependency-guard: package.json has zero paid SDKs, zero heavy PDF generators, and valid Tailwind 4', () => {
  const pkgRaw = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8');
  const pkg = JSON.parse(pkgRaw);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Forbidden dependencies that violate zero-paid-API or lightweight architecture invariants
  const forbiddenDeps = [
    'jspdf',
    'html2canvas',
    'pdfkit',
    'html2pdf.js',
    'puppeteer',
    'spotify-web-api-node',
    'youtube-v3-api',
    'musickit',
    'soundcloud-widget',
    'razorpay',
    'stripe',
    'phonepe',
  ];

  for (const dep of forbiddenDeps) {
    assert.ok(!deps[dep], `Must NOT contain forbidden dependency: ${dep}`);
  }

  // Must have Tailwind 4
  const twVersion = deps['tailwindcss'] || '';
  assert.ok(twVersion.includes('4') || twVersion.startsWith('^4'), 'Must use Tailwind CSS v4');

  // Must have qrcode.react
  assert.ok(deps['qrcode.react'], 'Must include qrcode.react for client-side QR generation');
});

// 5. Release Documentation Completeness
check('readme-v2-features: README.md thoroughly documents all 6 major V2 feature pillars', () => {
  const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf-8');

  const requiredFeatureMarkers = [
    /typography|google fonts/i,
    /link badge/i,
    /upi tip jar|tip jar/i,
    /youtube/i,
    /spotify/i,
    /apple music/i,
    /soundcloud/i,
    /export csv|csv export/i,
    /print \/ save as pdf|save as pdf/i,
  ];

  for (const marker of requiredFeatureMarkers) {
    assert.ok(marker.test(readme), `README.md must document feature matching ${marker}`);
  }

  // Ensure Tailwind 3.4 is no longer advertised
  assert.ok(!readme.includes('Tailwind-3.4'), 'README must not advertise stale Tailwind 3.4 badge');
  assert.ok(/Tailwind-4/i.test(readme), 'README must feature Tailwind 4 badge');
});

// 6. Environment Configuration Safety
check('env-template-safety: .env.example contains exactly required keys and zero third-party API requirements', () => {
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf-8');

  const requiredKeys = [
    'MONGODB_URI',
    'BUCKET_NAME',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'NEXT_PUBLIC_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'ADMIN_EMAIL',
  ];

  for (const key of requiredKeys) {
    assert.ok(envExample.includes(key), `.env.example must document ${key}`);
  }

  const forbiddenConfigKeys = [
    'YOUTUBE_API_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'APPLE_DEVELOPER_TOKEN',
    'SOUNDCLOUD_API_KEY',
    'RAZORPAY_KEY_ID',
    'STRIPE_SECRET_KEY',
    'PHONEPE_MERCHANT_ID',
  ];

  for (const key of forbiddenConfigKeys) {
    assert.ok(!envExample.includes(key), `.env.example must NOT require paid API key: ${key}`);
  }
});

// 7. Screenshot Assets Validity & Dimensions
check('screenshot-assets: all 5 screenshots are valid authentic PNGs with >=800x400 dimensions', () => {
  const screenshots = [
    'public-profile.png',
    'profile-settings.png',
    'link-scheduling.png',
    'qr-card.png',
    'analytics-dashboard.png',
  ];

  const screenshotsDir = path.join(projectRoot, 'docs/screenshots');

  for (const filename of screenshots) {
    const filePath = path.join(screenshotsDir, filename);
    assert.ok(fs.existsSync(filePath), `Screenshot ${filename} must exist`);

    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length > 1000, `Screenshot ${filename} must be non-empty`);

    // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4E &&
      buf[3] === 0x47 &&
      buf[4] === 0x0D &&
      buf[5] === 0x0A &&
      buf[6] === 0x1A &&
      buf[7] === 0x0A;
    assert.ok(isPng, `File ${filename} must have valid PNG magic signature`);

    // Read IHDR dimensions (offset 16..24)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.ok(width >= 800, `Screenshot ${filename} width (${width}px) must be >= 800px`);
    assert.ok(height >= 400, `Screenshot ${filename} height (${height}px) must be >= 400px`);
  }
});

// 8. Security Markers & Print Scoping Guard
check('security-and-print-guard: no dangerouslySetInnerHTML in media/tipjar, upi://pay protocol used, print CSS scoped', () => {
  const mediaFiles = [
    'components/media/YouTubeEmbed.js',
    'components/media/SpotifyEmbed.js',
    'components/media/AppleMusicEmbed.js',
    'components/media/SoundCloudEmbed.js',
    'components/tipjar/PublicTipJar.js',
  ];

  for (const file of mediaFiles) {
    const src = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    assert.ok(!src.includes('dangerouslySetInnerHTML'), `${file} must not use dangerouslySetInnerHTML`);
  }

  // Tip Jar generic intent check
  const tipJarSrc = fs.readFileSync(path.join(projectRoot, 'lib/tipJar.js'), 'utf-8');
  assert.ok(tipJarSrc.includes('upi://pay'), 'lib/tipJar.js must construct standard upi://pay intent');

  // Print CSS scope check (Wave 15B1 invariant)
  const cssSrc = fs.readFileSync(path.join(projectRoot, 'app/globals.css'), 'utf-8');
  const printBlock = cssSrc.slice(cssSrc.indexOf('@media print'));

  const dangerousGlobalPatterns = [
    /^\s+aside\s*[,{]/m,
    /^\s+header\s*[,{]/m,
    /^\s+nav\s*[,{]/m,
    /^\s+button\s*[,{]/m,
  ];

  for (const pattern of dangerousGlobalPatterns) {
    assert.ok(!pattern.test(printBlock), `globals.css must not globally hide element type: ${pattern}`);
  }
  assert.ok(cssSrc.includes('.no-print'), 'globals.css must use .no-print class selector');
});

// 9. Legacy V1 Regression Master Gate (Phase 6)
console.log('\n[SECTION 3] Executing Milestone V1 Master Regression & Build Gate (Phase 6):');

check('v1-regression-and-build-gate: executes scripts/verify-phase6.js with zero failures', () => {
  const phase6Path = path.join(projectRoot, 'scripts/verify-phase6.js');
  assert.ok(fs.existsSync(phase6Path), 'scripts/verify-phase6.js must exist');

  const output = execFileSync(process.execPath, [phase6Path], {
    cwd: projectRoot,
    env: sanitizedEnv,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  assert.ok(output.includes('FAILED:  0'), 'Phase 6 master gate must report 0 failures');
  assert.ok(output.includes('production-build-release-gate') && output.includes('PASSED:  7'), 'Phase 6 master gate must pass all 7 checks including production build');
});

console.log('\n============================================================');
console.log('  MILESTONE V2.0 FINAL RELEASE GATE SUMMARY:');
console.log(`    TOTAL CHECKS: ${totalPassed + totalFailed}`);
console.log(`    PASSED:       ${totalPassed}`);
console.log(`    FAILED:       ${totalFailed}`);
console.log('============================================================\n');

if (totalFailed > 0) {
  console.error('RELEASE GATE FAILED: The following checks failed:');
  for (const f of failures) {
    console.error(`  - ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('>>> FINAL RELEASE VERIFICATION RESULT: PASS <<<\n');
  process.exit(0);
}
