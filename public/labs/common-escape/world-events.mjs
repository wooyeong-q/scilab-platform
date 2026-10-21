export const WORLD_EVENTS=[
 {id:'box',flag:'returns',room:'library',focus:.56,duration:2700,cue:'box-fall',text:'천장 점검구에서 작은 상자가 떨어졌다. 바닥에 종이 몇 장이 흩어졌다.'},
 {id:'monitor',flag:'script',room:'broadcast',focus:.5,duration:2300,cue:'monitor-on',text:'손대지 않은 모니터가 켜졌다. 잡음이 걷힌 자리에 네 칸의 기록이 남았다.'},
 {id:'blackout',flag:'order',room:'entrance',focus:.83,duration:2500,cue:'lights-out',text:'현관 조명이 꺼졌다. 비상등 아래로 제어 장치의 점검판이 보인다.'}
];
export const nextWorldEvent=s=>WORLD_EVENTS.find(e=>s.room===e.room&&s.flags.includes(e.flag)&&!s.seen.includes('event:'+e.id));
