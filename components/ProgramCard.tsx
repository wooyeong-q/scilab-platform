'use client';

import Link from 'next/link';
import { ArrowUpRight, Clock3, Eye, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { programSubject, rememberProgram } from '@/lib/program-catalog';
import type { Program } from '@/lib/programs';

const SUBJECT_TONES: Record<string, string> = {
  '지구과학': 'earth', '화학': 'chemistry', '물리': 'physics',
  '생명과학': 'biology', '통합과학': 'general',
};

export function ProgramCard({ program }: { program: Program }) {
  const titleId = 'program-title-' + program.id;
  const tone = SUBJECT_TONES[programSubject(program)] || 'general';
  return <Link className="catalogProgramLink" href={'/programs/' + program.id}
    prefetch={false} onClick={() => rememberProgram(program.id)} aria-labelledby={titleId}>
    <article className={'catalogProgramCard tone-' + tone}>
      <div className="catalogCardVisual">
        {program.thumbnailUrl
          ? <img src={program.thumbnailUrl} alt="" loading="lazy" decoding="async"/>
          : <span className="catalogCardIcon" aria-hidden="true">{program.icon || '🧪'}</span>}
        <span className="catalogVisualLabel">{program.category}</span>
        {program.featured ? <span className="catalogFeatured"><Sparkles size={12} aria-hidden="true"/> 추천</span> : null}
      </div>
      <div className="catalogCardBody">
        <h4 id={titleId}>{program.title}</h4>
        <p className="catalogCardSummary">{program.summary}</p>
        <div className="catalogCardMeta">
          <span><GraduationCap size={14} aria-hidden="true"/>{program.grade}</span>
          {program.duration ? <span><Clock3 size={13} aria-hidden="true"/>{program.duration}</span> : null}
        </div>
        <div className="catalogCardTags">{program.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
      <div className="catalogCardFooter">
        <span className="catalogCardStats">
          <span><Eye size={13} aria-hidden="true"/><span className="catalogSrOnly">조회 </span>{(program.viewCount || 0).toLocaleString('ko-KR')}</span>
          <span><Heart size={13} aria-hidden="true"/><span className="catalogSrOnly">추천 </span>{(program.likeCount || 0).toLocaleString('ko-KR')}</span>
        </span>
        <span className="catalogCardAction">자세히 보기 <ArrowUpRight size={15} aria-hidden="true"/></span>
      </div>
    </article>
  </Link>;
}
