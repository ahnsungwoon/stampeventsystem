# 스탬프 투어 시스템 (StampEvent)

학교 축제·행사용 QR 스탬프 투어 웹 시스템입니다. 참가자는 접속 코드로 로그인해 각 부스의 QR 코드를 스캔하며 스탬프를 모으고, 목표 개수를 채우면 현장에서 상품을 수령할 수 있습니다. 관리자는 부스·공연·지도·공지 등 행사 콘텐츠를 실시간으로 편집하고, 방문자 통계 및 참여 현황을 확인할 수 있습니다.

Next.js 14(App Router) + MariaDB 기반이며, 모바일 브라우저에서 앱처럼 쓰도록 만들어졌습니다.

## 주요 기능

### 참가자용
- **접속 코드 로그인**: 전화번호 대신 발급받은 코드로 로그인 (개인정보 최소 수집)
- **부스 탐색**: 층별(B1~3층) 필터, 협업 부스 카테고리 강조, 부스 좋아요(찜)
- **QR 스탬프 수집**: 부스 화면의 QR을 스캔해 스탬프 적립 (QR은 10초마다 자동 갱신되는 1회성 토큰)
- **스탬프 보드**: 실시간 수집 현황, 목표 달성 시 완주 처리
- **상품 수령**: 직원 비밀번호 확인 후 수령 처리 — 수령 후에도 모은 스탬프 기록은 계속 유지됨
- **학교 지도**: 이미지 지도 확대/축소·이동 + 부스 위치 핀

### 부스 운영자용
- **부스 전용 화면** (`/booth`): 접속키로 진입, 10초 주기로 회전하는 QR 코드를 띄워두기만 하면 됨

### 관리자용
- **모바일 어드민** (`/admin`): 행사 정보, 지도, 부스, 공연, 공지 관리
- **PC 어드민** (`/admin/pc`):
  - 접속 코드 대량 생성 / 영수증 프린터(ESC-POS) 인쇄 / 개별·일괄 삭제(2단계 확인)
  - 완주 현황 조회 및 코드별 인증
  - **방문자 통계**: 부스별 QR 스캔 수·순 방문자 수(부스 상세 시간대별 그래프 포함), 전체 시간대별 방문 추이, 행사 참여 인원(코드 등록 수) 및 스탬프 참여율, CSV 다운로드, 통계 초기화
  - 행사 기본 정보 및 접속 코드 인쇄 문구 설정

## 기술 스택

- **프레임워크**: Next.js 14 (App Router), React 18
- **DB**: MariaDB (`mysql2`)
- **인증**: JWT (`jsonwebtoken`) — 참가자용/관리자용 별도 토큰
- **QR**: `qrcode`(생성), `html5-qrcode`(스캔)
- **스타일**: 별도 CSS 프레임워크 없이 inline style 기반

## 시작하기

### 1. 사전 준비

- Node.js 18 이상
- MariaDB (원격 서버 또는 로컬 설치)

### 2. 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example`을 복사해 `.env`를 만들고 실제 값으로 채워주세요.

```bash
cp .env.example .env
```

| 변수 | 설명 |
|---|---|
| `PORT` | 개발 서버 포트 |
| `JWT_SECRET` | JWT 서명 키. 반드시 무작위의 긴 문자열로 교체 (`openssl rand -hex 64`) |
| `ADMIN_PASSWORD` | 어드민(`/admin`, `/admin/pc`) 로그인 비밀번호 |
| `STAFF_PASSWORD` | 상품 수령 확인 시 사용하는 현장 직원 비밀번호 |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MariaDB 접속 정보 |

> ⚠️ `.env`는 절대 커밋하지 마세요 (`.gitignore`에 이미 포함되어 있습니다). `.env.example`에는 실제 비밀번호나 운영 DB 정보를 넣지 말고 항상 placeholder만 남겨두세요.

MariaDB에 데이터베이스가 없다면 먼저 생성합니다.

```sql
CREATE DATABASE stamp_event CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stamp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL ON stamp_event.* TO 'stamp_user'@'localhost';
```

### 4. DB 스키마 초기화

테이블 생성 및 마이그레이션(신규 컬럼 추가, utf8mb4 변환 등)을 실행합니다. 이미 존재하는 테이블에는 영향을 주지 않는 멱등(idempotent) 스크립트라 배포마다 반복 실행해도 안전합니다.

```bash
npm run init-db
```

필요하다면 초기 부스 데이터를 시딩합니다.

```bash
npm run seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

### 6. 프로덕션 빌드 & 실행

```bash
npm run build
npm run start
```

> API 라우트 대부분은 `export const dynamic = 'force-dynamic'`으로 명시되어 있어 프로덕션 빌드에서도 매 요청마다 최신 데이터를 반영합니다. 어드민에서 콘텐츠를 수정한 뒤 화면에 반영되지 않는다면 재빌드·재시작 여부를 먼저 확인하세요.

## 주요 페이지

| 경로 | 설명 |
|---|---|
| `/` | 홈 (행사 소개, 교장선생님 말씀 등) |
| `/event` | 부스 탐색 / 지도 / 공연 일정 탭 |
| `/booths/[id]` | 부스 상세 |
| `/login` | 접속 코드 로그인 |
| `/board` | 내 스탬프 보드 |
| `/scan` | QR 스캔 |
| `/stamp-complete` | 완주 · 상품 수령 |
| `/booth` | 부스 운영자용 QR 표시 화면 (접속키 필요) |
| `/admin` | 모바일 어드민 |
| `/admin/pc` | PC 어드민 (접속 코드 / 완주 현황 / 방문자 통계 / 행사 설정) |

## DB 테이블 개요

- `users` — 참가자 (접속 코드로 발급되는 익명 계정)
- `access_codes` — 발급된 접속 코드와 사용 여부
- `booths` — 부스 정보 (이름, 위치, 층, 아이콘, 카테고리 등)
- `stamps` — 사용자별 스탬프 적립 기록 (부스당 1회, 완주 판정에 사용)
- `booth_visits` — QR 스캔 시도 기록 (중복 스캔 포함, 방문자 통계 집계용)
- `performances` — 공연 일정
- `map_markers` — 학교 지도 위 핀 마커
- `notices` — 상단 공지 배너
- `settings` — 행사 이름/소개/로고 등 사이트 전역 설정 (key-value)

스키마 변경은 `scripts/init-db.js`에서 관리하며, `npm run init-db` 실행 시 누락된 컬럼/테이블만 안전하게 추가됩니다.

## 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run init-db` | DB 스키마 생성/마이그레이션 |
| `npm run seed` | 초기 부스 데이터 시딩 |
