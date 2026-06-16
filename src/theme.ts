export const C = {
  bg:           '#F7F7FC',
  surface:      '#FFFFFF',
  surface2:     '#F0F0F8',
  border:       '#E4E4EE',
  text:         '#1C1C2E',
  muted:        '#6B6B84',
  subtle:       '#A0A0B8',
  accent:       '#6366F1',
  accentDark:   '#4F46E5',
  accentLight:  '#EEF2FF',
  green:        '#22C55E', greenLight:  '#F0FDF4',
  amber:        '#F59E0B', amberLight:  '#FFFBEB',
  orange:       '#F97316', orangeLight: '#FFF7ED',
  red:          '#EF4444', redLight:    '#FEF2F2',
} as const;

export const PRI_COLOR: Record<string, string> = {
  low: C.green, medium: C.amber, high: C.orange, critical: C.red,
};
export const PRI_BG: Record<string, string> = {
  low: C.greenLight, medium: C.amberLight, high: C.orangeLight, critical: C.redLight,
};
