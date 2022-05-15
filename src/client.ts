import {io} from 'socket.io-client';
import {gameEnvType, gameStateType} from './types';

const socket = io(window.location.href);
const playerInput = <HTMLInputElement>document.getElementById('user')!;
const roomInput = <HTMLInputElement>document.getElementById('room')!;
const scoreSpan = document.getElementById('score')!;
const joinBtn = document.getElementById('join')!;
const pauseDiv = document.getElementById('pause')!;
const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;

class Game {
  env: gameEnvType;
  state: gameStateType;

  constructor(env: gameEnvType, state: gameStateType) {
    this.env = env;
    this.state = state;
  }
}

class Player {
  number: number;
  direction: number;

  constructor(number: number, direction: number) {
    this.number = number;
    this.direction = direction; // 0: idle, 1: up, -1: down
  }
}

let game: Game, player: Player;

joinBtn.onclick = () => {
  socket.emit('joinRoom', {playerName: playerInput.value, roomName: roomInput.value}, (error: string) => {
    if (error) {
      alert(error);
    }
  });
  playerInput.setAttribute('disabled', 'true');
  roomInput.setAttribute('disabled', 'true');
  joinBtn.setAttribute('disabled', 'true');
};

pauseDiv.onclick = () => {
  if (!game) return;
  socket.emit('pauseGame', {playerNumber: player.number, roomName: roomInput.value}, (error: string) => {
    if (error) {
      alert(error);
    }
  });
  if (player.number === 1) {
    game.state.p1.paused = !game.state.p1.paused;
  } else {
    game.state.p2.paused = !game.state.p2.paused;
  }
  if (pauseDiv.children[0].hasAttribute('hidden')) {
    pauseDiv.children[0].removeAttribute('hidden');
    pauseDiv.children[1].setAttribute('hidden', 'hidden');
  } else {
    pauseDiv.children[1].removeAttribute('hidden');
    pauseDiv.children[0].setAttribute('hidden', 'hidden');
  }
}

// handle socket events
{
  socket.on('gameData', (data: { playerNumber: number; gameEnv: gameEnvType; gameState: gameStateType }) => {
    if (player) return;
    game = new Game(data.gameEnv, data.gameState);
    player = new Player(data.playerNumber, 0);
    setInterval(() => {
      draw_canvas();
    }, data.gameEnv.frameRate);
  });

  socket.on('startGame', () => {
    document.addEventListener('keydown', (e) => {
      if (player.direction) return;
      switch (e.key) {
        case 'ArrowUp':
          player.direction = 1;
          break;
        case 'ArrowDown':
          player.direction = -1;
          break;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        player.direction = 0;
      }
    });
  });

  socket.on('locationUpdate', (data: { playerNumber: number; newLocation: { x: number; y: number } }) => {
    switch (data.playerNumber) {
      case 0:
        game.state.ball.x = data.newLocation.x;
        game.state.ball.y = data.newLocation.y;
        break;
      case 1:
        game.state.p1.x = data.newLocation.x;
        game.state.p1.y = data.newLocation.y;
        break;
      case 2:
        game.state.p2.x = data.newLocation.x;
        game.state.p2.y = data.newLocation.y;
        break;
    }
  });

  socket.on('scoreUpdate', (data: { s1: number; s2: number }) => {
    game.state.p1.score = data.s1;
    game.state.p2.score = data.s2;
    scoreSpan.textContent = `${data.s1} - ${data.s2}`;
  });

  socket.on('winnerUpdate', (data: { winnerNumber: number }) => {
    if (player.number === data.winnerNumber) {
      alert('You Won!');
    } else {
      alert('You Lost!');
    }
    window.location.href = '/';
  });

  socket.on('interrupt', (data: { code: number }) => {
    switch (data.code) {
      case 0:
        alert('Other player disconnected');
        window.location.href = '/';
        break;
      case 1:
        if (player.number === 2) console.log('Other player paused');
        break;
      case 2:
        if (player.number === 1) console.log('Other player paused');
        break;
    }
  });
}

function draw_canvas() {
  if (!game) return;
  canvas.width = game.env.tableWidth;
  canvas.height = game.env.tableHeight;
  canvas.style.width = (canvas.width / 2) + 'px';
  canvas.style.height = (canvas.height / 2) + 'px';
  canvas.style.backgroundColor = '#3f526d';

  if (player.direction) {
    socket.emit('movePlayer', {playerNumber: player.number, direction: player.direction, roomName: roomInput.value});
  }

  // Clear canvas
  context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
  );

  context.fillStyle = 'white';

  // Draw player 1
  context.fillRect(
      game.state.p1.x,
      game.state.p1.y,
      game.env.paddleWidth,
      game.env.paddleHeight,
  );

  // Draw player 2
  context.fillRect(
      game.state.p2.x,
      game.state.p2.y,
      game.env.paddleWidth,
      game.env.paddleHeight,
  );

  // Draw Ball
  context.beginPath();
  context.arc(
      game.state.ball.x,
      game.state.ball.y,
      game.env.ballRadius,
      0,
      2 * Math.PI
  );
  context.fill();
}
