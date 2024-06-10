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
const currentUrl = new URL(window.location.href);
const SERVER_URL = `${currentUrl.origin}/game`;

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
};

const setUpGame = ({ error, roomId, playerAssignment, playerId, engine }) => {
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

  // Set background
  if (engine === 'offline') {
    offlineBackgroundElement.style.visibility = 'visible';
  }
};

onload = async () => {
  // Is service worker available?
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        console.log('Service worker registered!');
      })
      .catch((error) => {
        console.warn('Error registering service worker:');
        console.warn(error);
      });
    navigator.serviceWorker.ready.then((registration) => {
      console.log('Updating service worker!');
      registration.update();
    });
  }

  const roomCode = getRoomCode();
  const playerId = Math.random().toString(36).substring(7);

  // console.log(`INTIAL ROOM CODE: ${roomCode}`);
  // console.log(roomCode ? { roomCode, playerId } : { playerId });

  const eventSource = new EventSource(
    `${SERVER_URL}/state-sse?playerId=${playerId}${roomCode ? `&roomId=${roomCode}` : ''}`,
  );

  eventSource.addEventListener('joined-room', (event) => {
    const eventData = JSON.parse(event.data);
    setUpGame(eventData);
  });

  eventSource.addEventListener('state-update', (event) => {
    const gameState = JSON.parse(event.data);
    requestAnimationFrame(() => renderGameState(gameState));
  });
};
