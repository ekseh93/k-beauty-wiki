# 콘텐츠 검수 등록 플로우

이 도구는 콘텐츠 JSON을 AWS나 DynamoDB에 저장하지 않고, 관리자 화면에 입력하기 전 검수 체크리스트만 실행한다.

## 상태별 원칙

- `draft`: 구조와 허용된 상태·유형만 확인한다.
- `review`: 일본어 제목, 한국어 원명, slug, 요약, 본문, 출처, 최종 확인일을 요구한다. 개발용 fixture는 검수 플로우에 사용할 수 없다.
- `published`: 출처 권리, 확인일, 구조화된 상세 필드와 기타 공개 조건을 모두 통과해야 한다.

## 실행

```powershell
pnpm validate:content --file=path/to/content.json
```

성공하면 `ready: true`가 출력된다. 이 결과는 저장 권한이나 공개 승인을 대신하지 않으며, 실제 등록은 Cognito `admin` 그룹 관리자만 관리자 화면에서 수행한다.

저장소의 모든 검수 초안을 한 번에 확인하려면 다음 명령을 실행한다. CI에서도 같은 검사를 수행하므로, 필수 출처·확인일이 빠진 `*.review.json`은 병합 전에 실패한다.

```powershell
pnpm validate:content:all
```

공개 승인 후보를 점검할 때는 다음 감사 명령을 실행한다. 각 초안을 `published`로 전환한다고 가정해 구조화된 상세 필드·출처 권리·리뷰 근거 승인 조건의 미충족 항목을 출력한다. `automatedPublishChecksPassed`가 true여도 `manualApprovalRequired`가 true이고 `publicPublicationAllowed`는 false이므로, 파일·DynamoDB·공개 상태는 변경하지 않는다.

```powershell
pnpm audit:editorial
```

자동 검사가 통과해도 자동 공개 승인이 아니다. 일본 현행 패키지와 판매 조건, 출처 접근 가능성·권리 범위, 주의사항, 편집자 승인과 리비전 기록을 사람이 확인한 뒤에만 관리자 화면에서 `published`로 저장한다.

`published` 저장 요청에는 관리자 화면의 최종 승인 확인과 승인 사유가 함께 전송되어야 한다. 서버는 Cognito 관리자 식별자와 서버 시각을 `publicationApproval`에 기록하며, 확인 또는 사유가 없으면 DynamoDB에 쓰지 않고 `422`로 거부한다.

관리자 API도 동일한 공개 경계를 적용한다. `review` 상태는 기본 필드, 출처, 최종 확인일, 출처 메타데이터가 없으면 DynamoDB에 저장하지 않으며, `published` 상태는 구조화된 상세 정보와 공개 가능한 권리 상태까지 추가로 통과해야 한다. 공개 API는 `published`이면서 전체 공개 검증을 통과한 콘텐츠만 반환한다.

실제 출처를 확인하지 않은 콘텐츠는 JSON 파일을 만들거나 공개하지 않는다. 커뮤니티 리뷰를 사용할 때는 원문을 복사하지 않고, 권리 상태와 최소 5개 게시글 표본·독립 출처·수집일·요약 근거를 별도로 기록한다.

