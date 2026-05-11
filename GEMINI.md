# GEMINI.md — Game Tools
> Antigravity 전용 프로젝트 컨텍스트 파일입니다.
> 에이전트 행동 규칙은 AGENTS.md를 참조하세요.

---

## 프로젝트 개요

- **목적:** Phaser.js 게임 개발을 위한 브라우저 기반 내부 툴 모음
- **사용자:** 게임 개발자(본인) — 퍼블릭 배포 아님
- **배포:** GitHub Pages (별도 레포)
- **연동 대상:** 게임 레포의 `src/data/` JSON 포맷과 호환 유지

---

## 레포지토리 정보

| 항목 | 내용 |
|---|---|
| 레포지토리 | `github.com/rapcubus/Object_Builder` |
| 프로젝트명 | `Metal Blossom - Object Builder` |
| 공유 타입 | `src/types/game.ts` 정의 활용 |
| 데이터 내보내기 | `src/data/` 경로로 JSON export 및 수동 연동 |

---

## 프로젝트 구조

```
Object_Builder/
├── AGENTS.md
├── GEMINI.md
├── index.html
├── vite.config.ts
├── package.json
├── .env.example               # VITE_ prefix 환경변수 예시
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Pages 자동 배포 액션
├── src/
│   ├── main.tsx               # React 앱 진입점
│   ├── App.tsx                # HashRouter + 툴 라우팅
│   ├── types/
│   │   └── game.ts            # 데이터 타입 정의
│   ├── components/
│   │   ├── common/            # 공통 UI 컴포넌트 (Button, Modal 등)
│   │   └── tools/             # 툴별 전용 컴포넌트
│   ├── hooks/
│   │   ├── useLocalStorage.ts # localStorage 자동 저장/복구
│   │   └── useExport.ts       # JSON/파일 export 유틸
│   ├── stores/
│   │   └── editorStore.ts     # Zustand 전역 상태
│   ├── tools/
│   │   └── ObjectBuilder/     # 오브젝트 빌더 툴 (현재 주력)
│   │       ├── ObjectBuilderScene.ts
│   │       └── ...
│   └── utils/
│       ├── exportJson.ts      # Blob 기반 JSON 다운로드
│       └── importJson.ts      # 파일 import 파싱
└── dist/                      # Vite 빌드 출력 (GitHub Pages 배포용)
```

---

## 툴 목록 및 라우팅

| 경로 | 툴 이름 | 설명 |
|---|---|---|
| `/#/` | 오브젝트 빌더 | Phaser.js 기반 도형 조합 및 JSON export |

> 새 툴 추가 시 이 목록과 `App.tsx` 라우팅을 동시에 업데이트한다.

---

## 데이터 Export 규칙

모든 툴의 export는 아래 방식을 따른다:

```typescript
// 브라우저 클라이언트 사이드 파일 다운로드 (서버 불필요)
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filename.json';
a.click();
URL.revokeObjectURL(url); // 메모리 해제
```

export된 JSON은 게임 레포의 `src/data/` 에 직접 복사하여 사용한다.

---

## GitHub Pages 배포 설정

```yaml
# .github/workflows/deploy.yml 핵심 내용
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> `vite.config.ts`에 `base: './'` 설정 (GitHub Pages 호환용)

---

## 현재 개발 우선순위

1. **프로젝트 초기 세팅** — Vite + React + TypeScript + Tailwind + Zustand
2. **GitHub Actions 배포 파이프라인** 구성
3. **공통 UI 컴포넌트** — Button, Modal, Toolbar
4. **맵 에디터** — 타일 팔레트 + Canvas 렌더링 + JSON export
5. **밸런스 에디터** — 스탯 테이블 편집 + JSON export
6. **게임 레포 데이터 타입 동기화** 확인

---

## Antigravity 에이전트 운용 지침

- 툴의 export JSON을 실제 프로젝트에서 불러와 호환 여부를 검증한다
- 새로운 기능 추가 시 `worklog.md`에 기록하며 진행한다
- `src/types/game.ts` 수정 시 데이터 스키마 영향도를 반드시 확인한다
