const leftScoreElement = document.querySelector('#player-1-score');
const rightScoreElement = document.querySelector('#player-2-score');
const leftKeymapsElement = document.querySelector('#left-keymaps');
const rightKeymapsElement = document.querySelector('#right-keymaps');
const messageElement = document.querySelector('#message');
const offlineBackgroundElement = document.querySelector('#offline-background');

/* Board Dimensions */
const BOARD_WIDTH = 750;
const BOARD_HEIGHT = 585;
const GRID_SIZE = 15;

/* Game Constants */
const PADDLE_SPEED = 6;
const BALL_SPEED = 5;

/* Paddle Constants */
const PADDLE_WIDTH = GRID_SIZE * 1;
const PADDLE_HEIGHT = GRID_SIZE * 5;

const PADDLE_STARTING_Y = (BOARD_HEIGHT - PADDLE_HEIGHT) / 2;
const MAX_PADDLE_Y = BOARD_HEIGHT - GRID_SIZE - PADDLE_HEIGHT;
const LEFT_PADDLE_STARTING_X = GRID_SIZE * 2;
const RIGHT_PADDLE_STARTING_X = BOARD_WIDTH - GRID_SIZE * 3;

/* Ball Constants */
const BALL_WIDTH = GRID_SIZE;
const BALL_HEIGHT = GRID_SIZE;

const BALL_STARTING_X = BOARD_WIDTH / 2;
const BALL_STARTING_Y = BOARD_HEIGHT / 2;

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

