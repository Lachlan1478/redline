// Records the README demo video: a scripted tour of Compare and Assemble.
// Usage: node scripts/record-demo.mjs  (requires: npm run build first)
import { execSync, spawn } from 'node:child_process';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/redline/`;
const VIDEO_DIR = 'docs/demo/.raw';
const FINAL = 'docs/demo/redline-demo.webm';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function serverUp() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

// Reuse an already-running preview server; otherwise start one.
let preview;
if (!(await serverUp())) {
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });
}

try {
  let ready = await serverUp();
  for (let i = 0; i < 120 && !ready; i++) {
    await pause(500);
    ready = await serverUp();
  }
  if (!ready) throw new Error(`Preview server did not start on port ${PORT}`);

  await mkdir(VIDEO_DIR, { recursive: true });
  // channel: 'chromium' uses the full browser build in headless mode, so the
  // separate headless-shell download is not required.
  const browser = await chromium.launch({ channel: 'chromium' });

  // Warm the preview server and browser cache with a throwaway context so the
  // recorded video doesn't open on seconds of blank page load.
  const warmup = await browser.newContext();
  const warmupPage = await warmup.newPage();
  await warmupPage.goto(BASE, { waitUntil: 'networkidle' });
  await warmup.close();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  // ── Scene 1: Compare two versions of a circular ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'REDLINE' }).waitFor();
  await pause(2000);
  await page
    .locator('input[type="file"]')
    .nth(0)
    .setInputFiles('e2e/fixtures/long-original.docx');
  await pause(1200);
  await page.locator('input[type="file"]').nth(1).setInputFiles('e2e/fixtures/long-change.docx');
  await pause(2500);

  // Walk the amendments.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Next change' }).click();
    await pause(1600);
  }
  // Jump via the margin rail.
  await page.getByRole('button', { name: 'Go to amendment 5' }).click();
  await pause(1800);
  // Copy the amendment summary.
  await page.locator('[data-testid="copy-summary"]').click();
  await pause(1600);

  // ── Scene 2: Assemble a contract from a term sheet ──
  await page.getByRole('button', { name: 'Assemble' }).click();
  await pause(1800);

  const expand = page.locator('button[aria-label="Expand Term sheet"]');
  if (await expand.count()) await expand.click();
  await pause(600);

  const inputFor = (label) =>
    page.locator('aside label').filter({ hasText: label }).locator('input').first();
  await inputFor('Party A').pressSequentially('Alpha Bank plc', { delay: 45 });
  await pause(700);
  await inputFor('Party B').pressSequentially('Beta Fund LP', { delay: 45 });
  await pause(700);
  await inputFor('Underlying').pressSequentially('S&P 500 Index', { delay: 45 });
  await pause(1200);

  // Add Right of First Refusal — watch the renumbering ripple.
  const expandClauses = page.locator('button[aria-label="Expand Clauses"]');
  if (await expandClauses.count()) await expandClauses.click();
  await pause(600);
  await page.locator('[data-testid="toggle-rofr"]').click();
  await pause(2500);

  // ── Scene 3: the deviation redline ──
  await page.locator('[data-testid="toggle-deviation"]').click();
  await pause(3000);
  await page.locator('[data-testid="toggle-deviation"]').click();
  await pause(1500);

  await context.close();
  await browser.close();

  const files = await readdir(VIDEO_DIR);
  const video = files.find((f) => f.endsWith('.webm'));
  if (!video) throw new Error('No video produced');
  await rename(`${VIDEO_DIR}/${video}`, FINAL);
  await rm(VIDEO_DIR, { recursive: true, force: true });
  console.log(`Demo recorded to ${FINAL}`);
} finally {
  // shell:true wraps the server in cmd.exe on Windows; kill the whole tree.
  if (preview) {
    try {
      execSync(`taskkill /pid ${preview.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      preview.kill();
    }
  }
}
