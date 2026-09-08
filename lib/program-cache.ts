import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache';
import { getPrograms as readPrograms, getProgram as readProgram } from './db';

// Cache only the public catalog. Admin data and classroom state stay live.
const options = { revalidate: 60, tags: ['programs'] };
export const getPrograms = unstable_cache(readPrograms, ['public-programs-v1'], options);
export const getProgram = unstable_cache(readProgram, ['public-program-v1'], options);

export function revalidatePrograms() {
  revalidateTag('programs');
  revalidatePath('/');
  revalidatePath('/programs/[id]', 'page');
  revalidatePath('/run/[id]', 'page');
}
