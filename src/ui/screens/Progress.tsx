import { useEffect, useMemo, useRef, useState } from 'react';
import { tokens } from '../tokens';
import { ProgressSummary } from '../components/ProgressSummary';
import { PracticeAgainList, type PracticeAgainItem } from '../components/PracticeAgainList';
import { SignList, type SignListItem } from '../components/SignList';
import { Dialog } from '../components/Dialog';
import {
  clearAllPracticeData,
  getAllPracticeAttempts,
  type PracticeAttemptRecord,
} from '../../storage/db';
import type { CurriculumPackFile } from '../../packs/schema';

interface ProgressScreenProps {
  curriculumPack: CurriculumPackFile;
  onStartLearn: () => void;
  onPracticeSign: (sign: string) => void;
  isTouch?: boolean;
}

export function ProgressScreen({
  curriculumPack,
  onStartLearn,
  onPracticeSign,
  isTouch = false,
}: ProgressScreenProps) {
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  const loadData = async () => {
    try {
      const records = await getAllPracticeAttempts();
      setAttempts(records);
    } catch (err) {
      console.warn('Failed to load practice attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteData = async () => {
    try {
      await clearAllPracticeData();
      setAttempts([]);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to clear data:', err);
    }
  };

  // Metric 1: Unique signs practiced
  const signsPracticedCount = useMemo(() => {
    return new Set(attempts.map((a) => a.sign)).size;
  }, [attempts]);

  // Metric 2: Overall accuracy
  const overallAccuracyPercent = useMemo(() => {
    if (attempts.length === 0) return 0;
    const successCount = attempts.filter((a) => a.success).length;
    return Math.round((successCount / attempts.length) * 100);
  }, [attempts]);

  // Metric 3: Session count
  const sessionCount = useMemo(() => {
    if (attempts.length === 0) return 0;
    const dates = new Set(attempts.map((a) => a.completedAt.slice(0, 10)));
    return dates.size;
  }, [attempts]);

  // Practice again: up to 3 signs with repeated mistakes
  const practiceAgainSigns: PracticeAgainItem[] = useMemo(() => {
    const signsMap: Record<
      string,
      { count: number; fingerCounts: Record<string, number> }
    > = {};

    attempts.forEach((att) => {
      if (!signsMap[att.sign]) {
        signsMap[att.sign] = { count: 0, fingerCounts: {} };
      }
      if (att.mostCommonFailingFinger) {
        signsMap[att.sign].count += 1;
        const f = att.mostCommonFailingFinger;
        signsMap[att.sign].fingerCounts[f] =
          (signsMap[att.sign].fingerCounts[f] ?? 0) + 1;
      }
    });

    return Object.entries(signsMap)
      .filter(([, data]) => data.count > 0)
      .map(([sign, data]) => {
        let topFinger = 'finger';
        let topCount = 0;
        for (const [f, c] of Object.entries(data.fingerCounts)) {
          if (c > topCount) {
            topCount = c;
            topFinger = f;
          }
        }
        const fingerLabel = topFinger === 'pinky' ? 'Little' : topFinger;
        return {
          sign,
          failingFingerText: `${fingerLabel} finger needs adjustment`,
          count: data.count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ sign, failingFingerText }) => ({ sign, failingFingerText }));
  }, [attempts]);

  // All signs ordered by curriculum
  const allOrderedSigns = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    curriculumPack.lessons.forEach((lesson) => {
      lesson.signs.forEach((s) => {
        if (!seen.has(s)) {
          seen.add(s);
          ordered.push(s);
        }
      });
    });
    return ordered;
  }, [curriculumPack]);

  const statsBySign = useMemo(() => {
    const map: Record<string, { attempts: number; success: number }> = {};
    attempts.forEach((a) => {
      if (!map[a.sign]) {
        map[a.sign] = { attempts: 0, success: 0 };
      }
      map[a.sign].attempts += 1;
      if (a.success) {
        map[a.sign].success += 1;
      }
    });
    return map;
  }, [attempts]);

  const signListItems: SignListItem[] = useMemo(() => {
    return allOrderedSigns.map((sign) => {
      const stat = statsBySign[sign];
      const practiced = Boolean(stat && stat.attempts > 0);
      const accuracyText =
        practiced && stat.attempts > 0
          ? `${Math.round((stat.success / stat.attempts) * 100)}%`
          : '—';
      const attemptsText = practiced
        ? `${stat.attempts} ${stat.attempts === 1 ? 'attempt' : 'attempts'}`
        : 'Not practiced';

      return {
        sign,
        accuracyText,
        attemptsText,
        practiced,
      };
    });
  }, [allOrderedSigns, statsBySign]);

  if (loading) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: tokens.shape.maxWidthProgress,
        margin: '20px auto 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Label & Honest Disclaimer (Section 10) */}
      <div>
        <div
          style={{
            ...tokens.typography.sectionLabel,
            color: tokens.colors.mutedText,
            marginBottom: '6px',
          }}
        >
          PROGRESS
        </div>
        <div
          style={{
            ...tokens.typography.smallMeta,
            color: tokens.colors.mutedText,
          }}
        >
          These scores measure performance against the app's checks, not ASL fluency.
        </div>
      </div>

      {attempts.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.shape.radiusCard,
            border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
            padding: '48px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: tokens.colors.ink,
            }}
          >
            No practice yet
          </div>
          <p
            style={{
              ...tokens.typography.body,
              color: tokens.colors.mutedText,
              margin: 0,
            }}
          >
            Start your first lesson to begin practicing handshapes.
          </p>
          <button
            type="button"
            onClick={onStartLearn}
            className="btn-primary"
            style={{
              height: isTouch ? tokens.shape.mobileTouchTarget : '42px',
              padding: '0 24px',
              borderRadius: tokens.shape.radiusButton,
              fontWeight: 600,
              fontSize: '15px',
              marginTop: '8px',
            }}
          >
            Start Learn mode
          </button>
        </div>
      ) : (
        <>
          {/* Summary Row of Three Plain Figures */}
          <ProgressSummary
            signsPracticed={signsPracticedCount}
            practiceAccuracyPercent={overallAccuracyPercent}
            sessions={sessionCount}
          />

          {/* Practice Again Card */}
          <PracticeAgainList
            items={practiceAgainSigns}
            onPractice={onPracticeSign}
            isTouch={isTouch}
          />

          {/* All Signs List Card */}
          <SignList
            signs={signListItems}
            onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
            deleteButtonRef={deleteBtnRef}
            isTouch={isTouch}
          />

          {/* Section 18: Delete Data Dialog */}
          <Dialog
            open={deleteDialogOpen}
            title="Delete your progress?"
            body="This removes all progress stored on this device. This can’t be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDeleteData}
            onCancel={() => setDeleteDialogOpen(false)}
            triggerRef={deleteBtnRef}
          />
        </>
      )}
    </div>
  );
}
