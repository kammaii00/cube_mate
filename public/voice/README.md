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

## 실수 알아채기 (src/i18n/checkKo.ts) — 2026-11-20 추가 (녹음 원본 audios/audio_45~61)
빨리 맞추기 도중 매번 색 하나를 짚어 주고, 전체의 1/3·2/3 지점(guideKeep 직전)에 "똑같아?"를 묻고, '달라'면 면 2~3개로 지금 모습을 찾습니다.
| 파일 | 문구 | 언제 |
|---|---|---|
| watchR.mp3 | 빨간색이 어디로 가는지 봐! | 매번 돌릴 때 (짚은 칸 색) |
| watchO.mp3 | 주황색이 어디로 가는지 봐! | 〃 |
| watchY.mp3 | 노란색이 어디로 가는지 봐! | 〃 |
| watchG.mp3 | 초록색이 어디로 가는지 봐! | 〃 |
| watchB.mp3 | 파란색이 어디로 가는지 봐! | 〃 |
| watchW.mp3 | 흰색이 어디로 가는지 봐! | 〃 |
| checkAsk.mp3 | 잠깐! 너의 큐브도 이렇게 생겼어? | 1/3·2/3 지점 확인 |
| checkHow.mp3 | 똑같으면 동그라미, 다르면 가위표를 눌러 줘! | checkAsk 바로 뒤, 5초 머뭇거리면 다시 (최대 2번). audios/audio_63_똑같으면_동그라미__다르면_가위표를_눌러_줘_.mp3 |
| recoverStart.mp3 | 괜찮아! 큐비가 찾아 줄게! | '달라'를 고른 직후 |
| recoverShowF.mp3 | 초록 면을 보여 줘! | 카메라로 찍기 |
| recoverShowU.mp3 | 이번엔 흰색 면을 보여 줘! | 〃 |
| recoverShowR.mp3 | 빨간 면도 보여 줘! | 〃 (두 면으로 못 좁혔을 때) |
| recoverPaintF.mp3 | 초록색 면을 똑같이 칠해 줘! | 직접 칠하기 (카메라를 못 쓸 때) |
| recoverPaintU.mp3 | 흰색 면을 똑같이 칠해 줘! | 〃 |
| recoverPaintR.mp3 | 빨간색 면을 똑같이 칠해 줘! | 〃 |
| recoverHold.mp3 | 초록색 면이 앞으로 오게 잡아 줘! | 찍을 면이 아닌 면을 보여 줬을 때 |
| recoverFound.mp3 | 찾았다! 여기서부터 다시 가자! | 지금 모습을 찾아 다시 시작할 때 |
| recoverLost.mp3 | 음, 잘 모르겠어. 큐브를 전부 보여 줘! | 못 찾았을 때 |

## 큐비 안내 음성 (src/voice/voice.ts)
파일 이름 = 문구 키(src/i18n/ko.ts). 예: `guideTurn.mp3` = "여기를 화살표 방향으로 한 번 돌려!"
- 홈: homeHello, homeGo (큐비를 누르면 재생)
- 찍기: scanIntro, scanAlign, scanSeen, scanCaptured_U/R/F/D/L/B, scanNext, scanAllDone, scanNoCenter, scanError
- 색 확인: editGo, editSolving, alreadySolved, errIncomplete, errAny
- 안내: guideTotal, guideHold, guideKeep(전체의 1/3·2/3 지점, 한 템포 쉬고), guideTurn(2), guideThen(2), guidePraise1~5, guideHalf, guideLast, cubiHelp
- 변신: transform.mp3 (audios/audio_39)
- 완성: doneTitle 다음에 doneAgain("또 하고 싶으면 노란색 버튼을 눌러 줘!", audios/audio_62) (praise-1~5.mp3는 현재 재생하지 않음)
- guideBNote.mp3는 더 이상 쓰지 않음
말풍선의 큐비를 누르면 마지막 말을 다시 들려줍니다.

- 효과음 "짜잔~": src/voice/sfx.ts에서 Web Audio로 합성(파일 없음), 완성 화면에서 음성 앞에 재생
- homeGo(audio_1), editSolving(audio_17)은 사용 안 함

## 꼬마 코스(큐브 배우기 섬) 음성 — 2026-11-27 녹음 64개 적용 (녹음 원본 audios/audio_64~127)
아직 없음: 1층 화면 연습 10개(introLayer~cornerAway, 보류), introPetalBottom. 파일이 없으면 글자만 보임.
문구와 대사는 src/i18n/courseKo.ts, 파일 이름 = 키.
- 지도: courseMapHello, courseLocked, courseChoose("어떤 걸 해 볼까?", 레벨 고르기)
- 조각 알기: quizFindEdge, quizFindCorner, quizWhere, quizRight, quizWrong, quizWhereWrong
- 흰 꽃 화면 연습: introDaisy, introPetalSide, introPetalBottom, introPetalBusy, petalAsk, petalTipSide, petalTipBottom, petalTipBusy, petalRight, petalAway, petalReset
- 흰 십자 화면 연습: introCross, introCrossDrop, introCrossMatch, crossAsk, crossTipDrop, crossTipMatch, crossRight (멀어졌을 때는 petalAway를 같이 씀)
- 1층 화면 연습(오른손 춤): introLayer, introCornerDance1, introCornerDanceMore, introCornerBring, cornerAsk, cornerTipDance1, cornerTipDanceMore, cornerTipBring, cornerRight, cornerAway
- 연습: practiceCheck1~3("흰 꽃이/흰 십자가/1층이 잘 완성됐는지 확인해 보자!", 다 했어! 뒤 확인 화면), practiceMix, practiceHold, practiceGoal1~3, practiceTip1~3, practiceGuideIntro, practiceLeft("잘했어! 조금 남았어", 숫자 없이), practiceNowTry, practiceAlready, practiceCount(숫자 없이 녹음 시 "조금만 더!"), practiceSides, practiceSidesFix, practiceScanFail, practiceShowD, practiceShowU, practicePaintD, practicePaintU, practiceRehold("다시 노란색이 하늘, 초록이 나를 보게 잡아!", 보여 준 뒤 같이 하기 전), courseTogetherNote("다 섞으면 큐비한테 보여 줘! 한 조각씩 같이 맞추자", 같이 해 보기 섞기 화면)
- 결과: courseGood1~3, courseGoodHint, courseReviewDone("복습 끝! 잘 기억하고 있네!"), courseStar("별을 받았어!"), courseLeft1("한 번만 더 하면 별!"), courseLeft2("두 번 더 하면 별!"), courseLeft3("세 번 하면 별!"), courseRescued0~3
같이 돌리기 안내는 빨리 맞추기 녹음(guideTurn 등)을 그대로 씁니다.
