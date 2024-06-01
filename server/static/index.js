const paddle1Element = document.querySelector('.paddle-1');
const paddle2Element = document.querySelector('.paddle-2');
const board = document.querySelector('.board');
const initialBall = document.querySelector('.ball');
const ball = document.querySelector('.ball');
const score1Element = document.querySelector('.player-1-score');
const score2Element = document.querySelector('.player-2-score');
const messageElement = document.querySelector('.message');
const initialBallCoord = ball.getBoundingClientRect();
const boardCoord = board.getBoundingClientRect();
const paddleCommon = paddle1Element.getBoundingClientRect();

const paddleWidth = paddleCommon.width;

/* DOM Manipulation */
const setGameMessage = (message) => {
  messageElement.innerHTML = message;
};

const setPlayerScore = (playerId, score) => {
  const scores = [score1Element, score2Element];
  if (playerId === 1) {
    score1Element.innerHTML = score;
  } else {
    score2Element.innerHTML = score;
  }
};

const setBallPosition = (x, y) => {
  ball.style.left = `${x}px`;
  ball.style.top = `${y}px`;
};

const setPaddlePosition = (playerId, y) => {
  const paddleElement = playerId === 1 ? paddle1Element : paddle2Element;
  paddleElement.style.top = `${y}px`;
};

const renderState = (newState, oldState) => {
  if (!oldState || newState.roundState !== oldState.roundState) {
    if (newState.roundState === 'start') {
      setGameMessage('Press Enter to Play Pong');
    } else if (newState.roundState === 'playing') {
      setGameMessage('Game Started');
    } else {
      throw new Error(`Invalid round state: ${newState.roundState}`);
    }
  }

  if (
    !oldState ||
    newState.paddleCoords[0].top !== oldState.paddleCoords[0].top
  ) {
    setPaddlePosition(1, newState.paddleCoords[0].top);
  }
  if (
    !oldState ||
    newState.paddleCoords[1].top !== oldState.paddleCoords[1].top
  ) {
    setPaddlePosition(2, newState.paddlecoords[1].top);
  }

  if (!oldState || newState.ballCoord !== oldState.ballCoord) {
    setBallPosition(newState.ballCoord.x, newState.ballCoord.y);
  }

  if (!oldState || newState.scores[0] !== oldState.scores[0]) {
    setPlayerScore(1, newState.scores[0]);
  }
  if (!oldState || newState.scores[1] !== oldState.scores[1]) {
    setPlayerScore(2, newState.scores[1]);
  }
};

/* Round State Logic */
const generateRandomSpeed = () => Math.floor(Math.random() * 4) + 3;

const getOriginalGameState = () => {
  console.log(initialBallCoord);
  console.log(window.screen);
  return {
    roundState: 'start', // 'start' | 'playing'
    paddleCoords: [
      paddle1Element.getBoundingClientRect(),
      paddle2Element.getBoundingClientRect(),
    ],
    ballCoord: initialBallCoord,
    scores: [0, 0],
  };
};

let gameState = getOriginalGameState();

const updateGameState = (newPartialGameState) => {
  const newGameState = {
    ...gameState,
    ...newPartialGameState,
  };
  renderState(newGameState, gameState);
  gameState = newGameState;
};

/* WebSocket Logic */
const webSocket = new WebSocket('wss://echo.websocket.org/.hehe');

const sendMessage = (type, body = {}) => {
  const messageObj = {
    type,
    body,
  };
  webSocket.send(JSON.stringify(messageObj));
};

const setMessageListener = (type, handler) => {
  const fullHandler = (event) => {
    const messageObj = JSON.parse(event.data);
    if (messageObj.type === type) {
      handler(messageObj.body);
    }
  };
  webSocket.addEventListener('message', fullHandler);
  return {
    remove() {
      webSocket.removeEventListener('message', fullHandler);
    },
  };
};

/* Room Code Logic */
const ROOM_CODE_PARAM_KEY = 'room-code';

/**
 * @returns {string | undefined} Room code if present in the URL
 * */
const getRoomCode = () => {
  const url = new URL(window.location.href);
  const roomCode = url.searchParams.get(ROOM_CODE_PARAM_KEY);
  return roomCode;
};

const setRoomCode = (roomCode) => {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_CODE_PARAM_KEY, roomCode);
  history.pushState(null, '', url);
};

