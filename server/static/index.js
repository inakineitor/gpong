const paddle1 = document.querySelector('.paddle-1');
const paddle2 = document.querySelector('.paddle-2');
const board = document.querySelector('.board');
const initialBall = document.querySelector('.ball');
const ball = document.querySelector('.ball');
const score1 = document.querySelector('.player-1-score');
const score2 = document.querySelector('.player-2-score');
const message = document.querySelector('.message');
const initialBallCoord = ball.getBoundingClientRect();
const boardCoord = board.getBoundingClientRect();
const paddleCommon = document.querySelector('.paddle').getBoundingClientRect();
// let roundState = 'start';
// let paddle1Coord = paddle1.getBoundingClientRect();
// let paddle2Coord = paddle2.getBoundingClientRect();
// let ballCoord = initialBallCoord;
// let dx = Math.floor(Math.random() * 4) + 3;
// let dy = Math.floor(Math.random() * 4) + 3;

/* Round State Logic */
const generateRandomSpeed = () => Math.floor(Math.random() * 4) + 3;

const getOriginalGameState = () => {
  return {
    roundState: 'start', // 'start' | 'playing'
    paddleCoords: [
      paddle1.getBoundingClientRect(),
      paddle2.getBoundingClientRect(),
    ],
    ballCoord: initialBallCoord,
    ballSpeed: {
      x: generateRandomSpeed(),
      y: generateRandomSpeed(),
    },
  };
};

const gameState = getOriginalGameState();

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
    roundState = roundState == 'start' ? 'playing' : 'start';
    if (roundState == 'playing') {
      message.innerHTML = 'Game Started';
      message.style.left = 42 + 'vw';
      requestAnimationFrame(() => {
        dx = Math.floor(Math.random() * 4) + 3;
        dy = Math.floor(Math.random() * 4) + 3;
        moveBall(dx, dy);
      });
    }
  }
  if (roundState == 'playing') {
    if (e.key == 'w') {
      paddle1.style.top =
        Math.max(boardCoord.top, paddle1Coord.top - window.innerHeight * 0.06) +
        'px';
      paddle1Coord = paddle1.getBoundingClientRect();
    }
    if (e.key == 's') {
      paddle1.style.top =
        Math.min(
          boardCoord.bottom - paddleCommon.height,
          paddle1Coord.top + window.innerHeight * 0.06,
        ) + 'px';
      paddle1Coord = paddle1.getBoundingClientRect();
    }

    if (e.key == 'ArrowUp') {
      paddle2.style.top =
        Math.max(boardCoord.top, paddle2Coord.top - window.innerHeight * 0.1) +
        'px';
      paddle2Coord = paddle2.getBoundingClientRect();
    }
    if (e.key == 'ArrowDown') {
      paddle2.style.top =
        Math.min(
          boardCoord.bottom - paddleCommon.height,
          paddle2Coord.top + window.innerHeight * 0.1,
        ) + 'px';
      paddle2Coord = paddle2.getBoundingClientRect();
    }
  }
});

/* Ball Movement Logic */

const setPlayerScore = (playerId, score) => {
  const scores = [score1, score2];
  // scores[playerId - 1]?.innerHTML = score;
  if (playerId === 1) {
    score1.innerHTML = score;
  } else {
    score2.innerHTML = score;
  }
};

function moveBall(dx, dy) {
  let yDown = dy > 0;
  let xRight = dx > 0;
  let absDX = Math.abs(dx);
  let absDY = Math.abs(dy);

  /* Vertical wall collisions */
  if (ballCoord.top <= boardCoord.top) {
    yDown = true;
  }
  if (ballCoord.bottom >= boardCoord.bottom) {
    yDown = false;
  }

  /* Paddle collisions */
  if (
    ballCoord.left <= paddle1Coord.right &&
    ballCoord.top >= paddle1Coord.top &&
    ballCoord.bottom <= paddle1Coord.bottom
  ) {
    xRight = true;
    absDX = generateRandomSpeed();
    absDY = generateRandomSpeed();
  }
  if (
    ballCoord.right >= paddle2Coord.left &&
    ballCoord.top >= paddle2Coord.top &&
    ballCoord.bottom <= paddle2Coord.bottom
  ) {
    xRight = false;
    absDX = generateRandomSpeed();
    absDY = generateRandomSpeed();
  }

  /* Horizontal wall collisions */
  if (
    ballCoord.left <= boardCoord.left ||
    ballCoord.right >= boardCoord.right
  ) {
    if (ballCoord.left <= boardCoord.left) {
      setPlayerScore(2, +score2.innerHTML + 1);
    } else {
      setPlayerScore(1, +score1.innerHTML + 1);
    }
    roundState = 'start';

    ballCoord = initialBallCoord;
    ball.style = initialBall.style;
    message.innerHTML = 'Press Enter to Play Pong';
    return;
  }

  const newDX = xRight ? absDX : -absDX;
  const newDY = yDown ? absDY : -absDY;
  ball.style.left = ballCoord.left + newDX + 'px';
  ball.style.top = ballCoord.top + newDY + 'px';
  ballCoord = ball.getBoundingClientRect();
  requestAnimationFrame(() => {
    moveBall(newDX, newDY);
  });
}
