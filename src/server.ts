import {Server, Socket} from 'socket.io';
import {playGame} from './game';
import {gameStateType} from './types';
import {gameEnv, gameParams, games, gameState} from './globals';

const clients: { client: Socket; roomName: string }[] = [];

// Handle events emitted by client to socket.io server.
export function handleClient(client: Socket, io: Server) {
  function startGame(roomName: string, game: gameStateType) {
    io.to(roomName).emit('startGame', {});
    setTimeout(() => {
      playGame(io, roomName, game);
    }, gameParams.roundBreak);
  }

  function joinRoom(
      data: { playerName: string; roomName: string },
      callback: (error?: string) => void,
  ) {
    if (!data.playerName.length || !data.roomName.length) {
      callback('Player name and room name are required.');
    }
    const roomExists = games.get(data.roomName);
    let game;
    if (roomExists) {
      game = games.get(data.roomName);
      if (game.p1.name.length && game.p2.name.length) {
        callback('Room is full.');
      }
      game.p2.name = data.playerName;
    } else {
      game = JSON.parse(JSON.stringify(gameState));
      game.p1.name = data.playerName;
      games.set(data.roomName, game);
    }
    client.join(data.roomName);
    clients.push({client, roomName: data.roomName});
    io.to(data.roomName).emit('gameData', {
      playerNumber: roomExists ? 2 : 1,
      gameEnv,
      gameState: game,
    });
    if (roomExists) {
      startGame(data.roomName, game);
    }
    callback();
  }

  function movePlayer(
      data: { playerNumber: number; roomName: string; direction: number }
  ) {
    const game = games.get(data.roomName);
    if (!game) return;
    const player = data.playerNumber === 1 ? game.p1 : game.p2;
    if (data.direction === 1) {
      if (player.y - gameParams.playerSpeed > 0) {
        player.y -= gameParams.playerSpeed;
      } else {
        player.y = 0;
      }
    } else if (data.direction === -1) {
      if (
          player.y + gameEnv.paddleHeight + gameParams.playerSpeed <
          gameEnv.tableHeight
      ) {
        player.y += gameParams.playerSpeed;
      } else {
        player.y = gameEnv.tableHeight - gameEnv.paddleHeight;
      }
    }
    io.to(data.roomName).emit('locationUpdate', {
      playerNumber: data.playerNumber,
      newLocation: {x: player.x, y: player.y},
    });
  }

  function pauseGame(data: { playerNumber: number; roomName: string }) {
    if (games.get(data.roomName) === null) return;
    if (data.playerNumber === 1) {
      games.get(data.roomName).p1.paused = !games.get(data.roomName).p1.paused;
    } else {
      games.get(data.roomName).p2.paused = !games.get(data.roomName).p2.paused;
    }
    io.to(data.roomName).emit('interrupt', {code: data.playerNumber});
  }

  function disconnect() {
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].client === client) {
        const game = games.get(clients[i].roomName);
        if (game) {
          clearInterval(game.mainLoop);
        }
        games.delete(clients[i].roomName);
        io.to(clients[i].roomName).emit('interrupt', {code: 0});
        clients.splice(i, 1);
        return;
      }
    }
  }

  client.on('joinRoom', joinRoom);
  client.on('movePlayer', movePlayer);
  client.on('pauseGame', pauseGame);
  client.on('disconnect', disconnect);
}
