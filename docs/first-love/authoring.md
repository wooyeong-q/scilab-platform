# 수업 자료 자산

- `public/labs/first-love/first-love-template.xlsx`: `toSheets(SAMPLE)`의 완전한 시연 자료. 설정·퍼즐·자료·대상·모둠단서·장치 6개 시트. 고정 ID·담당·장소·형식·이야기 제목·장치 값은 회색, 교과 입력란은 연노랑이다.
- `public/labs/first-love/authoring-prompt.txt`: 실제 교과 자료로 P1~P8을 교체하는 AI 작성 프롬프트.
- `public/labs/first-love/guide.html`: 교사 준비, 학생 참여, 양식 규칙, 독립 미리보기, 엔딩과 오답 집계 안내.

기본 엔딩 경계는 `positiveMax: 10`, `neutralMax: 29`다. 0~10회는 미소, 11~29회(20회 포함)는 당황, 30회 이상은 극혐 표정으로 설명한다.

## 생성·확인

엑셀은 Codex primary runtime의 `@oai/artifact-tool`로 작성하고 재계산·셀 검사·오류값 검사 후 내보냈다. 여섯 시트의 대표 범위를 PNG로 렌더해 글자 잘림, 고정/입력 색 구분, 헤더와 행 높이를 확인했다. `.xlsx` 안에는 계산 수식이나 매크로를 넣지 않았다.

배포용 `.xlsx`를 `lib/first-love/import.mjs`의 `importWorkbook`으로 다시 읽었으며, 반환된 lesson은 현재 SAMPLE과 정확히 일치했다. 경고 없음. 퍼즐 8개, 자료 44개, 대상 20개, 자리별 단서 32개를 확인했다. P9~P10은 시연 문제 행에 추가하지 않았다.

네이티브 Excel·한셀에서 직접 열어 보는 검증은 별도로 수행하지 않았다.
