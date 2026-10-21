import type { Program } from '@/lib/programs';

// Captured from the running programs. IDs remain stable when administrators rename entries.
const SCREENSHOTS: Readonly<Record<string, string>> = {
  'star-escape': '/program-previews/star-escape.webp',
  'milky-way-objects': '/program-previews/milky-way-objects.webp',
  'galaxy-voyage': '/program-previews/galaxy-voyage.webp',
  'mineral': '/program-previews/mineral.webp',
  'igneous': '/program-previews/igneous.webp',
  'earth-system-ai': '/program-previews/earth-system-ai.webp',
  'gas-learning-app': '/program-previews/gas-learning-app.webp',
  'quiz-rally': '/program-previews/quiz-rally.webp',
  'matter-zoom': '/program-previews/matter-zoom.webp',
};

export function getProgramPreviewUrl(program: Pick<Program, 'id' | 'thumbnailUrl'>): string | undefined {
  return program.thumbnailUrl || SCREENSHOTS[program.id];
}

export function ProgramPreview({ program }: { program: Pick<Program, 'id' | 'title' | 'thumbnailUrl' | 'icon'> }) {
  const src = getProgramPreviewUrl(program);
  return src
    ? <img className="programPreviewImage" src={src} alt={program.title + ' 실행 화면'} loading="lazy" decoding="async"/>
    : <span className="catalogCardIcon" aria-hidden="true">{program.icon || '🧪'}</span>;
}