const sendMovementUpdate = async (roomId, playerId, isStarting, direction) => {
  const res = await fetch(`${SERVER_URL}/movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId,
      playerId,
      isStarting,
      direction,
    }),
  });

  const { error } = await res.json();
  if (error) {
    console.error(error);
    return;
  }
};

/* Server Connection Logic */
const SERVER_URL = 'http://localhost:3006/game';

console.log('HELLO');

const canvas = document.getElementById('board');
const context = canvas.getContext('2d');

const renderGameState = (gameState) => {
  context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  // Draw paddles
  context.fillStyle = '#4285f4';
  context.fillRect(
    LEFT_PADDLE_STARTING_X,
    gameState.paddles.left.y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
  );
  context.fillStyle = '#ea4335';
  context.fillRect(
    RIGHT_PADDLE_STARTING_X,
    gameState.paddles.right.y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
  );

  // Draw ball
  context.fillStyle = '#fbbc05';
  context.fillRect(
    gameState.ball.position.x,
    gameState.ball.position.y,
    BALL_WIDTH,
    BALL_HEIGHT,
  );

  // Draw walls
  context.fillStyle = 'lightgrey';
  context.fillRect(0, 0, BOARD_WIDTH, GRID_SIZE);
  context.fillRect(0, BOARD_HEIGHT - GRID_SIZE, BOARD_WIDTH, BOARD_HEIGHT);

  // Draw dotted line down the middle
  for (let i = GRID_SIZE; i < BOARD_HEIGHT - GRID_SIZE; i += GRID_SIZE * 2) {
    context.fillRect(BOARD_WIDTH / 2 - GRID_SIZE / 2, i, GRID_SIZE, GRID_SIZE);
  }

  // Set message
  const waitingForPlayer =
    gameState.paddles.left.playerId === undefined ||
    gameState.paddles.right.playerId === undefined;
  const message = waitingForPlayer
    ? 'Waiting for second player'
    : 'Game Started';
  messageElement.innerHTML = message;

  // Set scores
  leftScoreElement.innerHTML = gameState.paddles.left.score;
  rightScoreElement.innerHTML = gameState.paddles.right.score;

  // Set backgournd
  if (gameState.engine === 'offline') {
    offlineBackgroundElement.style.visibility = 'visible';
  }
};

const setUpGame = ({ error, roomId, playerAssignment, playerId }) => {
  if (error) {
    alert('This room is full. However, you can expectate the game.');
    // return;
  }

  setRoomCode(roomId);

  console.log({
    playerId,
    roomId,
    playerAssignment,
  });

  const upKeyCode = playerAssignment === 'left' ? 'KeyW' : 'ArrowUp';
  const downKeyCode = playerAssignment === 'left' ? 'KeyS' : 'ArrowDown';

  if (playerAssignment === 'left') {
    leftKeymapsElement.style.visibility = 'visible';
  } else if (playerAssignment === 'right') {
    rightKeymapsElement.style.visibility = 'visible';
  }

  const makeKeyEventHandler = (isStarting) => async (event) => {
    const direction =
      event.code === upKeyCode
        ? 'up'
        : event.code === downKeyCode
          ? 'down'
          : null;
    if (!direction) return;
    await sendMovementUpdate(roomId, playerId, isStarting, direction);
  };

  // listen to keyboard events to move the paddles
  document.addEventListener('keydown', makeKeyEventHandler(true));

  // listen to keyboard events to stop the paddle if key is released
  document.addEventListener('keyup', makeKeyEventHandler(false));
};

onload = async () => {
  // Is service worker available?
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker
  //     .register('/sw.js')
  //     .then(() => {
  //       console.log('Service worker registered!');
  //     })
  //     .catch((error) => {
  //       console.warn('Error registering service worker:');
  //       console.warn(error);
  //     });
  // }

  const roomCode = getRoomCode();
  const playerId = Math.random().toString(36).substring(7);

  console.log(`INTIAL ROOM CODE: ${roomCode}`);
  console.log(roomCode ? { roomCode, playerId } : { playerId });

  // const res = await fetch(`${SERVER_URL}/join-room`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(
  //     roomCode ? { roomId: roomCode, playerId } : { playerId },
  //   ),
  // });
  //
  // const { error, roomId, playerAssignment } = await res.json();
  //
  // setUpGame({ error, roomId, playerAssignment, playerId });

  const eventSource = new EventSource(
    `${SERVER_URL}/state-sse?playerId=${playerId}${roomCode ? `&roomId=${roomCode}` : ''}`,
  );

  eventSource.addEventListener('joined-room', (event) => {
    const eventData = JSON.parse(event.data);
    setUpGame(eventData);
    // console.log('JOINED ROOM EVENT');
    // console.log(data);
  });

  eventSource.addEventListener('state-update', (event) => {
    const gameState = JSON.parse(event.data);
    requestAnimationFrame(() => renderGameState(gameState));
  });

  // const func = async () => {
  //   const gameStateRes = await fetch(`${SERVER_URL}/state?roomId=${roomId}`);
  //   const gameState = await gameStateRes.json();
  //   renderGameState(gameState);
  //
  //   requestAnimationFrame(func);
  // };
  //
  // requestAnimationFrame(func);

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
};

// onbeforeunload = () => {
//   alert('TEST TESTS');
// };

// const canvas = document.getElementById('game');
// const context = canvas.getContext('2d');
// const grid = 15;
// const paddleHeight = grid * 5; // 80
// const maxPaddleY = canvas.height - grid - paddleHeight;
//
// let paddleSpeed = 6;
// var ballSpeed = 5;
//
// const leftPaddle = {
//   // start in the middle of the game on the left side
//   x: grid * 2,
//   y: canvas.height / 2 - paddleHeight / 2,
//   width: grid,
//   height: paddleHeight,
//
//   // paddle velocity
//   dy: 0,
// };
// const rightPaddle = {
//   // start in the middle of the game on the right side
//   x: canvas.width - grid * 3,
//   y: canvas.height / 2 - paddleHeight / 2,
//   width: grid,
//   height: paddleHeight,
//
//   // paddle velocity
//   dy: 0,
// };
// const ball = {
//   // start in the middle of the game
//   x: canvas.width / 2,
//   y: canvas.height / 2,
//   width: grid,
//   height: grid,
//
//   // keep track of when need to reset the ball position
//   resetting: false,
//
//   // ball velocity (start going to the top-right corner)
//   dx: ballSpeed,
//   dy: -ballSpeed,
// };
//
// // check for collision between two objects using axis-aligned bounding box (AABB)
// // @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
// function collides(obj1, obj2) {
//   return (
//     obj1.x < obj2.x + obj2.width &&
//     obj1.x + obj1.width > obj2.x &&
//     obj1.y < obj2.y + obj2.height &&
//     obj1.y + obj1.height > obj2.y
//   );
// }
//
// // game loop
// function loop() {
//   requestAnimationFrame(loop);
//   context.clearRect(0, 0, canvas.width, canvas.height);
//
//   // move paddles by their velocity
//   leftPaddle.y += leftPaddle.dy;
//   rightPaddle.y += rightPaddle.dy;
//
//   // prevent paddles from going through walls
//   if (leftPaddle.y < grid) {
//     leftPaddle.y = grid;
//   } else if (leftPaddle.y > maxPaddleY) {
//     leftPaddle.y = maxPaddleY;
//   }
//
//   if (rightPaddle.y < grid) {
//     rightPaddle.y = grid;
//   } else if (rightPaddle.y > maxPaddleY) {
//     rightPaddle.y = maxPaddleY;
//   }
//
//   // draw paddles
//   context.fillStyle = 'white';
//   context.fillRect(
//     leftPaddle.x,
//     leftPaddle.y,
//     leftPaddle.width,
//     leftPaddle.height,
//   );
//   context.fillRect(
//     rightPaddle.x,
//     rightPaddle.y,
//     rightPaddle.width,
//     rightPaddle.height,
//   );
//
//   // move ball by its velocity
//   ball.x += ball.dx;
//   ball.y += ball.dy;
//
//   // prevent ball from going through walls by changing its velocity
//   if (ball.y < grid) {
//     ball.y = grid;
//     ball.dy *= -1;
//   } else if (ball.y + grid > canvas.height - grid) {
//     ball.y = canvas.height - grid * 2;
//     ball.dy *= -1;
//   }
//
//   // reset ball if it goes past paddle (but only if we haven't already done so)
//   if ((ball.x < 0 || ball.x > canvas.width) && !ball.resetting) {
//     ball.resetting = true;
//
//     if (ball.x > canvas.width) {
//       console.log('Player 1 scored!');
//     } else if (ball.x < 0) {
//       console.log('Player 2 scored!');
//     }
//
//     // give some time for the player to recover before launching the ball again
//     setTimeout(() => {
//       ball.resetting = false;
//       ball.x = canvas.width / 2;
//       ball.y = canvas.height / 2;
//     }, 600);
//   }
//
//   // check to see if ball collides with paddle. if they do change x velocity
//   if (collides(ball, leftPaddle)) {
//     ball.dx *= -1;
//
//     // move ball next to the paddle otherwise the collision will happen again
//     // in the next frame
//     ball.x = leftPaddle.x + leftPaddle.width;
//   } else if (collides(ball, rightPaddle)) {
//     ball.dx *= -1;
//
//     // move ball next to the paddle otherwise the collision will happen again
//     // in the next frame
//     ball.x = rightPaddle.x - ball.width;
//   }
//
//   // draw ball
//   context.fillRect(ball.x, ball.y, ball.width, ball.height);
//
//   // draw walls
//   context.fillStyle = 'lightgrey';
//   context.fillRect(0, 0, canvas.width, grid);
//   context.fillRect(0, canvas.height - grid, canvas.width, canvas.height);
//
//   // draw dotted line down the middle
//   for (let i = grid; i < canvas.height - grid; i += grid * 2) {
//     context.fillRect(canvas.width / 2 - grid / 2, i, grid, grid);
//   }
// }
//
// // listen to keyboard events to move the paddles
// document.addEventListener('keydown', function (e) {
//   if (e.code === 'ArrowUp') {
//     rightPaddle.dy = -paddleSpeed;
//   } else if (e.code === 'ArrowDown') {
//     rightPaddle.dy = paddleSpeed;
//   }
//
//   if (e.code === 'KeyW') {
//     leftPaddle.dy = -paddleSpeed;
//   } else if (e.code === 'KeyS') {
//     leftPaddle.dy = paddleSpeed;
//   }
// });
//
// // listen to keyboard events to stop the paddle if key is released
// document.addEventListener('keyup', function (e) {
//   if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
//     rightPaddle.dy = 0;
//   }
//
//   if (e.code === 'KeyW' || e.code === 'KeyS') {
//     leftPaddle.dy = 0;
//   }
// });
//
// // start the game
// requestAnimationFrame(loop);
