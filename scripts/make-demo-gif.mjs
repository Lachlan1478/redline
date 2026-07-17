// Convert the recorded demo video into the README's inline GIF.
// Usage: node scripts/make-demo-gif.mjs   (after scripts/record-demo.mjs)
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { globSync } from 'node:fs';

const INPUT = 'docs/demo/redline-demo.webm';
const OUTPUT = 'docs/demo/redline-demo.gif';

function findFfmpeg() {
  // Playwright's bundled ffmpeg is a stripped screencast build (no palette
  // filters) — a real ffmpeg is required (winget install Gyan.FFmpeg).
  const local = process.env.LOCALAPPDATA;
  if (local) {
    const candidates = globSync(
      `${local.replaceAll('\\', '/')}/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe`,
    );
    if (candidates.length > 0) return candidates[0];
  }
  return 'ffmpeg'; // fall back to PATH
}

const filter =
  '[0:v] fps=7,scale=720:-1:flags=lanczos,split [a][b];' +
  '[a] palettegen=stats_mode=diff [p];' +
  '[b][p] paletteuse=dither=bayer:bayer_scale=5';

execFileSync(findFfmpeg(), [
  '-y',
  '-loglevel', 'error',
  '-ss', '1',            // skip the initial paint
  '-i', INPUT,
  '-filter_complex', filter,
  OUTPUT,
]);

const mb = statSync(OUTPUT).size / 1024 / 1024;
console.log(`${OUTPUT}: ${mb.toFixed(2)} MB`);
if (mb > 9.5) {
  console.warn('Warning: GitHub renders files up to ~10 MB — consider lowering fps/width.');
}
