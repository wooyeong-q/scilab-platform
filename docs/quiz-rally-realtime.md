# 도시 재가동 실시간 서버

현재 Vercel·Neon 서비스와 게임 주소를 유지하면서, 새 게임방의 이동·점프·아이템·문제·순위를 Cloudflare Durable Object 한 개에서 처리하는 선택형 백엔드다. 기존 방은 기존 경로로 끝까지 진행한다. 설정만으로 진행 중인 방을 다른 서버로 옮기지 않는다.

## 활성화 상태

코드만 배포하면 기존 방식이 유지된다. **Cloudflare 배포 및 아래 Vercel 환경 변수 설정까지 완료해야 새 실시간 방이 만들어진다.** Worker 연결 전에 활성화 변수를 설정하지 않는다.

| 서비스 | 환경 변수 | 용도 |
| --- | --- | --- |
| Cloudflare Worker | `QUIZ_REALTIME_SECRET` | Vercel과 동일한 무작위 32바이트 이상 비밀값. Wrangler secret으로 입력 |
| Cloudflare Worker | `APP_ORIGIN` | `https://scilab-platform.vercel.app` — WebSocket 허용 출처 및 기록 저장 주소 |
| Vercel Production | `QUIZ_REALTIME_URL` | 배포한 Worker의 HTTPS origin, 경로 없이 입력 |
| Vercel Production | `QUIZ_REALTIME_SECRET` | Worker와 동일한 비밀값. 클라이언트 공개 변수 사용 금지 |
| Vercel Production | `QUIZ_REALTIME_NEW_ROOMS` | `1`일 때만 새 방에 실시간 서버 적용. `0`으로 바꾸어도 기존 실시간 방의 연결은 유지 |

별도 데이터베이스 마이그레이션은 필요 없다. 기존 `state` JSON의 `realtime.generation`이 방의 처리 주체를 고정하고, `checkpoint`가 오래된 저장 요청을 거부한다.

## 배포

1. Cloudflare 계정의 **Workers Free** 요금제를 확인한다. 이 프로젝트를 위해 유료 요금제로 변경하지 않는다.
2. `workers/quiz-rally`에서 `npm ci`, `npm run check`, `npm test`, `npm run build`를 실행한다. 검사는 로컬에서 수행하며 운영 Neon에 부하를 보내지 않는다.
3. 인증된 Wrangler에서 `npx wrangler secret put QUIZ_REALTIME_SECRET`로 비밀값을 입력한 뒤 `npm run deploy`를 실행한다. 비밀값은 저장소, 명령행 인자, 로그, 대화에 남기지 않는다.
4. 배포 주소의 `/health` 응답에서 `protocol: 1`, `storage: "sqlite"`를 확인한다.
5. Vercel Production에 위 환경 변수를 설정하고 배포한다. 처음에는 `QUIZ_REALTIME_NEW_ROOMS=0`으로 두어 연결 준비를 완료한다.
6. 새 방 활성화를 `1`로 바꾸고 교사 1명·학생 2명의 짧은 새 경기로 접속, 이동, 점프, 문제, 아이템, 일시정지, 재접속, 종료를 확인한다. 반복적인 운영 30명 부하검사는 하지 않는다.
7. 종료한 경기의 Neon 체크포인트가 갱신되는지 확인한다. 기록 서버 오류 시 Worker가 1분 단위로 재시도한다.

문제가 생기면 `QUIZ_REALTIME_NEW_ROOMS=0`으로 새 방만 기존 방식으로 만든다. 진행 중인 실시간 방을 유지하려면 URL·비밀값·Worker를 그대로 둔다. 실시간 방은 장애 때 독립된 Neon 판정으로 전환하지 않는다.

## 경기 처리와 저장

