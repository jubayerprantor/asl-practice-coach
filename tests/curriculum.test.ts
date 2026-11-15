import { describe, expect, it } from 'vitest';
import curriculumJson from '../src/packs/asl/curriculum.json';
import referenceJson from '../src/packs/asl/reference.json';
import thresholdsJson from '../src/packs/asl/thresholds.json';
import type {
  CurriculumPackFile,
  ReferencePackFile,
  ThresholdsPackFile,
} from '../src/packs/schema';

describe('Curriculum & Reference Verification', () => {
  const curriculum = curriculumJson as CurriculumPackFile;
  const reference = referenceJson as ReferencePackFile;
  const thresholds = thresholdsJson as ThresholdsPackFile;

  it('curriculum has valid schema and ordered lessons', () => {
    expect(curriculum.schemaVersion).toBe('1.0.0');
    expect(curriculum.language).toBe('asl');
    expect(curriculum.lessons.length).toBeGreaterThanOrEqual(3);

    for (const lesson of curriculum.lessons) {
      expect(lesson.id).toBeTruthy();
      expect(lesson.title).toBeTruthy();
      expect(lesson.signs.length).toBeGreaterThan(0);
      expect(lesson.requiredSuccessfulHolds).toBeGreaterThanOrEqual(1);
    }
  });

  it('lesson 1 contains distinct anchor signs with human-authored descriptions', () => {
    const lesson1 = curriculum.lessons[0];
    expect(lesson1.id).toBe('lesson-1');
    expect(lesson1.signs).toEqual(['A', 'B', 'L', 'V', 'Y']);

    for (const sign of lesson1.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(5);
    }
  });
});
