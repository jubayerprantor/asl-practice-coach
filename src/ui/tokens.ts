/**
 * Design Tokens for ASL Practice Coach
 * Follows exact design guideline specification.
 * Never hardcode colors or sizes in components; reference these tokens or CSS variables.
 */

export const tokens = {
  colors: {
    // Ground and surface
    ground: '#F6F6F3',
    surface: '#FFFFFF',
    cameraSurface: '#181B1E',

    // Borders and dividers
    border: '#E3E3DE',
    borderStrong: '#DADAD4',
    rowDivider: '#EFEFEB',

    // Ink and text
    ink: '#16181A',
    mutedText: '#5C6166',
    secondaryBody: '#3E4348',

    // Tab track and neutral chips
    tabTrack: '#ECECE8',
    chipNeutral: '#F1F1ED',
    lockedOutline: '#BDBFBA',

    // Overlay colors (on camera only)
    overlayPassing: '#5EE0C0',
    overlayNeedsAttention: '#FFB020',
    overlayNeutral: '#8A9096',

    // Hint card (needs attention)
    hintCardFill: '#FFF4DC',
    hintCardBorder: '#E8C77A',

    // Neutral status card (can't check yet)
    statusCardFill: '#F1F1ED',
    statusCardBorder: '#DADAD4',
  },

  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    wordmark: {
      fontSize: '17px',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    sectionLabel: {
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: '#5C6166',
    },
    targetLetter: {
      fontSize: '88px',
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1,
    },
    hintText: {
      fontSize: '16px',
      fontWeight: 500,
      lineHeight: 1.45,
    },
    body: {
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    statusText: {
      fontSize: '14px',
      fontWeight: 500,
    },
    smallMeta: {
      fontSize: '13px',
      fontWeight: 400,
    },
    fingerName: {
      fontSize: '15px',
      fontWeight: 600,
    },
  },

  shape: {
    radiusPanel: '20px',
    radiusCard: '16px',
    radiusCardInner: '14px',
    radiusButton: '10px',
    radiusControl: '8px',
    radiusChip: '8px',
    radiusTabTrack: '20px',
    radiusTabInner: '16px',
    radiusPill: '999px',
    borderWidth: '1px',
    headerHeight: '72px',
    sidePanelWidth: '400px',
    buttonHeight: '36px',
    chipHeight: '32px',
    holdDotSize: '26px',
    fingerRowHeight: '44px',
    holdMeterHeight: '8px',
  },

  spacing: {
    pagePadding: '40px',
    gridGap: '24px',
    panelPadding: '28px',
    panelSectionGap: '22px',
  },
} as const;

export type DesignTokens = typeof tokens;
