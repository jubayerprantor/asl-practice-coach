import type { EvaluatorConfig, SignPackBundle } from '../engine';
import defaultEvaluatorConfigJson from './asl/evaluator-config.json';
import type {
  CurriculumPackFile,
  FeedbackPackFile,
  LanguagePackManifest,
  LoadedLanguagePack,
  ReferencePackFile,
  ThresholdsPackFile,
} from './schema';

const manifestModules = import.meta.glob<{ default: LanguagePackManifest }>(
  './*/pack.json',
  { eager: true }
);
const thresholdModules = import.meta.glob<{ default: ThresholdsPackFile }>(
  './*/thresholds.json',
  { eager: true }
);
const referenceModules = import.meta.glob<{ default: ReferencePackFile }>(
  './*/reference.json',
  { eager: true }
);
const feedbackModules = import.meta.glob<{ default: FeedbackPackFile }>(
  './*/feedback.json',
  { eager: true }
);
const curriculumModules = import.meta.glob<{ default: CurriculumPackFile }>(
  './*/curriculum.json',
  { eager: true }
);
const evalConfigModules = import.meta.glob<{ default: EvaluatorConfig }>(
  './*/evaluator-config.json',
  { eager: true }
);

function extractPackId(globPath: string): string | null {
  // Matches "./asl/pack.json" -> "asl"
  const match = globPath.match(/^\.\/([^/]+)\/[^/]+$/);
  return match ? match[1] : null;
}

function buildRegistry(): Map<string, LoadedLanguagePack> {
  const registry = new Map<string, LoadedLanguagePack>();

  for (const [manifestPath, manifestMod] of Object.entries(manifestModules)) {
    const packId = extractPackId(manifestPath);
    if (!packId) continue;

    const manifest = manifestMod.default;
    // Only register packs that have been reviewed by a fluent signer of that language
    if (!manifest?.reviewedByFluentSigner) {
      continue;
    }

    const thresholds = thresholdModules[`./${packId}/thresholds.json`]?.default;
    const reference = referenceModules[`./${packId}/reference.json`]?.default;
    const feedback = feedbackModules[`./${packId}/feedback.json`]?.default;
    const curriculum = curriculumModules[`./${packId}/curriculum.json`]?.default;
    const evaluatorConfig =
      evalConfigModules[`./${packId}/evaluator-config.json`]?.default ??
      (defaultEvaluatorConfigJson as EvaluatorConfig);

    if (!thresholds || !reference || !feedback || !curriculum) {
      continue;
    }

    registry.set(packId, {
      manifest,
      thresholds,
      reference,
      feedback,
      curriculum,
      evaluatorConfig,
    });
  }

  return registry;
}

const PACK_REGISTRY = buildRegistry();

export function listAvailableLanguagePacks(): LanguagePackManifest[] {
  return Array.from(PACK_REGISTRY.values()).map((p) => p.manifest);
}

export function getLanguagePack(packId: string): LoadedLanguagePack {
  const pack = PACK_REGISTRY.get(packId);
  if (!pack) {
    const first = PACK_REGISTRY.values().next().value;
    if (!first) {
      throw new Error('No valid signer-reviewed language packs found in /src/packs/.');
    }
    return first;
  }
  return pack;
}

export function toSignPackBundle(pack: LoadedLanguagePack): SignPackBundle {
  return {
    thresholds: pack.thresholds,
    config: pack.evaluatorConfig,
  };
}
