/**
 * ASL Practice Coach - Sign Bootstrapper & Biomechanical Validator
 * Validates canonical reference landmark fixtures and feature bounds across all 24 static letters.
 * Runs offline with 0 external network requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { evaluate } from '../src/engine/evaluate';
import type { Vec3 } from '../src/engine/types';
import type { SignPackBundle, EvaluatorConfig } from '../src/engine/evaluateTypes';
import type { ThresholdsPackFile } from '../src/packs/schema';

function loadPackBundle(): SignPackBundle {
  const thresholdsPath = path.resolve('src', 'packs', 'asl', 'thresholds.json');
  const configPath = path.resolve('src', 'packs', 'asl', 'evaluator-config.json');

  const thresholds = JSON.parse(
    fs.readFileSync(thresholdsPath, 'utf-8')
  ) as ThresholdsPackFile;
  const config = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  ) as EvaluatorConfig;

  return { thresholds, config };
}

export function validateAllStaticSigns(): {
  total: number;
  passed: number;
  failures: string[];
} {
  const packBundle = loadPackBundle();
  const refPath = path.resolve('src', 'packs', 'asl', 'reference.json');
  const referencePack = JSON.parse(fs.readFileSync(refPath, 'utf-8'));

  const letters = Object.keys(referencePack.signs).sort();
  const failures: string[] = [];

  for (const letter of letters) {
    const entry = (referencePack.signs as Record<string, { canonicalLandmarks: Vec3[] }>)[letter];
    const result = evaluate(entry.canonicalLandmarks, letter, packBundle);

    if (result.status !== 'correct') {
      failures.push(
        `Letter ${letter}: status=${result.status}, reason=${result.unableReason}, topIssue=${result.topIssue?.ruleId ?? 'none'}`
      );
    }
  }

  return {
    total: letters.length,
    passed: letters.length - failures.length,
    failures,
  };
}

console.log('[bootstrap-signs] Validating all static ASL signs (alphabet + numbers) from reference.json...');
const res = validateAllStaticSigns();
console.log(`[bootstrap-signs] Result: ${res.passed}/${res.total} passing (100% target).`);
if (res.failures.length > 0) {
  console.error('[bootstrap-signs] Failures:\n', res.failures.join('\n'));
  process.exit(1);
} else {
  console.log('[bootstrap-signs] ✓ All static ASL signs verified with perfect biomechanical parity.');
}
