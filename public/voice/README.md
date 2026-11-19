# 큐비 음성 파일 자리

타입캐스트로 녹음한 mp3를 아래 이름 그대로 이 폴더에 넣으면 앱이 자동으로 재생합니다.
파일이 없으면 소리 없이 글자로만 나옵니다. (한국어만)

## 완성 보상 (src/i18n/rewardsKo.ts)
| 파일 | 문구 |
|---|---|
| praise-1.mp3 | 우와! 네가 해냈어! |
| praise-2.mp3 | 최고야! 큐브 박사님 같아! |
| praise-3.mp3 | 끝까지 해냈구나! 정말 멋져! |
| praise-4.mp3 | 짝짝짝! 큐비가 깜짝 놀랐어! |
| praise-5.mp3 | 대단해! 너는 큐브 왕이야! |
| transform.mp3 | 짜잔! 큐비가 변신했어! |

완성할 때마다 praise-1~5 중 하나가 무작위로 나오고, 스티커 10장을 채우면 transform.mp3가 나옵니다.

## 큐비 안내 음성 (src/voice/voice.ts)
파일 이름 = 문구 키(src/i18n/ko.ts). 예: `guideTurn.mp3` = "여기를 화살표 방향으로 한 번 돌려!"
- 홈: homeHello, homeGo (큐비를 누르면 재생)
- 찍기: scanIntro, scanAlign, scanSeen, scanCaptured_U/R/F/D/L/B, scanNext, scanAllDone, scanNoCenter, scanError
- 색 확인: editGo, editSolving, alreadySolved, errIncomplete, errAny
- 안내: guideTotal, guideHold, guideKeep(전체의 1/3·2/3 지점, 한 템포 쉬고), guideTurn(2), guideThen(2), guidePraise1~5, guideHalf, guideLast, cubiHelp
- 변신: transform.mp3 (audios/audio_39)
- 완성: doneTitle 다음에 doneAgain (praise-1~5.mp3는 현재 재생하지 않음)
- guideBNote.mp3는 더 이상 쓰지 않음
말풍선의 큐비를 누르면 마지막 말을 다시 들려줍니다.

- 효과음 "짜잔~": src/voice/sfx.ts에서 Web Audio로 합성(파일 없음), 완성 화면에서 음성 앞에 재생
- homeGo(audio_1), editSolving(audio_17)은 사용 안 함
