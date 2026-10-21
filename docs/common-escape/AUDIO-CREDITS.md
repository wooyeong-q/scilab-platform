# 마지막 방송 · 외부 효과음 출처

게임에서 사용하는 음원은 아래의 외부 자료를 내려받아 적용했습니다. 각 원본 페이지의 CC0 표시를 2026-10-20에 확인했습니다. 직접 소리를 합성하지 않습니다.

| 제작자 · 음원 | 적용 장면 | 원본 페이지 |
| --- | --- | --- |
| Kenney · RPG Audio | 버튼, 문 걸쇠, 문 열기, 문소리, 종이 넘기기, 발소리, 삐걱거림 | https://kenney.nl/assets/rpg-audio |
| qubodup · Ghost breath | 교실·도서관·현관의 짧은 등장, 엔딩 실루엣 | https://opengameart.org/content/ghost-breath |
| xhunterko · Static | 도입 방송과 방송실 모니터 | https://opengameart.org/content/static |
| PWL · Bell dings/chimes | 목표 알림과 엔딩 종소리 | https://opengameart.org/content/bell-dingschimes |
| congusbongus · A lurking evil (horror ambience) | 탐색 중 심장박동·피아노 배경음, CC0 | https://opengameart.org/content/a-lurking-evil-horror-ambience |

라이선스: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

파일은 `public/labs/common-escape/assets/audio/`에 있습니다. 원본 파형을 MP3로 변환하고, 음량·앞뒤 무음·짧은 페이드를 조정했습니다. 방송 잡음은 2.3초 부분을 사용했습니다. 배경음은 -19 LUFS, 숨소리는 -17 LUFS를 목표로 정규화하고 원본의 짧은 앞뒤 페이드를 조정했습니다. 두 파일 모두 -2.5 dBTP 상한을 설정했습니다. 재생 시에는 별도 장면별 음량, 0.9 마스터 게인 및 합산 피크 압축을 적용합니다. 상세 원본 대응·FFmpeg 필터·파일 해시는 `AUDIO-SOURCES.json`에 기록했습니다.

배경음은 소리가 켜진 탐색 중에만 한 번 반복 재생합니다. 첫 화면·수업 준비·엔딩 진입·탭 숨김·음소거에서는 중지합니다. 교실과 현관은 숨소리, 도서관은 삐걱거림과 숨소리, 방송실은 짧은 잡음을 사용합니다. 엔딩은 종소리 뒤에 빈 창문을 먼저 보여 주고, 4.8초 후 실루엣이 나타날 때 숨소리를 재생합니다. 설정의 ‘소리 확인’은 교실과 같은 숨소리를 재생합니다.

북소리처럼 들린 공통 등장음 Jingle_Lose_00과 등장 순간의 문 닫힘 타격음은 제거했습니다. 해당 Jingle 파일은 재생 목록·독립 HTML 내장 자산·현재 출처 목록에서도 제외했습니다.

추가 환경 사건은 기존 CC0 음원만 사용합니다. 상자 추락은 삐걱거림 뒤 문소리의 충격과 종이 소리를 짧게 이어 쓰며, 모니터 켜짐은 스위치와 잡음, 현관 소등은 스위치 소리에 연결합니다. 실제 상자 녹음으로 표기하지 않으며 새 합성 음원이나 공통 귀신 타격음을 추가하지 않았습니다. 현재 내장 음원은 11개입니다.
