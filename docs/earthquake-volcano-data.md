# 지진·화산 지도 데이터 구조

## 목적

기존 Google Apps Script와 개인 Google Sheet에 저장하던 지진·화산 좌표를 SciLab의 Vercel API와 Neon 데이터베이스로 이전한다. 기존 Apps Script 배포는 새 버전을 검증할 때까지 그대로 유지한다.

## 수업 흐름

1. 교사가 새 수업을 만들면 6자리 수업 코드와 교사용 키가 발급된다.
2. 학생은 수업 코드 또는 `?class=수업코드`가 포함된 링크로 참여한다.
3. 같은 수업 코드로 참여한 기기끼리만 점을 공유한다.
4. 수업은 생성 후 14일 동안 유효하며 한 수업에는 최대 300개의 점을 저장한다.
5. 학생이 만든 점은 해당 기기에 저장된 삭제 키 또는 교사용 키로만 삭제할 수 있다.
6. 전체 점 보기와 수업 점 초기화는 교사용 키가 필요하다.

교사용 키와 점별 삭제 키는 원문이 아닌 SHA-256 해시로 데이터베이스에 저장한다. 교사용 키는 수업 생성 직후 한 번 표시하며 현재 브라우저의 로컬 저장소에도 보관한다.

## API

- `POST /api/labs/earthquake-volcano/sessions`: 수업 생성
- `GET /api/labs/earthquake-volcano/sessions/[code]/points`: 수업과 점 조회
- `POST /api/labs/earthquake-volcano/sessions/[code]/points`: 점 저장
- `DELETE /api/labs/earthquake-volcano/sessions/[code]/points/[id]`: 본인 또는 교사의 점 삭제
- `DELETE /api/labs/earthquake-volcano/sessions/[code]/points`: 교사의 전체 초기화
- `POST /api/labs/earthquake-volcano/sessions/[code]/teacher`: 교사용 키 확인

## 운영 전환

미리보기 배포에서 수업 생성, 두 기기 참여, 점 저장·삭제·초기화와 모바일 화면을 확인한 뒤 `programs.id = 'gas-learning-app'`의 실행 주소를 SciLab 내장 지도 주소로 바꾼다. 전환 전에는 기존 Google Apps Script 주소가 계속 운영된다.
