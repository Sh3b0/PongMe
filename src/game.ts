import {gameEnv, gameParams} from './globals';
import {gameStateType, ballType} from './types';
import {Server} from 'socket.io';

// Returns true if min <= num <= max
function between(num: number, min: number, max: number) {
  return num >= min && num <= max;
}

// Checks for collision between the ball and the wall or the player at (playerX, playerY).
// Returns true and changes ball parameters on collision, returns false otherwise.
export const collides = (ball: ballType, playerX: number, playerY: number) => {
  const player = {
    top: playerY,
    bottom: playerY + gameEnv.paddleHeight,
    left: playerX,
    right: playerX + gameEnv.paddleWidth,
  };
  const ballCenter = {
    x: ball.x + gameEnv.ballRadius,
    y: ball.y - gameEnv.ballRadius,
  };

  if (
      between(ballCenter.x, player.left, player.right) &&
      between(ballCenter.y, player.top, player.bottom)
  ) {
    const collidePoint =
        (ballCenter.y - (player.top + gameEnv.paddleHeight / 2)) /
        (gameEnv.paddleHeight / 2);
    const angle = (collidePoint * Math.PI) / 4;
    const direction = ball.x < gameEnv.tableCenter.x ? 1 : -1;
    ball.vx = Math.ceil(direction * ball.speed * Math.cos(angle));
    ball.vy = Math.ceil(ball.speed * Math.sin(angle));
    ball.speed += 1;
    return true;
  } else if (ballCenter.y <= 0 || ballCenter.y >= gameEnv.tableHeight) {
    ball.vy = -ball.vy;
    return true;
  }
  return false;
};

// Updates game on every frame
export const playGame = (io: Server, roomName: string, game: gameStateType) => {
  // Moves the ball (called on each frame)
  function moveBall() {
    game.ball.x += game.ball.vx;
    game.ball.y += game.ball.vy;
    io.to(roomName).emit('locationUpdate', {
      playerNumber: 0,
      newLocation: {x: game.ball.x, y: game.ball.y},
    });
  }

  // Checks if ball collides with wall or paddle (called on each frame).
  function collisionCheck() {
    let hit;
    if (game.ball.x < gameEnv.tableCenter.x) {
      hit = collides(game.ball, game.p2.x, game.p2.y);
    } else {
      hit = collides(game.ball, game.p1.x, game.p1.y);
    }
    if (hit) {
      io.to(roomName).emit('collision');
    }
  }

  // Prepares the table for a new round.
  function resetPositions() {
    game.ball.x = gameEnv.tableCenter.x - gameEnv.ballRadius;
    game.ball.y = gameEnv.tableCenter.y - gameEnv.ballRadius;
    game.ball.vx = gameParams.ballVelocity.x;
    game.ball.vy = gameParams.ballVelocity.y;
    game.ball.speed = gameParams.ballVelocity.v;
    game.p1.y = gameEnv.p1Location.y;
    game.p2.y = gameEnv.p2Location.y;
    io.to(roomName).emit('locationUpdate', {
      playerNumber: 0,
      newLocation: {x: game.ball.x, y: game.ball.y},
    });
    io.to(roomName).emit('locationUpdate', {
      playerNumber: 1,
      newLocation: {x: game.p1.x, y: game.p1.y},
    });
    io.to(roomName).emit('locationUpdate', {
      playerNumber: 2,
      newLocation: {x: game.p2.x, y: game.p2.y},
    });
  }

  // Pauses frame updates for "roundBreak" milliseconds
  function pauseBreak() {
    game.p1.paused = true;
    setTimeout(() => {
      game.p1.paused = false;
      resetPositions();
    }, gameParams.roundBreak);
  }

  // Updates the score and emits a scoreUpdate if any player scored (called on each frame).
  function scoreCheck() {
    const p1Scored = game.ball.x < 0;
    const p2Scored = game.ball.x + 2 * gameEnv.ballRadius > gameEnv.tableWidth;
    if (p1Scored) game.p1.score += 1;
    if (p2Scored) game.p2.score += 1;
    if (p1Scored || p2Scored) {
      io.to(roomName).emit('scoreUpdate', {
        s1: game.p1.score,
        s2: game.p2.score,
      });
      pauseBreak();
    }
  }

  // Emits a winnerUpdate when any player reaches winningScore (called on each frame)
  function winnerCheck() {
    if (game.p1.score === gameParams.winningScore) {
      io.to(roomName).emit('winnerUpdate', {winnerNumber: 1});
      game.p1.paused = true;
    } else if (game.p2.score === gameParams.winningScore) {
      io.to(roomName).emit('winnerUpdate', {winnerNumber: 2});
      game.p1.paused = true;
    }
  }

  // Game loop
  game.mainLoop = setInterval(() => {
    if (game.p1.paused || game.p2.paused) return;
    moveBall();
    collisionCheck();
    scoreCheck();
    winnerCheck();
  }, gameEnv.frameRate);
};
