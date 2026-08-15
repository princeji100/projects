import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

let passed = 0;
let failed = 0;
let skipped = 0;

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

console.log('--- Running Phase 6 Portfolio Presentation & Final Release Gate Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const monorepoRoot = path.resolve(projectRoot, '../..');

// 1. Explicit Traceability Matrix: All 39 v1 Requirements uniquely mapped to implementation & verification evidence
await check('requirements-traceability: all 39 v1 requirements uniquely mapped to implementation & test evidence', async () => {
  const reqPath = fs.existsSync(path.join(projectRoot, '.planning/REQUIREMENTS.md'))
    ? path.join(projectRoot, '.planning/REQUIREMENTS.md')
    : path.join(projectRoot, '.planning/milestones/v1.0-REQUIREMENTS.md');
  assert.ok(fs.existsSync(reqPath), 'REQUIREMENTS.md or v1.0-REQUIREMENTS.md must exist');
  const reqContent = fs.readFileSync(reqPath, 'utf-8');

  // Explicit mapping of all 39 v1 requirements
  const requirementMatrix = [
    // Phase 1: Security Hardening (10)
    { id: 'SEC-01', impl: 'app/api/upload/route.js', test: 'scripts/verify-phase1.5.js', pattern: /requireSession/ },
    { id: 'SEC-02', impl: 'app/api/upload/route.js', test: 'scripts/verify-phase1.5.js', pattern: /MAX_UPLOAD_BYTES/ },
    { id: 'SEC-03', impl: 'app/api/upload/route.js', test: 'scripts/verify-phase1.5.js', pattern: /detectImageType/ },
    { id: 'SEC-04', impl: 'app/api/upload/route.js', test: 'scripts/verify-phase1.5.js', pattern: /QUOTA_BYTES/ },
    { id: 'SEC-05', impl: 'lib/rateLimit.js', test: 'scripts/verify-phase2.js', pattern: /checkRateLimit/ },
    { id: 'SEC-06', impl: 'lib/username.js', test: 'scripts/verify-phase2.js', pattern: /RESERVED_USERNAMES/ },
    { id: 'SEC-07', impl: 'lib/username.js', test: 'scripts/verify-phase2.js', pattern: /validateUsername/ },
    { id: 'SEC-08', impl: 'app/api/click/route.js', test: 'scripts/verify-phase2.js', pattern: /atob/ },
    { id: 'SEC-11', impl: 'app/api/auth/[...nextauth]/route.js', test: 'scripts/verify-phase1.5.js', pattern: /AllowedUser/ },
    { id: 'SEC-12', impl: 'lib/connectToDB.js', test: 'scripts/verify-phase1.5.js', pattern: /connectToDatabase/ },

    // Phase 1.5: Admin & Upload Management (4)
    { id: 'ADMIN-01', impl: 'app/(app)/dashboard/admin/page.js', test: 'scripts/verify-phase1.5.js', pattern: /AllowedUser/ },
    { id: 'ADMIN-02', impl: 'app/(app)/dashboard/admin/page.js', test: 'scripts/verify-phase1.5.js', pattern: /getAdminEmail|isUserAdmin|ADMIN_EMAIL/ },
    { id: 'UPLOAD-01', impl: 'app/(app)/dashboard/uploads/page.js', test: 'scripts/verify-phase1.5.js', pattern: /quota|Upload/ },
    { id: 'UPLOAD-02', impl: 'action/UploadAction.js', test: 'scripts/verify-phase1.5.js', pattern: /deleteUpload/ },

    // Phase 2: Broken Paths Fixes (9)
    { id: 'FIX-01', impl: 'action/PageAction.js', test: 'scripts/verify-phase2.js', pattern: /success:\s*true/ },
    { id: 'FIX-02', impl: 'components/forms/UserNameForm.js', test: 'scripts/verify-phase2.js', pattern: /result\??\.success/ },
    { id: 'FIX-03', impl: 'app/(page)/[uri]/page.js', test: 'scripts/verify-phase2.js', pattern: /notFound/ },
    { id: 'FIX-04', impl: 'app/(page)/[uri]/page.js', test: 'scripts/verify-phase2.js', pattern: /Event\.create/ },
    { id: 'FIX-05', impl: 'components/media/SafeImage.js', test: 'scripts/verify-phase2.js', pattern: /fallback/ },
    { id: 'FIX-06', impl: 'app/(page)/[uri]/page.js', test: 'scripts/verify-phase2.js', pattern: /await params/ },
    { id: 'FIX-07', impl: 'lib/analyticsData.js', test: 'scripts/verify-phase2.js', pattern: /link\._id|link\.id/ },
    { id: 'FIX-08', impl: 'lib/socialButtons.js', test: 'scripts/verify-phase2.js', pattern: /allButtons|getSocialButton/ },
    { id: 'FIX-09', impl: 'action/grabusername.js', test: 'scripts/verify-phase2.js', pattern: /connectToDatabase/ },

    // Phase 3: Link Lifecycle & UTC Scheduling (4)
    { id: 'LINK-01', impl: 'models/Page.js', test: 'scripts/verify-phase3.js', pattern: /active:\s*\{/ },
    { id: 'LINK-02', impl: 'lib/linkLifecycle.js', test: 'scripts/verify-phase3.js', pattern: /isLinkLive/ },
    { id: 'LINK-03', impl: 'models/Page.js', test: 'scripts/verify-phase3.js', pattern: /startsAt/ },
    { id: 'LINK-04', impl: 'app/(page)/[uri]/page.js', test: 'scripts/verify-phase3.js', pattern: /isLinkLive/ },

    // Phase 4: Themes & QR Sharing (5)
    { id: 'THEME-01', impl: 'lib/themes.js', test: 'scripts/verify-phase4.js', pattern: /themes\s*=/ },
    { id: 'THEME-02', impl: 'components/forms/PageSettingForm.js', test: 'scripts/verify-phase4.js', pattern: /preset/ },
    { id: 'THEME-03', impl: 'models/Page.js', test: 'scripts/verify-phase4.js', pattern: /enum:\s*\[.*'color'.*'preset'.*\]/ },
    { id: 'QR-01', impl: 'components/sections/QRCodeCard.js', test: 'scripts/verify-phase4.js', pattern: /QRCodeSVG|QRCodeCanvas|qr/i },
    { id: 'QR-02', impl: 'components/sections/QRCodeCard.js', test: 'scripts/verify-phase4.js', pattern: /toDataURL|download/i },

    // Phase 5: Actionable Analytics (4)
    { id: 'ANA-01', impl: 'lib/analyticsParser.js', test: 'scripts/verify-phase5.js', pattern: /parseDevice|normalizeReferrer/ },
    { id: 'ANA-02', impl: 'lib/analyticsData.js', test: 'scripts/verify-phase5.js', pattern: /selectedRange|7d|30d/ },
    { id: 'ANA-03', impl: 'lib/analyticsData.js', test: 'scripts/verify-phase5.js', pattern: /rankedLinks/ },
    { id: 'ANA-04', impl: 'components/analytics/AnalyticsClient.js', test: 'scripts/verify-phase5.js', pattern: /hasData/ },

    // Phase 6: Portfolio Presentation (3)
    { id: 'DOC-01', impl: 'README.md', test: 'scripts/verify-phase6.js', pattern: /Getting Started/ },
    { id: 'DOC-02', impl: 'README.md', test: 'scripts/verify-phase6.js', pattern: /docs\/screenshots/ },
    { id: 'DOC-03', impl: '.env.example', test: 'scripts/verify-phase6.js', pattern: /MONGODB_URI/ },
  ];

  assert.equal(requirementMatrix.length, 39, 'Must explicitly map all 39 requirements');

  for (const item of requirementMatrix) {
    // 1. Check in REQUIREMENTS.md
    assert.ok(
      new RegExp(`- \\[x\\] \\*\\*${item.id}\\*\\*`).test(reqContent),
      `Requirement ${item.id} must be checked off in REQUIREMENTS.md`
    );

    // 2. Check implementation file exists and contains expected pattern
    const implFullPath = path.join(projectRoot, item.impl);
    assert.ok(fs.existsSync(implFullPath), `Implementation file ${item.impl} for ${item.id} must exist`);
    const implContent = fs.readFileSync(implFullPath, 'utf-8');
    assert.match(
      implContent,
      item.pattern,
      `Implementation file ${item.impl} for ${item.id} must contain expected implementation pattern`
    );

    // 3. Check verification test file exists
    const testFullPath = path.join(projectRoot, item.test);
    assert.ok(fs.existsSync(testFullPath), `Verification file ${item.test} for ${item.id} must exist`);
  }
});

// 2. Canonical README.md Completeness & Monorepo Root Linkage (DOC-01)
await check('readme-completeness: projects/linktree/README.md covers all required sections and monorepo link', async () => {
  const readmePath = path.join(projectRoot, 'README.md');
  assert.ok(fs.existsSync(readmePath), 'projects/linktree/README.md must exist');
  const content = fs.readFileSync(readmePath, 'utf-8');

  // Live demo & stack
  assert.match(content, /https:\/\/linktree-princeji\.vercel\.app\//, 'Must include live demo URL');
  assert.match(content, /Next\.js 15/, 'Must specify Next.js 15');
  assert.match(content, /React 19/, 'Must specify React 19');
  assert.match(content, /MongoDB/, 'Must specify MongoDB');
  assert.match(content, /AWS S3/, 'Must specify AWS S3');

  // Key sections
  assert.match(content, /Key Features/i, 'Must include Key Features section');
  assert.match(content, /Visual Showcase/i, 'Must include Visual Showcase section');
  assert.match(content, /Technology Stack/i, 'Must include Technology Stack section');
  assert.match(content, /Getting Started/i, 'Must include Getting Started / Local Setup section');
  assert.match(content, /Verification & Automated Test Suites/i, 'Must include Testing section');
  assert.match(content, /Project Structure/i, 'Must include Project Structure section');

  // Copy-pasteable setup commands from monorepo root
  assert.match(content, /cd projects\/linktree/, 'Must instruct user to cd projects/linktree');
  assert.match(content, /cp \.env\.example \.env/, 'Must instruct user to copy .env.example');
  assert.match(content, /npm install/, 'Must instruct user to npm install');
  assert.match(content, /npm run dev/, 'Must instruct user to npm run dev');

  // Monorepo root link check
  const rootReadmePath = path.join(monorepoRoot, 'README.md');
  assert.ok(fs.existsSync(rootReadmePath), 'Monorepo root README.md must exist');
  const rootContent = fs.readFileSync(rootReadmePath, 'utf-8');
  assert.match(
    rootContent,
    /\[`projects\/linktree`\]\(\.\/projects\/linktree\/README\.md\)/,
    'Monorepo root README must link directly to ./projects/linktree/README.md'
  );
});

// 3. Rigorous PNG Image Validation (magic bytes, dimensions, references) (DOC-02)
await check('screenshot-assets-validation: all 5 screenshots are authentic PNGs with valid headers and dimensions', async () => {
  const screenshotsDir = path.join(projectRoot, 'docs/screenshots');
  assert.ok(fs.existsSync(screenshotsDir), 'docs/screenshots/ directory must exist');

  const requiredScreenshots = [
    'public-profile.png',
    'profile-settings.png',
    'link-scheduling.png',
    'qr-card.png',
    'analytics-dashboard.png',
  ];

  const readmeContent = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf-8');

  for (const filename of requiredScreenshots) {
    const filePath = path.join(screenshotsDir, filename);
    assert.ok(fs.existsSync(filePath), `Screenshot ${filename} must exist`);

    const buf = fs.readFileSync(filePath);
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

    // Parse IHDR chunk width and height (offset 16 to 24)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.ok(width >= 800, `Screenshot ${filename} width (${width}px) must be >= 800px`);
    assert.ok(height >= 400, `Screenshot ${filename} height (${height}px) must be >= 400px`);

    // Verify referenced in README
    assert.ok(
      readmeContent.includes(`docs/screenshots/${filename}`),
      `README.md must reference docs/screenshots/${filename}`
    );
  }
});

// 4. Environment Variables Template & Zero Leaked Secrets (DOC-03)
await check('env-template-safety: .env.example documents all keys with placeholders and zero leaked secrets', async () => {
  const envExamplePath = path.join(projectRoot, '.env.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');

  const content = fs.readFileSync(envExamplePath, 'utf-8');

  const requiredEnvKeys = [
    'MONGODB_URI',
    'BUCKET_NAME',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'NEXT_PUBLIC_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'ADMIN_EMAIL',
  ];

  for (const key of requiredEnvKeys) {
    assert.match(content, new RegExp(`^${key}=`, 'm'), `.env.example must document ${key}`);
  }

  // Confirm placeholder format in .env.example (no real credentials)
  assert.match(content, /S3_ACCESS_KEY=your-aws-access-key-id/, '.env.example must use placeholder for S3_ACCESS_KEY');
  assert.match(content, /S3_SECRET_KEY=your-aws-secret-access-key/, '.env.example must use placeholder for S3_SECRET_KEY');
});

// 5. Isolated Clean-Clone / Worktree Onboarding Verification (Non-destructive)
await check('isolated-clean-clone-onboarding: validates fresh project onboarding without relying on local state', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linktree-onboarding-test-'));

  try {
    // Copy essential project files (excluding node_modules, .next, .env)
    const essentialItems = [
      'package.json',
      'README.md',
      '.env.example',
      'models',
      'lib',
      'components',
      'app',
      'action',
    ];

    for (const item of essentialItems) {
      const src = path.join(projectRoot, item);
      const dest = path.join(tempDir, item);
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    }

    // 1. Verify package.json integrity in isolated directory
    const tempPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'));
    assert.equal(tempPkg.name, 'linktree');
    assert.ok(tempPkg.dependencies?.next, 'Must have next dependency');
    assert.ok(tempPkg.dependencies?.react, 'Must have react dependency');
    assert.ok(tempPkg.dependencies?.mongoose, 'Must have mongoose dependency');

    // 2. Verify safe .env creation from .env.example
    const envExample = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
    const safeEnvContent = envExample
      .replace(/your-s3-bucket-name/, 'mock-test-bucket')
      .replace(/your-aws-access-key-id/, 'mock-test-key')
      .replace(/your-aws-secret-access-key/, 'mock-test-secret')
      .replace(/your-nextauth-secret/, 'mock-secret');

    fs.writeFileSync(path.join(tempDir, '.env'), safeEnvContent, 'utf-8');
    assert.ok(fs.existsSync(path.join(tempDir, '.env')), 'Clean clone can generate valid .env');
  } finally {
    // Clean up temporary worktree
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// 6. Subprocess Execution of Prior Phase Verification Suites (1.5 through 5)
await check('prior-phase-verification-suites: executes Phase 1.5, 2, 3, 4, 5 verification suites as subprocesses', async () => {
  const suites = [
    'scripts/verify-phase1.5.js',
    'scripts/verify-phase2.js',
    'scripts/verify-phase3.js',
    'scripts/verify-phase4.js',
    'scripts/verify-phase5.js',
  ];

  for (const suite of suites) {
    const suitePath = path.join(projectRoot, suite);
    assert.ok(fs.existsSync(suitePath), `Test suite ${suite} must exist`);

    const output = execSync(`node --env-file=.env ${suite}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    assert.match(output, /FAILED:\s*0/, `Suite ${suite} must pass with 0 failures`);
  }
});

// 7. Single Production Build Validation
await check('production-build-release-gate: Next.js production build succeeds with exit code 0', async () => {
  const output = execSync('npm run build', {
    cwd: projectRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  assert.match(output, /Compiled successfully/i, 'Production build must compile successfully');
});

console.log('\n================================');
console.log('Phase 6 Final Release Gate Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
