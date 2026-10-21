# 마지막 방송 · 외부 음원 출처

게임은 외부 CC0 음원을 내려받아 자체 호스팅합니다. 게임 실행 중 원본 사이트에 접속하거나 새 소리를 합성하지 않습니다.

| 제작자 · 음원 | 적용 장면 | 원본 페이지 |
| --- | --- | --- |
| Kenney · RPG Audio | 버튼, 걸쇠, 문, 종이, 발소리, 삐걱거림 | https://kenney.nl/assets/rpg-audio |
| qubodup · Ghost breath | 교실 등장 | https://opengameart.org/content/ghost-breath |
| qubodup · Ghost Monster Voice Moaning & Growling | 도서관: take 02 / 현관: take 04 / 엔딩: take 05 | https://opengameart.org/content/ghost-monster-voice-moaning-growling |
| xhunterko · Static | 도입 방송, 방송실 등장과 모니터 | https://opengameart.org/content/static |
| PWL · Bell dings/chimes | 목표 알림, 엔딩 종소리 | https://opengameart.org/content/bell-dingschimes |
| congusbongus · Lost in a bad place (horror ambience loop) | 탐색 중 지속되는 어두운 현악 패드 배경음 | https://opengameart.org/content/lost-in-a-bad-place-horror-ambience-loop |

라이선스: CC0 1.0 https://creativecommons.org/publicdomain/zero/1.0/ . 새 음원 페이지의 라이선스는 2026-10-21에 확인했습니다. 이전 음원의 기록은 AUDIO-SOURCES.json에 있습니다.

## 재생과 음량

새 진행은 소리 켜짐이 기본이며 시작 버튼을 누를 때 오디오를 활성화합니다. 저장된 음소거 설정은 유지합니다. 배경음은 소리가 켜진 탐색 중 한 번만 반복되며 방 이동이나 기록 확인으로 재시작하지 않습니다. 첫 화면, 수업 준비, 개별 문제 미리보기, 엔딩, 탭 숨김, 음소거에서는 정지합니다. 공포 연출 줄이기를 켜면 공포 배경음도 꺼집니다.

배경음은 원본 134.72초 루프를 유지해 -18 LUFS / -3 dBTP 목표로 정규화하고 mono 44.1 kHz 64 kbps MP3로 변환했습니다. 재생 게인은 0.52, 마스터는 0.9입니다. 새 등장음은 각각 다른 원본 take를 사용하며 -19 LUFS(엔딩 -21), -3 dBTP 목표와 짧은 앞뒤 페이드, 96 kbps MP3를 적용했습니다. 장면별 게인과 합산 피크 압축도 적용합니다. 원본·출력 해시와 변환 필터는 AUDIO-SOURCES.json에 기록했습니다.

설정의 교실·도서관·방송실·현관·엔딩 등장음 버튼으로 각 음원을 확인할 수 있습니다. 비교 버튼을 다시 누르면 이전 소리를 정지해 겹치지 않게 합니다. 북소리처럼 들리던 공통 타격음은 사용하지 않습니다.

현재 재생 목록은 14개입니다. 내려받은 오디오의 디코딩 결과를 재사용하므로 반복 재생마다 다운로드하지 않습니다. 상자 추락·모니터·소등은 기존 환경 사건 음원을 유지합니다.