// document.addEventListener('load', () => {
//   setMessageListener('room-changed', ({ roomCode, playerId }) => {});
//
//   const roomCode = getRoomCode();
//   if (roomCode) {
//     sendMessage('join-room', { roomCode });
//   } else {
//     sendMessage('request-room');
//   }
//
// const webSocket = new WebSocket('wss://echo.websocket.org/.hehe');
//
// console.log('TESTESTESTS');
// webSocket.onopen = (e) => {
//   console.log('Message sent');
//   webSocket.send('Hello server');
// };
// webSocket.onmessage = (e) => {
//   console.log(e.data);
//   webSocket.close();
// };
// });

/* Game Logic */
document.addEventListener('keydown', (e) => {
  if (e.key == 'Enter') {
    gameState.roundState =
      gameState.roundState == 'start' ? 'playing' : 'start';
    if (gameState.roundState == 'playing') {
      setGameMessage('Game Started');
      requestAnimationFrame(() => {
        const initialBallSpeedY = generateRandomSpeed();
        const initialBallSpeedX = generateRandomSpeed();
        moveBall(initialBallSpeedX, initialBallSpeedY);
      });
    }
  }
  if (gameState.roundState == 'playing') {
    if (e.key == 'w') {
      setPaddlePosition(
        1,
        Math.max(
          boardCoord.top,
          gameState.paddleCoords[0].top - window.innerHeight * 0.06,
        ),
      );
      gameState.paddleCoords[0] = paddle1Element.getBoundingClientRect();
    }
    if (e.key == 's') {
      setPaddlePosition(
        1,
        Math.min(
          boardCoord.bottom - paddleCommon.height,
          gameState.paddleCoords[0].top + window.innerHeight * 0.06,
        ),
      );
      gameState.paddleCoords[0] = paddle1Element.getBoundingClientRect();
    }

    if (e.key == 'ArrowUp') {
      setPaddlePosition(
        2,
        Math.max(
          boardCoord.top,
          gameState.paddleCoords[1].top - window.innerHeight * 0.1,
        ),
      );
      gameState.paddleCoords[1] = paddle2Element.getBoundingClientRect();
    }
    if (e.key == 'ArrowDown') {
      setPaddlePosition(
        2,
        Math.min(
          boardCoord.bottom - paddleCommon.height,
          gameState.paddleCoords[1].top + window.innerHeight * 0.1,
        ),
      );
      gameState.paddleCoords[1] = paddle2Element.getBoundingClientRect();
    }
  }
});

/* Ball Movement Logic */
function moveBall(dx, dy) {
  let yDown = dy > 0;
  let xRight = dx > 0;
  let absDX = Math.abs(dx);
  let absDY = Math.abs(dy);

  /* Vertical wall collisions */
  if (gameState.ballCoord.top <= boardCoord.top) {
    yDown = true;
  }
  if (gameState.ballCoord.bottom >= boardCoord.bottom) {
    yDown = false;
  }

  /* Paddle collisions */
  if (
    gameState.ballCoord.left <= gameState.paddleCoords[0].right &&
    gameState.ballCoord.top >= gameState.paddleCoords[0].top &&
    gameState.ballCoord.bottom <= gameState.paddleCoords[0].bottom
  ) {
    xRight = true;
    absDX = generateRandomSpeed();
    absDY = generateRandomSpeed();
  }
  if (
    gameState.ballCoord.right >= gameState.paddleCoords[1].left &&
    gameState.ballCoord.top >= gameState.paddleCoords[1].top &&
    gameState.ballCoord.bottom <= gameState.paddleCoords[1].bottom
  ) {
    xRight = false;
    absDX = generateRandomSpeed();
    absDY = generateRandomSpeed();
  }

  /* Horizontal wall collisions */
  if (
    gameState.ballCoord.left <= boardCoord.left ||
    gameState.ballCoord.right >= boardCoord.right
  ) {
    if (gameState.ballCoord.left <= boardCoord.left) {
      updateGameState({
        scores: [gameState.scores[0], gameState.scores[1] + 1],
      });
    } else {
      updateGameState({
        scores: [gameState.scores[0] + 1, gameState.scores[1]],
      });
    }
    updateGameState({
      roundState: 'start',
      ballCoord: initialBallCoord,
    });
    return;
  }

  const newDX = xRight ? absDX : -absDX;
  const newDY = yDown ? absDY : -absDY;
  setBallPosition(
    gameState.ballCoord.left + newDX,
    gameState.ballCoord.top + newDY,
  );
  gameState.ballCoord = ball.getBoundingClientRect();
  requestAnimationFrame(() => {
    moveBall(newDX, newDY);
  });
}
