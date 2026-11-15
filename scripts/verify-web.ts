import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

interface Stage {
  number: number;
  name: string;
  command: string;
  durationMs?: number;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  error?: string;
}

const stages: Stage[] = [
  {
    number: 1,
    name: 'TypeScript Compilation (tsc --noEmit)',
    command: 'npx tsc --noEmit',
    status: 'SKIPPED',
  },
  {
    number: 2,
    name: 'Unit & Snapshot Parity Tests (vitest run)',
    command: 'npx vitest run',
    status: 'SKIPPED',
  },
  {
    number: 3,
    name: 'Evaluation Benchmark (scripts/evaluate.ts)',
    command: 'npx tsx scripts/evaluate.ts',
    status: 'SKIPPED',
  },
  {
    number: 4,
    name: 'Production Bundle Build (vite build)',
    command: 'npx vite build --mode production',
    status: 'SKIPPED',
  },
  {
    number: 5,
    name: 'Dist Inspection (scripts/inspect-dist.ts)',
    command: 'npx tsx scripts/inspect-dist.ts',
    status: 'SKIPPED',
  },
  {
    number: 6,
    name: 'Headless Offline Smoke Test (scripts/smoke-test.ts)',
    command: 'npx tsx scripts/smoke-test.ts',
    status: 'SKIPPED',
  },
];

function printSummary(): void {
  console.log('\n================================================================================');
  console.log('                          WEB VERIFICATION SUMMARY                              ');
  console.log('================================================================================');
  console.log(' # | Stage Description                                     | Status | Duration ');
  console.log('---+-------------------------------------------------------+--------+----------');

  for (const s of stages) {
    const num = s.number.toString().padStart(2, ' ');
    const desc = s.name.padEnd(53, ' ');
    const statusCol =
      s.status === 'PASS'
        ? '\x1b[32mPASS\x1b[0m  '
        : s.status === 'FAIL'
        ? '\x1b[31mFAIL\x1b[0m  '
        : '\x1b[33mSKIP\x1b[0m  ';
    const duration = s.durationMs !== undefined ? `${(s.durationMs / 1000).toFixed(2)}s`.padStart(8, ' ') : '     -  ';
    console.log(`${num} | ${desc} | ${statusCol} | ${duration}`);
  }
  console.log('================================================================================\n');
}

async function run(): Promise<void> {
  console.log('Starting ASL Practice Coach Web Verification Pipeline (npm run verify:web)...\n');

  let failed = false;

  for (const stage of stages) {
    console.log(`\n>>> [Stage ${stage.number}/6] ${stage.name}`);
    console.log(`    Running: ${stage.command}`);

    const start = performance.now();
    const result = spawnSync(stage.command, {
      shell: true,
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    const elapsed = performance.now() - start;
    stage.durationMs = elapsed;

    if (result.status === 0) {
      stage.status = 'PASS';
      console.log(`    ✓ Stage ${stage.number} passed in ${(elapsed / 1000).toFixed(2)}s`);
    } else {
      stage.status = 'FAIL';
      console.error(`\n    ✗ Stage ${stage.number} FAILED with exit code ${result.status}`);
      failed = true;
      break;
    }
  }

  printSummary();

  if (failed) {
    console.error('Verification failed. Pipeline halted at first error.');
    process.exit(1);
  } else {
    console.log('✓ All 6 verification stages passed successfully! Ready for desktop packaging.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