- 방마다 하나의 권위 서버가 50ms 간격으로 계산하고, 100ms 간격으로 모든 참가자에게 같은 시각의 위치를 전송한다.
- 내 조작은 브라우저가 즉시 예측하고 서버 확인값으로 보정한다. 상대방과 미사일은 공통 시각의 상태를 보간한다.
- 실시간 방의 학생 입력은 측정한 왕복 시간(최대 500ms)을 사용해 서버 도착 시점을 예측한다. 기존 입력 저널 방식과 교사 관전에는 이 예측 시간을 적용하지 않는다. 늦은 응답은 최신 확인 시각을 되돌릴 수 없다. 일반 위치 보정은 화면에서 초당 14단위로 제한하고 내 카메라는 같은 보정 위치를 따른다. 새 피격·낙하·완주 판정은 서버 값을 즉시 반영한다.
- 문제·아이템·교사 명령도 같은 WebSocket으로 처리한다. HTTP 재시도 역시 같은 방 서버로 전달한다.
- 순위는 모든 클라이언트가 같은 프레임의 서버 순서를 사용한다. 내 예측 위치와 상대의 보간 위치로 따로 순위를 다시 계산하지 않는다.
- 재접속은 먼저 현재 상태를 받은 뒤 미확인 입력을 묶어서 전송한다. 잠깐 전송이 밀려도 연결을 강제로 닫지 않으며, 정상 실시간 접속 중에는 중복 이동 저장과 전체 상태 재전송을 생략한다.
- 이동 확인 버전과 아이템·문제의 전체 상태 버전을 구분해 늦게 도착한 응답이 새 아이템 상태를 가리지 않게 한다. Space 입력이 어려운 키보드는 J 또는 점프 버튼도 사용할 수 있다.
- 미사일·함정의 피해자는 충돌 시각 순서로 한 번만 정한다. 완주와 순위도 서버가 확인한 통과 시각으로 확정한다.
- 연결이 끊긴 조작은 최대 750ms 후 만료한다. 서버 프로세스 재시작 시 마지막 저장 상태로 복구하고 일시정지한다. 교사의 계속하기로 재개한다.
- 이동 계산에는 Neon 요청이 없다. Worker의 SQLite 저장소에 5초 간격 및 주요 명령 직후 저장하고, Neon에는 방 전체를 최대 1분 간격과 종료 시 저장한다.
- 갑작스러운 프로세스 재시작 때 마지막 5초 이내 이동은 되돌아갈 수 있다. 확인 응답을 보낸 문제·아이템·교사 명령은 먼저 Durable Object 저장소에 기록한다.
- 문제 정답·개별 보기 순서·토큰 해시는 서버에만 둔다. 브라우저는 본인 문제의 공개 내용과 공개 순위만 받는다.
- 방은 14일 후 만료되며 Durable Object 저장소도 정리한다. 빈 방이나 종료된 방에서는 경기 계산 타이머를 중단한다.

## 무료 범위

Cloudflare의 SQLite Durable Objects를 Workers Free에서 사용한다. 현재 공식 문서 기준 일일 요청 100,000회, 실행 시간 13,000 GB-s, 저장 5GB 한도가 있다. 수신 WebSocket 메시지는 20개당 요청 1회로 계산한다. 무료 한도를 넘으면 해당 작업이 실패하며 무료 요금제에서 유료 초과 사용으로 자동 전환되지 않는다.

학생 30명이 250ms마다 입력을 보내는 15분 경기의 기본 입력 메시지는 약 108,000개, 환산 요청 약 5,400회다. 키 변경·문제·아이템·재접속은 별도이며 하루 실제 사용 가능 학급 수를 보장하는 계산은 아니다. 기존 Neon·Vercel 요금과 한도는 별도로 유지된다.

공식 문서: [Durable Objects 요금](https://developers.cloudflare.com/durable-objects/platform/pricing/), [WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [수명 주기](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

## 검증 명령

저장소 루트: `node --test tests/quiz-rally-*.test.cjs`

Worker: `cd workers/quiz-rally && npm ci && npm run check && npm test && npm run build`

검사는 이동·에너지·점프·아이템·단일 피해자·완주 순서·질문 정답 보호·재시도 중복 방지·교사 제어·복구·저장 버전 충돌·기존 방 호환성을 포함한다. Worker 검사는 로컬 Miniflare의 실제 WebSocket 31개를 사용하며 운영 Neon·Vercel 호출을 만들지 않는다. 지역 간 지연과 학교 Wi-Fi 품질은 실배포에서 별도 확인해야 한다.

