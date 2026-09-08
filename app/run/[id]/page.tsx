import { notFound } from 'next/navigation';
import { ResponsiveProgramRunner } from '@/components/ResponsiveProgramRunner';
import { getProgram, getPrograms } from '@/lib/program-cache';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getPrograms()).map(({ id }) => ({ id }));
}

export default async function RunPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const program=await getProgram(id);
  if(!program)notFound();
  return <ResponsiveProgramRunner title={program.title} url={program.url} programId={id}/>;
}
