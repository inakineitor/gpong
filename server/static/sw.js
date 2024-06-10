// importScripts('/streaming-utils.js', '/game-utils.js');

// ===========================================================

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

// check for collision between two objects using axis-aligned bounding box (AABB)
// @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function collides(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

class GameState {
  paddles = {
    left: {
      y: PADDLE_STARTING_Y,
      dy: 0,
      score: 0,
      playerId: 'current_player',
    },
    right: {
      y: PADDLE_STARTING_Y,
      dy: 0,
      score: 0,
      playerId: 'offline_bot',
    },
  };
  ball = {
    position: {
      x: BALL_STARTING_X,
      y: BALL_STARTING_Y,
    },
    velocity: {
      x: BALL_SPEED,
      y: BALL_SPEED,
    },
    isResetting: false,
  };
  engine = 'offline';

  constructor() {
    this.start();
  }

  start() {
    this.gameLoop();
  }

  gameLoop() {
    if (this.paddles.right.y !== this.ball.position.y) {
      this.paddles.right.dy =
        this.paddles.right.y < this.ball.position.y
          ? PADDLE_SPEED / 2
          : -PADDLE_SPEED / 2;
    }

    // Move paddles by their velocity
    this.paddles.left.y += this.paddles.left.dy;
    this.paddles.right.y += this.paddles.right.dy;

    // Prevent paddles from going through walls
    if (this.paddles.left.y < GRID_SIZE) {
      this.paddles.left.y = GRID_SIZE;
    } else if (this.paddles.left.y > MAX_PADDLE_Y) {
      this.paddles.left.y = MAX_PADDLE_Y;
    }

    if (this.paddles.right.y < GRID_SIZE) {
      this.paddles.right.y = GRID_SIZE;
    } else if (this.paddles.right.y > MAX_PADDLE_Y) {
      this.paddles.right.y = MAX_PADDLE_Y;
    }

    // Move ball by its velocity
    this.ball.position.x += this.ball.velocity.x;
    this.ball.position.y += this.ball.velocity.y;

    // Prevent ball from going through walls by changing its velocity
    if (this.ball.position.y < GRID_SIZE) {
      this.ball.position.y = GRID_SIZE;
      this.ball.velocity.y *= -1;
    } else if (this.ball.position.y > BOARD_HEIGHT - GRID_SIZE) {
      this.ball.position.y = BOARD_HEIGHT - GRID_SIZE * 2;
      this.ball.velocity.y *= -1;
    }

    // Reset ball if it goes past paddle (but only if we haven't already done so)
    if (
      (this.ball.position.x < 0 || this.ball.position.x > BOARD_WIDTH) &&
      !this.ball.isResetting
    ) {
      this.ball.isResetting = true;

      if (this.ball.position.x > BOARD_WIDTH) {
        this.paddles.left.score += 1;
      } else if (this.ball.position.x < 0) {
        this.paddles.right.score += 1;
      }

      // Give some time for the player to recover before launching the ball again
      setTimeout(() => {
        this.ball.isResetting = false;
        this.ball.position.x = BOARD_WIDTH / 2;
        this.ball.position.y = BOARD_HEIGHT / 2;
      }, 600);
    }

    const ballDimensions = {
      x: this.ball.position.x,
      y: this.ball.position.y,
      width: BALL_WIDTH,
      height: BALL_HEIGHT,
    };
    const leftPaddleDimensions = {
      x: LEFT_PADDLE_STARTING_X,
      y: this.paddles.left.y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };
    const rightPaddleDimensions = {
      x: BOARD_WIDTH - LEFT_PADDLE_STARTING_X,
      y: this.paddles.right.y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    // check to see if ball collides with paddle. if they do change x velocity
    if (collides(ballDimensions, leftPaddleDimensions)) {
      this.ball.velocity.x *= -1;

      // move ball next to the paddle otherwise the collision will happen again
      // in the next frame
      this.ball.position.x = LEFT_PADDLE_STARTING_X + PADDLE_WIDTH;
    } else if (collides(ballDimensions, rightPaddleDimensions)) {
      this.ball.velocity.x *= -1;

      // move ball next to the paddle otherwise the collision will happen again
      // in the next frame
      this.ball.position.x = RIGHT_PADDLE_STARTING_X - BALL_WIDTH;
    }
    setTimeout(() => this.gameLoop(), 17);
  }

  getPlainState() {
    return {
      paddles: this.paddles,
      ball: this.ball,
      engine: this.engine,
    };
  }
}

// ===========================================================

const textEncoder = new TextEncoder();
const eventToString = (obj) => {
  return textEncoder.encode(
    `event: ${obj.event}\ndata: ${JSON.stringify(obj.data)}\n\n`,
  );
};

// ===========================================================

const cacheKey = 'PongCache_v1';

// Assets to precache
const precachedAssets = [
  '/fonts/bit5x3/bit5x3.ttf',
  '/fonts/bit5x3/bit5x3.woff',
  '/fonts/bit5x3/bit5x3.woff2',
  '/game.html',
  '/index.js',
  '/style.css',
];

self.addEventListener('install', (event) => {
  console.log('I HAVE BEEN INSTALLED');

  // Precache assets on install
  event.waitUntil(
    caches.open(cacheKey).then((cache) => {
      return cache.addAll(precachedAssets);
    }),
  );
});

self.addEventListener('activate', (event) => {
  console.log('I HAVE BEEN ACTIVATED');

  // Specify allowed cache keys
  const cacheAllowList = [cacheKey];

  // Get all the currently active `Cache` instances.
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete all caches that aren't in the allow list:
      return Promise.all(
        keys.map((key) => {
          if (!cacheAllowList.includes(key)) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
});

let gameState;
self.addEventListener('fetch', (event) => {
  // Is this one of our precached assets?
  const url = new URL(event.request.url);
  const strippedUrl = url.href.split('?')[0];
  const isPrecachedRequest = precachedAssets.includes(url.pathname);

  console.log(
    `INSPECTED REQUEST: ${url.href}${isPrecachedRequest ? ' (PRECACHED)' : ''}`,
  );

  if (isPrecachedRequest) {
    console.log(url);
    // // Grab the precached asset from the cache
    // event.respondWith(
    //   caches.open(cacheKey).then((cache) => {
    //     return cache.match(strippedUrl);
    //   }),
    // );
    // Open the cache
    event.respondWith(
      caches.open(cacheKey).then(async (cache) => {
        // Go to the network first
        return fetch(event.request.url)
          .then((fetchedResponse) => {
            cache.put(event.request, fetchedResponse.clone());

            return fetchedResponse;
          })
          .catch(() => {
            // If the network is unavailable, get
            return cache.match(strippedUrl);
          });
      }),
    );
  } else if (url.pathname === '/game/state-sse') {
    event.respondWith(
      fetch(event.request.url).catch(() => {
        const playerId = url.searchParams.get('playerId');
        const joinedRoomEvent = {
          event: 'joined-room',
          data: {
            playerId,
            roomId: 'offline',
            playerAssignment: 'left',
            engine: 'offline',
          },
        };
        const headers = new Headers({
          // 'X-Accel-Buffering': 'no',
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });
        if (!gameState) {
          gameState = new GameState();
        }
        const getCurrentStateEvent = () =>
          eventToString({
            event: 'state-update',
            data: gameState.getPlainState(),
          });
        let interval;
        const responseStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(eventToString(joinedRoomEvent));

            interval = setInterval(() => {
              controller.enqueue(getCurrentStateEvent());
            }, 17);
          },
          cancel(controller) {
            clearInterval(interval);
            controller.enqueue(eventToString({ event: 'close' }));
            controller.close();
          },
        });
        const response = new Response(responseStream, {
          headers,
        });
        return response;
      }),
    );
  } else if (url.pathname === '/game/movement') {
    const bodyContent = new Response(event.request.body)
      .json()
      .then(({ isStarting, direction }) => {
        if (!gameState) return;
        const paddle = gameState.paddles.left;
        if (isStarting) {
          if (direction === 'up') {
            paddle.dy = -PADDLE_SPEED;
          } else if (direction === 'down') {
            paddle.dy = PADDLE_SPEED;
          }
        } else {
          paddle.dy = 0;
        }
      });
  } else {
    console.log(url);
    // Go to the network
    return;
  }
});
