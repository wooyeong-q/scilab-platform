import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache';
import { getPrograms as readPrograms, getProgram as readProgram } from './db';

// Admin writes invalidate this cache immediately. A longer TTL lets Neon
// suspend between ordinary catalog visits; classroom state stays live.
const options = { revalidate: 3600, tags: ['programs'] };
export const getPrograms = unstable_cache(readPrograms, ['public-programs-v4'], options);
export const getProgram = unstable_cache(readProgram, ['public-program-v4'], options);

export function revalidatePrograms() {
  revalidateTag('programs');
  revalidatePath('/');
  revalidatePath('/programs/[id]', 'page');
  revalidatePath('/run/[id]', 'page');
}
