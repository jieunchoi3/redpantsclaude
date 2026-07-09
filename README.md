# 콘텐츠 플래너 (redpantsclaude)

Vite + React + TypeScript + Tailwind + Supabase + Gemini (서버 프록시)

## 시작하기

1. Supabase SQL Editor에서 `supabase/schema.sql` 실행
2. Storage에 `cp-idea-images` public 버킷 생성. 기존 버킷은 건드리지 않음.
   테이블은 모두 `cp_` 접두사 (`cp_ideas`, `cp_categories`, `cp_caption_templates`, `cp_app_meta`)
3. 환경변수 설정:

```bash
cp .env.example .env
```

`.env`에 입력:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (프론트)
- `GEMINI_API_KEY` (서버 전용 — `VITE_` 붙이지 말 것)

4. 개발 서버:

```bash
npm install
npm run dev
```

로컬에서도 `/api/gemini`는 Vite 미들웨어가 `.env`의 `GEMINI_API_KEY`로 프록시합니다.

## Vercel 배포

1. GitHub에 푸시 후 [Vercel](https://vercel.com)에서 Import
2. Environment Variables 설정:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (서버 전용)
3. Deploy — `api/gemini.ts`가 Serverless Function으로 자동 배포됩니다
4. 배포 URL을 공유하면 로그인 없이 같은 데이터 조회/편집 가능

## Phase 진행

- Phase 1: 기본 골격 + 자유 노트 + Supabase 연결 ✅
- Phase 2: 아이디어 보드 (CRUD + 카테고리) ✅
- Phase 3: 월간 캘린더 + 배정 ✅
- Phase 4: 드래그앤드롭 + 배치 모드 ✅
- Phase 5: 필터 + 목표 bar + 상태 시각화 ✅
- Phase 6: 캡션 템플릿 ✅
- Phase 7: AI 스마트 검색 + 자동 배치 ✅
- Phase 8: Apple 감성 폴리싱 ✅
