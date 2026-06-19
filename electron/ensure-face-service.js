/**
 * Guard run automatically before `npm run dist` (via the "predist" script).
 *
 * Makes it impossible to package an installer without the standalone face
 * service: if services/face/dist/face-service/face-service.exe is missing it
 * builds it via build-face.bat; if it already exists it skips instantly.
 *
 * Exits non-zero (aborting the build) if the face exe can't be produced, so a
 * packaged installer can never silently ship without the face service.
 */
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const faceDir = path.join(__dirname, '..', 'services', 'face');
const exe = path.join(faceDir, 'dist', 'face-service', 'face-service.exe');

if (existsSync(exe)) {
  console.log('[predist] face-service.exe present — skipping face build.');
  process.exit(0);
}

console.log('[predist] face-service.exe missing — building it via build-face.bat ...');
const bat = path.join(faceDir, 'build-face.bat');
const r = spawnSync('cmd', ['/c', bat], { stdio: 'inherit' });

if (r.status !== 0) {
  console.error('\n[predist] build-face.bat FAILED — cannot package without the face service.');
  console.error('[predist] Build it manually and check the error: desktop\\services\\face\\build-face.bat');
  process.exit(1);
}
if (!existsSync(exe)) {
  console.error('\n[predist] build-face.bat ran but face-service.exe is still missing. Aborting.');
  process.exit(1);
}
console.log('[predist] face service built OK — continuing to package.');
