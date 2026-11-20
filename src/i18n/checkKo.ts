// 빨리 맞추기 도중 실수 알아채기(색 짚기·"똑같아?" 확인·다시 길 찾기) 한국어 문구 — 큐비 반말
// 키 이름 = 음성 파일 이름 (public/voice/<키>.mp3)
export const checkKo = {
  // 매번 돌릴 때 짚어 주는 칸
  watchR: '빨간색이 어디로 가는지 봐!',
  watchO: '주황색이 어디로 가는지 봐!',
  watchY: '노란색이 어디로 가는지 봐!',
  watchG: '초록색이 어디로 가는지 봐!',
  watchB: '파란색이 어디로 가는지 봐!',
  watchW: '흰색이 어디로 가는지 봐!',
  // 1/3·2/3 지점 확인
  checkAsk: '잠깐! 너의 큐브도 이렇게 생겼어?',
  checkHow: '똑같으면 동그라미, 다르면 가위표를 눌러 줘!',
  checkYes: '똑같아',
  checkNo: '달라',
  guideDiff: '😵 내 큐브가 달라',
  // '달라'를 골랐을 때
  recoverTitle: '큐비랑 찾기',
  recoverStart: '괜찮아! 큐비가 찾아 줄게!',
  recoverShowF: '초록 면을 보여 줘!',
  recoverShowU: '이번엔 흰색 면을 보여 줘!',
  recoverShowR: '빨간 면도 보여 줘!',
  recoverPaintF: '초록색 면을 똑같이 칠해 줘!',
  recoverPaintU: '흰색 면을 똑같이 칠해 줘!',
  recoverPaintR: '빨간색 면을 똑같이 칠해 줘!',
  recoverHold: '초록색 면이 앞으로 오게 잡아 줘!',
  recoverFound: '찾았다! 여기서부터 다시 가자!',
  recoverLost: '음, 잘 모르겠어. 큐브를 전부 보여 줘!',
  recoverSame: '다시 보니 똑같아! 계속 가자!',
  recoverSearching: '큐비가 찾는 중이야…',
  recoverFaceNo: '{i}번째 면',
  recoverPainted: '다 칠했어 ▶',
  recoverUsePaint: '🎨 칠할래',
  recoverUseCamera: '📸 찍을래',
  recoverScanAll: '📸 카메라로 전부 찍기',
  recoverPaintAll: '🎨 직접 칠하기',
  recoverRetry: '처음부터 다시',
  recoverQuit: '그만하기',
};
