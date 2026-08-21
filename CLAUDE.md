# Fragnote

내 향수장을 관리하고, 취향과 날씨에 맞는 향수를 추천받는 개인용 향수 앱.
포트폴리오/이직용 사이드 프로젝트.

상세 기획은 @docs/planning.md 참고 (유저 시나리오, 화면 설계, 경쟁 서비스 분석 등 전체 내용).

## 컨셉
- 내 향수장(컬렉션) + 추천(취향 매칭 + 날씨 반영) + 잔량/변질 관리
- 타겟: 향수 5~10개 보유, 매번 뭘 뿌릴지 고민하는 20대 후반 직장인

## 스택
- Next.js 풀스택 (App Router + Server Actions), TypeScript
- Prisma + PostgreSQL (Neon)
- Auth.js — **Prisma Adapter 없이 JWT 세션 전략** 사용 (Account/Session 테이블 불필요, signIn 콜백에서 User 테이블에 직접 upsert)
- 날씨: OpenWeatherMap
- 이미지: Vercel Blob
- 차트: Recharts
- 타겟 플랫폼: 모바일 웹 우선, 반응형 데스크톱 대응

## 핵심 설계 결정 (반드시 지킬 것)
- **추천 엔진은 하나로 통합**: 취향 매칭 모드 / 데일리 모드(날씨+최근미사용+변질위험 가중치 추가)를 파라미터로 분기. 별도 엔진 두 개로 만들지 말 것
- **잔량 계산**: 자동 추정(스프레이 횟수 × 0.08~0.1ml) + 수동 보정 하이브리드. 로그 수정/삭제 시 해당 향수 로그 전체를 다시 순회해 재계산 (실시간 차감 방식 쓰지 말 것)
- **동일 향수 다중 보유 지원**: `Collection`은 향수당 유니크가 아님. 여러 개 등록 가능 (정품/미니어처 등 `label`로 구분)
- **향 변질 관리**: `Collection.openedAt` 기준 경과 개월 수로 위험도 표시, 데일리 추천 가중치에 반영
- **카탈로그는 고정**: MVP에서는 유저 직접 등록 없음. 시딩된 카탈로그 내에서만 검색/등록
- **신규 향수 vs 사용하던 향수 등록 분기 필수**: `isPreOwned` 플래그로 구분

## 스키마
prisma/schema.prisma 참고. 주요 모델: User, Brand, Note, Perfume, PerfumeNote, Collection, Wishlist, UsageLog, UserNotePreference.

## MVP 우선순위
1. 데이터 시딩 (카탈로그 + 날씨-노트 매핑 룰)
2. 온보딩 & 취향 설정
3. 컬렉션 등록/관리 (다중 보유, 신규/사용중 분기, 변질 관리)
4. 추천 엔진 (통합, 폴백·다양성·변질 가중치)
5. 통계 대시보드

## v2 이후 (지금은 손대지 않음)
- 레이어링 지원, 향 궁합 테스트(소셜), 유저 카탈로그 등록, 실물 무게 기반 잔량 측정

## 폴더 구조
```
prisma/schema.prisma
scripts/generate-notes.mjs   # 데이터 시딩용 LLM 노트 생성 스크립트
scripts/data/                # 향수 카탈로그 체크리스트(xlsx)
docs/planning.md             # 전체 기획서
```
