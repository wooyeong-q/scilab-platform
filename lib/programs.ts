export type Program = {
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
  viewCount?: number;
  launchCount?: number;
  likeCount?: number;
  worksheetUrl?: string;
  pptUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  guideUrl?: string;
};

export const programs: Program[] = [
  {
    id: 'mineral', title: '광물의 특성 실험실',
    summary: '광물의 굳기, 조흔색, 자성, 염산 반응을 탐구하는 가상 실험',
    description: '자석, 조흔판, 못, 염산을 사용해 여러 광물의 성질을 직접 비교하며 광물의 특성을 탐구합니다.',
    category: '지질', grade: '중학교 1~2학년', tags: ['광물','굳기','조흔색','염산 반응'], icon: '💎',
    url: 'https://rhkdanflab.vercel.app', author: '주인님', featured: true, duration: '20~30분', format: '가상 실험', viewCount: 0, launchCount: 0, likeCount: 0
  },
  {
    id: 'igneous', title: '화성암 가상실험실', summary: '마그마의 냉각 속도에 따른 결정 크기와 화성암 생성 과정을 탐구',
    description: '마그마의 냉각 속도를 조절하고 생성되는 결정의 크기를 비교하며 화성암의 생성 원리를 학습합니다.',
    category: '지질', grade: '중학교', tags: ['화성암','냉각 속도','결정 크기'], icon: '🌋',
    url: 'https://ghktjddka.vercel.app', author: '주인님', featured: true, duration: '20분', format: '시뮬레이션', viewCount: 0, launchCount: 0, likeCount: 0
  },
  {
    id: 'earth-system-basic', title: '지구계 구성 요소 분류', summary: '기권·지권·수권·생물권·외권의 구성 요소를 분류하는 학습 활동',
    description: '다양한 자연 현상과 대상을 지구계의 각 구성 요소로 분류하며 지구계의 구조를 이해합니다.',
    category: '지질', grade: '중학교', tags: ['지구계','기권','지권','수권','생물권'], icon: '🌍',
    url: 'https://wlrnr-pqnsfb.vercel.app', author: '주인님', duration: '15분', format: '분류 활동', viewCount: 0, launchCount: 0, likeCount: 0
  },
  {
    id: 'earth-system-ai', title: '지구계 탐구 학습 프로그램', summary: '지구계 구성 요소와 상호작용을 탐구하고 AI 피드백을 받는 프로그램',
    description: '지구계 구성 요소를 분류하고 상호작용 사례를 탐구한 뒤 AI의 피드백을 받아 학습 내용을 정리합니다.',
    category: '지질', grade: '중학교', tags: ['지구계','상호작용','AI 피드백'], icon: '🌐',
    url: 'https://wlrnr-pqnsfb-ggfy.vercel.app', author: '주인님', featured: true, duration: '30~40분', format: 'AI 탐구', viewCount: 0, launchCount: 0, likeCount: 0
  },
  {
    id: 'gas-learning-app', title: 'Google Apps Script 학습 프로그램', summary: 'Google Apps Script로 제작한 웹 기반 학습 프로그램',
    description: 'Google Apps Script 환경에서 실행되는 웹 기반 학습 프로그램입니다.',
    category: '기타', grade: '중학교', tags: ['Google Apps Script','웹 학습'], icon: '🧩',
    url: 'https://script.google.com/macros/s/AKfycbz3bEb7C8VB2Fxp739bCRzLQ51s2I2ElQJDIdilzwRDIfe1ypnkQzUOZH37l6I4OJi9/exec',
    author: '주인님', duration: '수업에 따라', format: '웹 프로그램', viewCount: 0, launchCount: 0, likeCount: 0
  }
];