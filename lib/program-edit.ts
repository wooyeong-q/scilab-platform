import type { Program } from './programs';

const editable = [
  'url', 'summary', 'description', 'category', 'grade', 'tags', 'icon', 'featured',
  'duration', 'format', 'worksheetUrl', 'pptUrl', 'videoUrl', 'sourceUrl', 'guideUrl',
  'assets', 'usageSteps',
] as const;

// The API requires a title and preserves omitted fields. Do not resend unchanged
// descriptions, attachment lists, preview data, counters or other read-only data.
export function programEditPatch(original: Program | undefined, edited: Program) {
  const patch: Record<string, unknown> = { title: edited.title };
  for (const key of editable) {
    if (edited[key] !== undefined && JSON.stringify(original?.[key]) !== JSON.stringify(edited[key])) patch[key] = edited[key];
  }
  return original?.title === edited.title && Object.keys(patch).length === 1 ? null : patch;
}
