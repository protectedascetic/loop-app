/**
 * Loop design system — warm editorial palette + typography.
 * Mirrors the web app (app/web.py) so web and mobile feel like one product.
 */
import { Platform, TextStyle } from 'react-native';

export const C = {
  bg:          '#FAF8F3',   // warm paper
  surface:     '#FFFFFF',
  surface2:    '#F3EFE7',
  border:      '#ECE6DA',
  borderStrong:'#E0D8C8',
  text:        '#221E18',   // warm near-black
  muted:       '#6F665A',
  subtle:      '#A89E8E',
  faint:       '#C7BDAC',

  accent:      '#5B57D6',   // indigo — system / signal
  accentDeep:  '#4A46C2',
  accentSoft:  '#ECEBFC',
  accentTint:  '#F5F4FE',

  clay:        '#C26A3C',   // warm — human / momentum
  claySoft:    '#FBEEE4',

  green:  '#4F9D69', greenSoft:  '#EAF5ED',
  amber:  '#C99A2E', amberSoft:  '#FBF3DD',
  orange: '#D2733A', orangeSoft: '#FBEBDF',
  red:    '#C9554E', redSoft:    '#FAE9E7',

  white: '#FFFFFF',
} as const;

/** Editorial serif for headings, briefings and journal text. */
export const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

export const FONT = {
  serif: SERIF as string,
};

/** Soft, warm elevation. */
export function shadow(level: 1 | 2 | 3 = 1) {
  const map = {
    1: { e: 2,  o: 0.05, r: 4,  y: 1 },
    2: { e: 5,  o: 0.08, r: 14, y: 4 },
    3: { e: 10, o: 0.12, r: 24, y: 8 },
  } as const;
  const s = map[level];
  return {
    elevation: s.e,
    shadowColor: '#5a3c1e',
    shadowOpacity: s.o,
    shadowRadius: s.r,
    shadowOffset: { width: 0, height: s.y },
  };
}

export const TYPE_EMOJI: Record<string, string> = {
  task: '✅', waiting: '⏳', decision: '🤔', idea: '💡', concern: '⚠️',
  opportunity: '🚀', observation: '👁', reflection: '🪞', note: '📝',
};

export const TYPE_LABEL: Record<string, string> = {
  task: 'Tasks', waiting: 'Waiting on', decision: 'Decisions', idea: 'Ideas',
  concern: 'Concerns', opportunity: 'Opportunities',
  observation: 'Observations', reflection: 'Reflections', note: 'Notes',
};

export const JOURNAL_TYPES = new Set(['observation', 'reflection', 'note']);
export const TYPE_ORDER = ['concern', 'decision', 'task', 'waiting', 'opportunity', 'idea'];
export const PRI_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const PRI_COLOR: Record<string, string> = {
  low: C.green, medium: C.amber, high: C.orange, critical: C.red,
};

/** Tag (type pill) colors — fg + bg. */
export const TAG_COLOR: Record<string, { fg: string; bg: string }> = {
  task:        { fg: C.accentDeep, bg: C.accentSoft },
  decision:    { fg: '#6D4FBF',    bg: '#EFEAFB' },
  concern:     { fg: C.red,        bg: C.redSoft },
  waiting:     { fg: '#9A7415',    bg: C.amberSoft },
  idea:        { fg: C.green,      bg: C.greenSoft },
  opportunity: { fg: C.clay,       bg: C.claySoft },
  observation: { fg: C.muted,      bg: C.surface2 },
  reflection:  { fg: C.muted,      bg: C.surface2 },
  note:        { fg: C.muted,      bg: C.surface2 },
};

export const serifHeading = (size: number, color = C.text): TextStyle => ({
  fontFamily: FONT.serif, fontSize: size, color, letterSpacing: -0.4,
  ...(Platform.OS === 'android' ? { fontWeight: '600' as const } : {}),
});
