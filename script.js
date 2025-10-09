const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const startButton = document.getElementById("start");
const restartButton = document.getElementById("restart");

const EASIER_FACTOR = 4;

const CONFIG = {
  gravity: 1200 / 2, // lower gravity for slower falls
  jumpVelocity: -420 / 2, // softer flap to match reduced gravity
  pipeSpacing: 210 * 2, // pipes spawn further apart
  pipeWidth: 80,
  pipeSpeed: 200 / 2, // pipes move slower across the screen
  minGap: 110 * 2, // wider minimum gap between pipes
  maxGap: 180 * 2, // wider maximum gap
  difficultyRamp: 1 - (1 - 0.985) / EASIER_FACTOR, // slower difficulty increase
};

const bird = {
  x: canvas.width * 0.28,
  y: canvas.height * 0.45,
  radius: 18,
  velocity: 0,
  rotation: 0,
  flap() {
    this.velocity = CONFIG.jumpVelocity;
  },
  update(dt) {
    this.velocity += CONFIG.gravity * dt;
    this.y += this.velocity * dt;
    this.rotation = Math.atan2(this.velocity, CONFIG.pipeSpeed);
  },
  reset() {
    this.y = canvas.height * 0.45;
    this.velocity = 0;
    this.rotation = 0;
  },
};

let pipes = [];
let score = 0;
let highScore = Number(localStorage.getItem("flappyHighScore")) || 0;
let gameState = "idle";
let lastTimestamp = 0;
let spawnTimer = 0;
let currentGap = CONFIG.maxGap;

bestEl.textContent = highScore;

function resetGame() {
  pipes = [];
  score = 0;
  currentGap = CONFIG.maxGap;
  spawnTimer = 0;
  bird.reset();
  scoreEl.textContent = score;
  bestEl.textContent = highScore;
  drawScene();
}

function startGame() {
  resetGame();
  gameState = "running";
  startButton.hidden = true;
  restartButton.hidden = true;
  lastTimestamp = 0;
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState = "gameover";
  startButton.hidden = true;
  restartButton.hidden = false;
  highScore = Math.max(highScore, score);
  localStorage.setItem("flappyHighScore", highScore);
  bestEl.textContent = highScore;
  drawScene();
  drawGameOver();
}

function createPipe() {
  const gapCenter = Math.random() * (canvas.height - currentGap - 160) + currentGap / 2 + 80;
  pipes.push({
    x: canvas.width + CONFIG.pipeWidth,
    width: CONFIG.pipeWidth,
    gapCenter,
    gapSize: currentGap,
    scored: false,
  });
  currentGap = Math.max(CONFIG.minGap, currentGap * CONFIG.difficultyRamp);
}

function updatePipes(dt) {
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.pipeSpacing / CONFIG.pipeSpeed) {
    createPipe();
    spawnTimer = 0;
  }

  pipes.forEach((pipe) => {
    pipe.x -= CONFIG.pipeSpeed * dt;
    if (!pipe.scored && pipe.x + pipe.width < bird.x - bird.radius) {
      pipe.scored = true;
      score += 1;
      scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        bestEl.textContent = highScore;
      }
    }
  });

  pipes = pipes.filter((pipe) => pipe.x + pipe.width > -10);
}

function checkCollisions() {
  if (bird.y + bird.radius >= canvas.height - 40 || bird.y - bird.radius <= 0) {
    return true;
  }

  return pipes.some((pipe) => {
    const inXRange = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width;
    if (!inXRange) return false;

    const gapTop = pipe.gapCenter - pipe.gapSize / 2;
    const gapBottom = pipe.gapCenter + pipe.gapSize / 2;

    if (bird.y - bird.radius <= gapTop || bird.y + bird.radius >= gapBottom) {
      return true;
    }
    return false;
  });
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87ceeb");
  gradient.addColorStop(0.6, "#c4f4ff");
  gradient.addColorStop(1, "#ebfaff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#83c5be";
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  ctx.fillStyle = "#2a9d8f";
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.fillStyle = "#ffb703";
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius + 2, bird.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fb8500";
  ctx.beginPath();
  ctx.ellipse(bird.radius - 8, 4, 10, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fdfdfd";
  ctx.beginPath();
  ctx.arc(8, -6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#023047";
  ctx.beginPath();
  ctx.arc(10, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPipes() {
  pipes.forEach((pipe) => {
    const topHeight = pipe.gapCenter - pipe.gapSize / 2;
    const bottomY = pipe.gapCenter + pipe.gapSize / 2;
    const bottomHeight = canvas.height - bottomY;

    ctx.fillStyle = "#8ecae6";
    ctx.fillRect(pipe.x, 0, pipe.width, topHeight);
    ctx.fillRect(pipe.x, bottomY, pipe.width, bottomHeight);

    ctx.fillStyle = "#219ebc";
    ctx.fillRect(pipe.x - 6, topHeight - 16, pipe.width + 12, 16);
    ctx.fillRect(pipe.x - 6, bottomY, pipe.width + 12, 16);
  });
}

function drawHud() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "700 28px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Best: ${highScore}`, 20, 74);

  if (gameState === "idle") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(2, 48, 71, 0.75)";
    ctx.font = "700 40px 'Segoe UI', sans-serif";
    ctx.fillText("Click Start to Play", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "400 22px 'Segoe UI', sans-serif";
    ctx.fillText("Tap space or click to flap", canvas.width / 2, canvas.height / 2 + 12);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.textAlign = "center";
  ctx.font = "700 44px 'Segoe UI', sans-serif";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = "400 24px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(2, 48, 71, 0.85)";
  ctx.fillText(`Score: ${score}  •  Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 12);
  ctx.fillText("Press Restart or Space", canvas.width / 2, canvas.height / 2 + 44);
}

function drawScene() {
  drawBackground();
  drawPipes();
  drawBird();
  drawHud();
}

function gameLoop(timestamp) {
  if (gameState !== "running") return;

  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.033);
  lastTimestamp = timestamp;

  bird.update(dt);
  updatePipes(dt);

  if (checkCollisions()) {
    endGame();
    return;
  }

  drawScene();
  requestAnimationFrame(gameLoop);
}

function handleFlap(event) {
  if (event.type === "keydown" && event.code !== "Space") return;
  event.preventDefault();

  if (gameState === "running") {
    bird.flap();
  } else if (gameState === "idle") {
    startGame();
    bird.flap();
  } else if (gameState === "gameover") {
    startGame();
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (gameState === "running") {
    bird.flap();
  } else if (gameState === "idle") {
    startGame();
    bird.flap();
  } else if (gameState === "gameover") {
    startGame();
  }
});

document.addEventListener("keydown", handleFlap);

drawScene();
