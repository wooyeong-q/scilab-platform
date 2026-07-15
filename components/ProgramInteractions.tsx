'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, Heart, Play } from 'lucide-react';

export function ProgramInteractions({ id, url, initialViews=0, initialLaunches=0, initialLikes=0 }:{ id:string; url:string; initialViews?:number; initialLaunches?:number; initialLikes?:number }){
  const [stats,setStats]=useState({viewCount:initialViews,launchCount:initialLaunches,likeCount:initialLikes});
  const [liked,setLiked]=useState(false);
  const [busy,setBusy]=useState(false);

  async function send(action:'view'|'launch'|'like'|'unlike'){
    const response=await fetch(`/api/programs/${id}/interactions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
    if(!response.ok) throw new Error('요청을 처리하지 못했습니다.');
    const next=await response.json();
    setStats(next);
    return next;
  }

  useEffect(()=>{
    const likeKey=`scilab-liked-${id}`;
    setLiked(localStorage.getItem(likeKey)==='1');
    const viewKey=`scilab-viewed-${id}`;
    if(sessionStorage.getItem(viewKey)!=='1'){
      sessionStorage.setItem(viewKey,'1');
      send('view').catch(()=>sessionStorage.removeItem(viewKey));
    }
  },[id]);

  async function toggleLike(){
    if(busy)return;
    setBusy(true);
    const likeKey=`scilab-liked-${id}`;
    try{
      if(liked){
        await send('unlike');
        localStorage.removeItem(likeKey);
        setLiked(false);
      }else{
        await send('like');
        localStorage.setItem(likeKey,'1');
        setLiked(true);
      }
    }finally{
      setBusy(false);
    }
  }

  async function launch(){
    window.open(url,'_blank','noopener,noreferrer');
    await send('launch').catch(()=>undefined);
  }

  return <div className="interactionPanel">
    <div className="interactionStats">
      <span><Eye size={17}/> 조회 {stats.viewCount.toLocaleString()}</span>
      <span><Play size={17}/> 실행 {stats.launchCount.toLocaleString()}</span>
      <span><Heart size={17}/> 추천 {stats.likeCount.toLocaleString()}</span>
    </div>
    <div className="interactionActions">
      <button type="button" className={liked?'likeButton liked':'likeButton'} onClick={toggleLike} disabled={busy}><Heart size={18} fill={liked?'currentColor':'none'}/>{busy?'처리 중':liked?'추천 취소':'추천하기'}</button>
      <button type="button" className="launchButton" onClick={launch}>프로그램 실행 <ArrowUpRight size={18}/></button>
    </div>
  </div>;
}