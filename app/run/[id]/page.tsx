import { notFound } from 'next/navigation';
import { ResponsiveProgramRunner } from '@/components/ResponsiveProgramRunner';
import { getProgram } from '@/lib/db';

export const dynamic='force-dynamic';

export default async function RunPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const program=await getProgram(id);
  if(!program)notFound();
  return <ResponsiveProgramRunner title={program.title} url={program.url} programId={id}/>;
}
