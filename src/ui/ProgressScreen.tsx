import { useEffect, useMemo, useState } from 'react';
import { tokens } from './tokens';
import { CheckCircleIcon, DashCircleIcon, TrashIcon } from './icons';
import {
  clearAllPracticeData,
  getAllPracticeAttempts,
  type PracticeAttemptRecord,
} from '../storage/db';
import type { CurriculumPackFile } from '../packs/schema';

interface ProgressScreenProps {
  curriculumPack: CurriculumPackFile;
  onStartLearn: () => void;
  onPracticeSign: (sign: string) => void;
}

interface SignMistakeSummary {
  sign: string;
  mistakeCount: number;
  failingFingerText: string;
}

export function ProgressScreen({
  curriculumPack,
  onStartLearn,
  onPracticeSign,
}: ProgressScreenProps) {
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

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
      setConfirmDeleteOpen(false);
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

  // Metric 3: Session count (grouped by day or session gap)
  const sessionCount = useMemo(() => {
    if (attempts.length === 0) return 0;
    const dates = new Set(attempts.map((a) => a.completedAt.slice(0, 10)));
    return dates.size;
  }, [attempts]);

  // Practice again: up to 3 signs with the most repeated mistakes
  const practiceAgainSigns: SignMistakeSummary[] = useMemo(() => {
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

    const list: SignMistakeSummary[] = Object.entries(signsMap)
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
          mistakeCount: data.count,
          failingFingerText: `${fingerLabel} finger needs adjustment`,
        };
      })
      .sort((a, b) => b.mistakeCount - a.mistakeCount)
      .slice(0, 3);

    return list;
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
      {/* Top Header Label & Honest Disclaimer */}
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
          These scores measure performance against the app's checks, not ASL
          fluency.
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
            style={{
              height: '42px',
              padding: '0 24px',
              borderRadius: tokens.shape.radiusButton,
              backgroundColor: tokens.colors.ink,
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Start Learn mode
          </button>
        </div>
      ) : (
        <>
          {/* Summary Row of Three Plain Figures */}
          <div
            style={{
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.shape.radiusCard,
              border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
              padding: '24px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  ...tokens.typography.figureLarge,
                  color: tokens.colors.ink,
                }}
              >
                {signsPracticedCount}
              </div>
              <div
                style={{
                  ...tokens.typography.smallMeta,
                  color: tokens.colors.mutedText,
                  marginTop: '4px',
                }}
              >
                signs practiced
              </div>
            </div>

            <div>
              <div
                style={{
                  ...tokens.typography.figureLarge,
                  color: tokens.colors.ink,
                }}
              >
                {overallAccuracyPercent}%
              </div>
              <div
                style={{
                  ...tokens.typography.smallMeta,
                  color: tokens.colors.mutedText,
                  marginTop: '4px',
                }}
              >
                practice accuracy
              </div>
            </div>

            <div>
              <div
                style={{
                  ...tokens.typography.figureLarge,
                  color: tokens.colors.ink,
                }}
              >
                {sessionCount}
              </div>
              <div
                style={{
                  ...tokens.typography.smallMeta,
                  color: tokens.colors.mutedText,
                  marginTop: '4px',
                }}
              >
                sessions
              </div>
            </div>
          </div>

          {/* Practice Again Card (up to 3 signs with repeated mistakes) */}
          {practiceAgainSigns.length > 0 && (
            <div
              style={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.shape.radiusCard,
                border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: tokens.colors.ink,
                }}
              >
                Practice again
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {practiceAgainSigns.map((item, idx) => (
                  <div
                    key={item.sign}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom:
                        idx === practiceAgainSigns.length - 1
                          ? 'none'
                          : `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <span
                        style={{
                          ...tokens.typography.letterMedium,
                          color: tokens.colors.ink,
                        }}
                      >
                        {item.sign}
                      </span>
                      <span
                        style={{
                          ...tokens.typography.body,
                          color: tokens.colors.mutedText,
                        }}
                      >
                        {item.failingFingerText}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onPracticeSign(item.sign)}
                      style={{
                        height: tokens.shape.buttonHeight,
                        padding: '0 16px',
                        borderRadius: tokens.shape.radiusControl,
                        border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                        backgroundColor: tokens.colors.surface,
                        color: tokens.colors.ink,
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Practice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Signs List Card */}
          <div
            style={{
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.shape.radiusCard,
              border: `${tokens.shape.borderWidth} solid ${tokens.colors.border}`,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: tokens.colors.ink,
              }}
            >
              All signs
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {allOrderedSigns.map((sign, idx) => {
                const stat = statsBySign[sign];
                const practiced = Boolean(stat && stat.attempts > 0);
                const accuracy =
                  practiced && stat.attempts > 0
                    ? `${Math.round((stat.success / stat.attempts) * 100)}%`
                    : '—';
                const attemptsText = practiced
                  ? `${stat.attempts} ${
                      stat.attempts === 1 ? 'attempt' : 'attempts'
                    }`
                  : 'Not practiced';

                const isLast = idx === allOrderedSigns.length - 1;

                return (
                  <div
                    key={sign}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: isLast
                        ? 'none'
                        : `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: tokens.colors.ink,
                          width: '24px',
                        }}
                      >
                        {sign}
                      </span>
                      <span
                        style={{
                          ...tokens.typography.smallMeta,
                          color: tokens.colors.mutedText,
                        }}
                      >
                        {accuracy}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <span
                        style={{
                          ...tokens.typography.smallMeta,
                          color: tokens.colors.mutedText,
                        }}
                      >
                        {attemptsText}
                      </span>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {practiced ? (
                          <CheckCircleIcon
                            size={18}
                            color={tokens.colors.ink}
                          />
                        ) : (
                          <DashCircleIcon
                            size={18}
                            color={tokens.colors.overlayNeutral}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer: Outlined Delete My Data Button */}
            <div
              style={{
                borderTop: `${tokens.shape.borderWidth} solid ${tokens.colors.rowDivider}`,
                paddingTop: '20px',
                marginTop: '8px',
                display: 'flex',
                justifyContent: 'flex-start',
              }}
            >
              {confirmDeleteOpen ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    backgroundColor: tokens.colors.chipNeutral,
                    padding: '16px',
                    borderRadius: tokens.shape.radiusControl,
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: tokens.colors.ink,
                    }}
                  >
                    Delete all stored practice data? Progress is stored only on
                    this device and cannot be recovered.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleDeleteData}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        borderRadius: tokens.shape.radiusControl,
                        backgroundColor: tokens.colors.ink,
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Yes, delete my data
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        borderRadius: tokens.shape.radiusControl,
                        border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                        backgroundColor: tokens.colors.surface,
                        color: tokens.colors.ink,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  style={{
                    height: tokens.shape.buttonHeight,
                    padding: '0 16px',
                    borderRadius: tokens.shape.radiusControl,
                    border: `${tokens.shape.borderWidth} solid ${tokens.colors.borderStrong}`,
                    backgroundColor: tokens.colors.surface,
                    color: tokens.colors.ink,
                    fontSize: tokens.typography.statusText.fontSize,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <TrashIcon size={16} color={tokens.colors.mutedText} />
                  <span>Delete my data</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
