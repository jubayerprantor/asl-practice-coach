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

  it('lesson 2 contains curved and loop signs with human-authored descriptions', () => {
    const lesson2 = curriculum.lessons[1];
    expect(lesson2.id).toBe('lesson-2');
    expect(lesson2.signs).toEqual(['C', 'O', 'D', 'F']);

    for (const sign of lesson2.signs) {
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

  it('lesson 3 contains spacing and parallel extension signs with human-authored descriptions', () => {
    const lesson3 = curriculum.lessons[2];
    expect(lesson3.id).toBe('lesson-3');
    expect(lesson3.signs).toEqual(['U', 'I', 'W', 'S']);

    for (const sign of lesson3.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lesson 4 contains crossed, hooked and knuckle shapes with human-authored descriptions', () => {
    const lesson4 = curriculum.lessons[3];
    expect(lesson4.id).toBe('lesson-4');
    expect(lesson4.signs).toEqual(['R', 'K', 'X', 'E']);

    for (const sign of lesson4.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lesson 5 contains directional and orientation signs with human-authored descriptions', () => {
    const lesson5 = curriculum.lessons[4];
    expect(lesson5.id).toBe('lesson-5');
    expect(lesson5.signs).toEqual(['G', 'H', 'P', 'Q']);

    for (const sign of lesson5.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lesson 6 contains tucked thumb fist signs with human-authored descriptions', () => {
    const lesson6 = curriculum.lessons[5];
    expect(lesson6.id).toBe('lesson-6');
    expect(lesson6.signs).toEqual(['T', 'N', 'M']);

    for (const sign of lesson6.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lesson 7 contains numbers 1 to 5 with human-authored descriptions', () => {
    const lesson7 = curriculum.lessons[6];
    expect(lesson7.id).toBe('lesson-7');
    expect(lesson7.signs).toEqual(['1', '2', '3', '4', '5']);

    for (const sign of lesson7.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('lesson 8 contains numbers 6 to 9 and 0 with human-authored descriptions', () => {
    const lesson8 = curriculum.lessons[7];
    expect(lesson8.id).toBe('lesson-8');
    expect(lesson8.signs).toEqual(['6', '7', '8', '9', '0']);

    for (const sign of lesson8.signs) {
      const entry = reference.signs[sign];
      expect(entry, `Reference for sign ${sign} must exist`).toBeDefined();
      expect(entry.authoredByHuman).toBe(true);
      expect(entry.summary.length).toBeGreaterThan(15);
      expect(entry.orientationNote.length).toBeGreaterThan(10);
      expect(entry.canonicalLandmarks).toHaveLength(21);

      const threshold = thresholds.signs[sign];
      expect(threshold, `Thresholds for sign ${sign} must exist`).toBeDefined();
      expect(threshold.status).toBe('provisional');
      expect(threshold.conditions.length).toBeGreaterThanOrEqual(4);
    }
  });
});
