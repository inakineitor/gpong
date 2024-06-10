import { FastifyInstance, FastifyRequest } from 'fastify';
import { ok, err, Result } from 'neverthrow';

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

type ObjWithDimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// check for collision between two objects using axis-aligned bounding box (AABB)
// @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function collides(obj1: ObjWithDimensions, obj2: ObjWithDimensions): boolean {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

type Vector2D = {
  x: number;
  y: number;
};

type PaddleState = {
  y: number;
  dy: number;
  score: number;
  playerId?: string;
};

type BallState = {
  position: Vector2D;
  velocity: Vector2D;
  isResetting: boolean;
};

class GameState {
  paddles: {
    left: PaddleState;
    right: PaddleState;
  } = {
    left: {
      y: PADDLE_STARTING_Y,
      dy: 0,
      score: 0,
      playerId: undefined,
    },
    right: {
      y: PADDLE_STARTING_Y,
      dy: 0,
      score: 0,
      playerId: undefined,
    },
  };
  ball: BallState = {
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

  addNewPlayer(playerId: string): Result<'left' | 'right', null> {
    if (this.paddles.left.playerId === undefined) {
      this.paddles.left.playerId = playerId;
      return ok('left');
    }
    if (this.paddles.right.playerId === undefined) {
      this.paddles.right.playerId = playerId;
      return ok('right');
    }
    return err(null);
  }

  removePlayer(playerId: string): void {
    if (this.paddles.left.playerId === playerId) {
      this.paddles.left.playerId = undefined;
    } else if (this.paddles.right.playerId === playerId) {
      this.paddles.right.playerId = undefined;
    }
  }

  isFull(): boolean {
    return (
      this.paddles.left.playerId !== undefined &&
      this.paddles.right.playerId !== undefined
    );
  }

  isEmpty(): boolean {
    return (
      this.paddles.left.playerId === undefined &&
      this.paddles.right.playerId === undefined
    );
  }

  start() {
    this.gameLoop();
  }

  gameLoop() {
    if (!this.isFull()) {
      setTimeout(() => this.gameLoop(), 17);
      return;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function gameController(fastify: FastifyInstance) {
  const roomIdToState: Record<string, GameState> = {};

  // GET /api/v1/user
  fastify.get('/', async function (_request, reply) {
    reply.send({
      enginer: 'server',
    });
  });

  fastify.get(
    '/state-sse',
    (
      request: FastifyRequest<{
        Querystring: { roomId?: string; playerId: string };
      }>,
      reply,
    ) => {
      const { playerId, roomId: requestedRoomId } = request.query;
      const roomId = requestedRoomId ?? Math.random().toString(36).substring(7);

      if (!(roomId in roomIdToState)) {
        roomIdToState[roomId] = new GameState();
      }
      const playerAssignment = roomIdToState[roomId].addNewPlayer(playerId);
      reply.sse({
        event: 'joined-room',
        data: JSON.stringify({
          error: playerAssignment.isErr() ? 'Room is full' : undefined,
          playerId,
          roomId,
          playerAssignment: playerAssignment.unwrapOr(null),
          engine: 'server',
        }),
      });

      const state = roomIdToState[roomId];

      reply.sse(
        (async function* source() {
          while (true) {
            await sleep(17);
            yield {
              event: 'state-update',
              data: JSON.stringify(state.getPlainState()),
            };
          }
        })(),
      );

      request.socket.on('close', () => {
        state.removePlayer(playerId);
        if (state.isEmpty()) {
          delete roomIdToState[roomId];
        }
        console.log('Connection closed');
      });
    },
  );

  fastify.post(
    '/movement',
    (
      request: FastifyRequest<{
        Body: {
          roomId: string;
          playerId: string;
          isStarting: boolean;
          direction: 'up' | 'down';
        };
      }>,
      reply,
    ) => {
      const { roomId, playerId, isStarting, direction } = request.body;
      const state = roomIdToState[roomId];
      if (!state) {
        reply.code(400).send({
          error: 'Room not found',
        });
        return;
      }
      if (
        state.paddles.left.playerId !== playerId &&
        state.paddles.right.playerId !== playerId
      ) {
        const leftId = state.paddles.left.playerId;
        const rightId = state.paddles.right.playerId;
        reply.code(400).send({
          error: `Player not in room: [left: ${leftId}, right: ${rightId}, requested: ${playerId}]`,
        });
        return;
      }

      const paddle =
        state.paddles.left.playerId === playerId
          ? state.paddles.left
          : state.paddles.right;

      if (isStarting) {
        if (direction === 'up') {
          paddle.dy = -PADDLE_SPEED;
        } else if (direction === 'down') {
          paddle.dy = PADDLE_SPEED;
        }
      } else {
        paddle.dy = 0;
      }

      reply.send({
        success: true,
      });
    },
  );
}
