import atomExplorer from '../public/labs/atom-explorer/program.json';
import type { ProgramAsset } from './program-assets';

export type Program = {
  assets?: ProgramAsset[];
  id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  grade: string;
  tags: string[];
  icon: string;
  url: string;
  author: string;
  featured?: boolean;
  duration?: string;
  format?: string;
  standard?: string;
  thumbnailUrl?: string;
  worksheetUrl?: string;
  pptUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  guideUrl?: string;
  viewCount?: number;
  launchCount?: number;
  likeCount?: number;
};

export const programs: Program[] = [atomExplorer];
