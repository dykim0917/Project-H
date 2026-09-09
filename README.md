# Project H

자기 공간에서 가상의 파칭코 기계를 관찰하며 수집·꾸미기를 즐기는 모바일 방치형 게임의 기획과 브라우저 시제품입니다.

현재 시제품은 **Mk.III 변형 러쉬**와 자매 기계 **Mk.IV 황동 구슬공방**입니다. 방·경제·저장·오프라인 진행·온라인 랭킹은 아직 구현되지 않았습니다.

## 실행

저장소 루트에서 Python 3으로 정적 서버를 실행합니다. 별도 패키지 설치나 빌드는 없습니다.

Windows:

```powershell
py -m http.server 8765 --bind 127.0.0.1 --directory pachinko-prototype
```

macOS:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory pachinko-prototype
```

브라우저에서 [Mk.IV](http://127.0.0.1:8765/mark4/) 또는 [Mk.III](http://127.0.0.1:8765/mark3/)를 엽니다. 이 주소는 각 PC에서 서버를 실행한 뒤 사용합니다. 루트 주소는 이전 판면 실험입니다. Mk.III는 공통 파일과 Mk.2.5 물리에 의존하므로 저장소 전체를 내려받아 주세요.

## 기획과 구현 기록

- [세계관·아트 방향 초안 v0.1](docs/PROJECT-H-WORLDBUILDING-v0.1.md)
- [최신 GDD v0.7 초안](docs/PROJECT-H-GDD-v0.7.md)
- [이전 GDD v0.6 초안](docs/PROJECT-H-GDD-v0.6.md)
- [이전 GDD v0.5 초안](docs/PROJECT-H-GDD-v0.5.md)
- [이전 GDD v0.4 초안](docs/PROJECT-H-GDD-v0.4.md)
- [보존된 기준 GDD v0.3](docs/PROJECT-H-GDD-v0.3.md)
- [플레이 패턴 조사](docs/PLAY-PATTERNS-RESEARCH-v0.1.md)
- [이전 인계 맥락 — v0.3, 최신 결정은 v0.7 참조](docs/PROJECT-H-HANDOFF-PROMPT-v0.3.md)
- [Mk.IV 구현 범위](pachinko-prototype/mark4/README.md)
- [기계 수집·성급 후속 논의](docs/MACHINE-COLLECTION-NOTES-v0.1.md)
- [Mk.III 구현 범위](pachinko-prototype/mark3/README.md)
- [시제품 변경 이력](pachinko-prototype/README.md)

기획 문서의 합의·현황·제안·미정을 구분합니다. 기존 인계 문서의 파일 전달 방식은 Git 연결 전 기록입니다. Git 연결 후에는 이 저장소에서 문서와 코드를 함께 관리하며, GPT 대화 자체는 자동 동기화되지 않습니다.

## 다른 PC와 작업

처음에는 GitHub 저장소를 복제하고 그 폴더를 작업 공간으로 엽니다. 이후 작업 시작 전에 최신 변경을 가져오고, 끝나면 변경을 커밋하고 업로드합니다.

```sh
git pull --ff-only
# 문서 또는 코드 작업
git status
git add <수정한-파일>
git commit -m "Describe the change"
git push
```

양쪽 PC에서 동시에 작업할 때는 각자 작업 브랜치를 사용하고 변경 내용을 비교해 합칩니다. 충돌이 생겼다고 강제로 덮어쓰지 않습니다. 일반 웹 GPT에서 수정한 문서는 저장소 파일로 반영해야 Git에 남습니다.

## 로직 검사

Node.js가 설치된 환경에서 저장소 루트 기준:

```sh
node --test pachinko-prototype/tests/machine.test.cjs pachinko-prototype/tests/sound.test.cjs pachinko-prototype/mark2/machine.test.cjs pachinko-prototype/mark25/game.test.cjs pachinko-prototype/mark3/game.test.cjs pachinko-prototype/mark4/game.test.cjs
```

이 검사는 실제 브라우저 화면·휴대폰 음향 체감 검증을 대신하지 않습니다.

## 저장소 범위

자체 시제품 코드, 이전 실험, 검사 코드·결과와 기획 문서를 관리합니다. 원본 APK·참고 영상·로컬 분석 자료와 ChatGPT의 동기화 원본 `sources/`는 업로드에서 제외합니다.
