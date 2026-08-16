# 커뮤니티 리뷰 데이터 수집·검수 설계 — 2026-08-16

이 문서는 K-Beauty Atlas Japan이 커뮤니티 리뷰를 다룰 때의 수집 범위와 공개 조건을 정의한다. 리뷰 원문, 닉네임, 프로필 이미지, 댓글 전문, 로그인 필요 영역은 저장하거나 공개하지 않는다.

## 기본 원칙

- 리뷰는 제품 사실관계의 보조 근거로만 사용한다. 공식 제품 정보와 리뷰 평가는 별도 출처로 관리한다.
- 자동 수집은 API, 서면 허가, 이용약관상 명확한 허용 범위가 확인된 경우에만 검토한다.
- 이용약관·robots.txt·로그인 요구·CAPTCHA·접근 제한이 불명확하면 `manual-reference` 또는 `needs-review`로 기록하고 자동 수집하지 않는다.
- 공개 데이터에는 리뷰 원문 대신 집계값과 자체 작성한 요약만 넣는다. 인용이 필요하면 최소 분량과 권리 상태를 별도로 승인한다.
- 의료적 진단, 치료 효과, 부작용 단정은 리뷰에서 추출하거나 재작성하지 않는다.

## 저장할 메타데이터

리뷰 근거는 다음 정보만 저장한다.

| 필드 | 내용 |
| --- | --- |
| productSlug | 제품 식별자와 판매 지역/용량 |
| platform | 플랫폼명 |
| sourceUrl | 제품 또는 리뷰 집계 페이지 URL |
| sourceType | `community-review` 또는 허가된 API/가져오기 유형 |
| rightsStatus | `verified`, `reference-only`, `needs-review`, `rejected` |
| extractionMethod | `api`, `licensed-import`, `manual`, `no-automation` |
| collectedAt | 집계 확인일 |
| sampleCount | 실제 검토한 리뷰 표본 수 |
| independentSourceCount | 서로 독립적인 리뷰 출처 수 |
| ratingAggregate | 플랫폼이 표시한 평균 평점. 플랫폼·기간을 함께 기록 |
| reviewCountAtCollection | 확인 당시 전체 리뷰 수 |
| reviewWindow | 리뷰 작성 기간 또는 확인 불가 여부 |
| summary | 원문을 재현하지 않는 자체 요약 |
| approvalStatus | `pending`, `approved`, `rejected` 편집 승인 상태 |
| approvalNote | 승인 또는 거부 판단 메모 |
| approvedAt / approvedBy | 서버가 기록하는 승인 시각과 관리자 식별자 |

관리자 화면과 백엔드는 `platform`, `sampleCount`, `independentSourceCount`, `reviewCountAtCollection`, `reviewWindow`, `collectedAt`, `summary`, `sourceUrls`를 함께 확인한다. 전체 리뷰 수가 실제 표본 수보다 작거나 플랫폼·기간 메타데이터가 없으면 검수 입력이 완료되지 않은 것으로 처리한다. `reviewEvidence`는 반드시 하나 이상의 `community-review` 출처와 연결해야 하며, 근거 URL은 해당 출처 목록에 포함되고 독립 출처 수보다 적을 수 없다.

원문 텍스트, 작성자 식별자, 사진·영상, 주문 정보, 연락처는 저장하지 않는다.

## 공개 게이트

다음 조건을 모두 충족하기 전에는 리뷰 근거를 공개 콘텐츠에 포함하지 않는다.

1. 제품명·용량·지역이 공식 또는 판매처 사양과 일치한다.
2. 표본이 5개 이상이고 독립 출처가 1개 이상이다.
3. 출처의 권리 상태가 `verified` 또는 공개 가능한 `reference-only`로 편집 승인된다.
4. 평점·리뷰 수의 기준일, 플랫폼, 표본 범위를 함께 표시한다.
5. 리뷰의 개인 경험과 브랜드 공식 정보, 편집자의 해석을 문장 단위로 구분한다.
6. 커뮤니티 리뷰만으로 효능·안전성·의료적 결론을 만들지 않는다.
7. `approvalStatus: approved`가 아니면 공개하지 않으며, 승인 시각과 관리자를 서버 감사 기록에 남긴다.
8. 공개 콘텐츠에 대한 정정·권리 요청이 접수 또는 검토 중이면 리뷰 근거를 `pending`으로 되돌리고 콘텐츠를 검수 대기로 전환한다.

## 이번 조사 후보

Round Lab 자작나무 수분 선크림은 Glowpick에서 제품별 평점·리뷰 수와 공개 리뷰 페이지를 확인할 수 있었다. 이는 표본 설계 후보로만 기록하며, 이용약관과 재사용 권한 확인 전까지 `rightsStatus: needs-review`, `extractionMethod: no-automation`으로 취급한다. 리뷰 원문은 저장하지 않는다.

- 후보 출처: [Glowpick Round Lab 선크림 리뷰·랭킹 페이지](https://www.glowpick.com/brands/6094?cate1Id=9&cate2Id=41&monthTerm=24)
- 확인 메모: 2026-08-16 기준 제품별 공개 평점·리뷰 수가 표시됨
- 공개 결정: 보류

SKIN1004 일본 공식 100ml 상품 페이지는 과거 상품 사양과 판매 상태 확인용 출처이지, 사용자 리뷰 표본 출처로 사용하지 않는다. 재확인 시 해당 URL은 404였으므로 현재 리뷰 유무를 판단하지 않는다.

- 확인 출처: [SKIN1004 일본 공식 100ml 상품 페이지](https://skin1004japan.com/product/%E3%83%9E%E3%83%80%E3%82%AC%E3%82%B9%E3%82%AB%E3%83%AB-%E3%82%BB%E3%83%B3%E3%83%86%E3%83%A9-%E3%82%A2%E3%83%B3%E3%83%97%E3%83%AB-100ml/18/)
- 공개 결정: 리뷰 근거 없음. 과거 제품 사양 기록에만 사용하며 현행 리뷰·판매 조건의 근거로 사용하지 않음

## 구현 순서

1. 관리자에서 리뷰 근거 URL, 표본 수, 독립 출처 수, 집계일, 권리 상태를 입력한다.
2. 백엔드가 최소 표본 수·URL·날짜·권리 상태를 검증한다.
3. 편집자가 제품 식별자와 리뷰 표본 범위를 대조한다.
4. 공개 본문에는 집계와 자체 요약만 반영하고, 원문은 저장하지 않는다.
5. 출처 철회·정정 요청이 접수되면 해당 리뷰 근거를 즉시 `needs-review`로 되돌린다.
