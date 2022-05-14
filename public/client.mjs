import {io} from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const socket = io(window.location.href);
let game, player;

let userText = document.getElementById('user');
let roomText = document.getElementById('room');
let scoreText = document.getElementById('score');
let joinBtn = document.getElementById('join');
let pauseDiv = document.getElementById('pause');
let canvas = document.querySelector('canvas');
let context = canvas.getContext('2d');

class Game {
  constructor(env, state) {
    this.env = env;
    this.state = state;
  }
}

class Player {
  constructor(number, direction) {
    this.number = number;
    this.direction = direction; // 0: idle, 1: up, -1: down
  }
}

joinBtn.onclick = () => {
  console.log("Clicked");
  socket.emit("joinRoom", {playerName: userText.value, roomName: roomText.value}, (error) => {
    if (error) {
      alert(error);
    }
  });
  userText.setAttribute("disabled", "true");
  roomText.setAttribute("disabled", "true");
  joinBtn.setAttribute("disabled", "true");
};

pauseDiv.onclick = () => {
  if(!game) return;
  socket.emit("pauseGame", {playerNumber: player.number, roomName: roomText.value}, (error) => {
    if (error) {
      alert(error);
    }
  });
  if(player.number === 1) {
    game.state.p1.paused = !game.state.p1.paused;
  } else {
    game.state.p2.paused = !game.state.p2.paused;
  }
  if(pauseDiv.children[0].hasAttribute("hidden")) {
    pauseDiv.children[0].removeAttribute("hidden");
    pauseDiv.children[1].setAttribute("hidden", "hidden");
  } else {
    pauseDiv.children[1].removeAttribute("hidden");
    pauseDiv.children[0].setAttribute("hidden", "hidden");
  }
}

// handle socket events
{
  socket.on("gameData", ({playerNumber, gameEnv, gameState}) => {
    if(player) return;
    game = new Game(gameEnv, gameState);
    player = new Player(playerNumber, 0);
    if(playerNumber === 1) {
      playerNameText.textContent = game.state.p1.name;
      pausedText.textContent = game.state.p1.paused.toString();
    } else {
      playerNameText.textContent = game.state.p2.name;
      pausedText.textContent = game.state.p2.paused.toString();
    }
  });

  socket.on("startGame", () => {
    document.addEventListener('keydown', (e) => {
      if(player.direction) return;
      switch (e.key) {
        case "ArrowUp":
          player.direction = 1;
          break;
        case "ArrowDown":
          player.direction = -1;
          break;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        player.direction = 0;
      }
    });
  });

  socket.on("locationUpdate", ({playerNumber, newLocation}) => {
    switch (playerNumber) {
      case 0:
        game.state.ball.x = newLocation.x;
        game.state.ball.y = newLocation.y;
        break;
      case 1:
        game.state.p1.x = newLocation.x;
        game.state.p1.y = newLocation.y;
        break;
      case 2:
        game.state.p2.x = newLocation.x;
        game.state.p2.y = newLocation.y;
        break;
    }
  });

  socket.on("scoreUpdate", ({s1, s2}) => {
    game.state.p1.score = s1;
    game.state.p2.score = s2;
    scoreText.textContent = `${s1} - ${s2}`;
  });

  socket.on("winnerUpdate", ({winnerNumber}) => {
    if (player.number === winnerNumber) {
      alert("You Won!");
    } else {
      alert("You Lost!");
    }
    window.location = "/";
  });

  socket.on("interrupt", ({code}) => {
    switch (code) {
      case 0:
        alert("Other player disconnected");
        window.location = '/';
        break;
      case 1:
        if(player.number === 2) console.log("Other player paused");
        break;
      case 2:
        if(player.number === 1) console.log("Other player paused");
        break;
    }
  });
}

// Frontend stub
function draw_canvas() {
  if(!game) return;
  canvas.width = game.env.tableWidth;
  canvas.height = game.env.tableHeight;
  canvas.style.width = (canvas.width / 2) + 'px';
  canvas.style.height = (canvas.height / 2) + 'px';
  canvas.style.backgroundColor = '#3f526d';

  if(player.direction) {
    socket.emit("movePlayer", {playerNumber: player.number, direction: player.direction, roomName: roomText.value});
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


// Animate
let frameRate = game ? game.env.frameRate : 20;

setInterval(() => {
  draw_canvas();
}, frameRate);