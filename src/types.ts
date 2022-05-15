export type gameEnvType = {
  frameRate: number;
  tableHeight: number;
  tableWidth: number;
  paddleHeight: number;
  paddleWidth: number;
  ballRadius: number;
  margin: number;
  tableCenter: {
    x: number;
    y: number;
  };
  p1Location: {
    x: number;
    y: number;
  };
  p2Location: {
    x: number;
    y: number;
  };
}
// Represents a gameState
export type gameStateType = {
  mainLoop: NodeJS.Timer | null;
  ball: ballType;
  p1: playerType;
  p2: playerType;
};

// Represents a ball
export type ballType = {
  x: number;
  y: number;
  vx: number;
  speed: number;
  vy: number;
};

// Represents a player
export type playerType = {
  name: string;
  x: number;
  y: number;
  score: number;
  paused: boolean;
};