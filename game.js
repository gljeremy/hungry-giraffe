const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("Canvas 2D context is unavailable in this browser.");
}

const scoreValue = document.getElementById("score");
const leavesValue = document.getElementById("leaves-eaten");
const applesValue = document.getElementById("apples-hit");
const healthValue = document.getElementById("health-value");
const sicknessValue = document.getElementById("sickness-value");
const healthFill = document.getElementById("health-fill");
const sicknessFill = document.getElementById("sickness-fill");
const statusBanner = document.getElementById("status-banner");
const restartButton = document.getElementById("restart-button");
const levelReadout = document.getElementById("level-readout");
const phaseReadout = document.getElementById("phase-readout");
const bossPanel = document.getElementById("boss-panel");
const bossHealthValue = document.getElementById("boss-health-value");
const bossHealthFill = document.getElementById("boss-health-fill");
const bossGiraffeValue = document.getElementById("boss-giraffe-value");
const bossGiraffeFill = document.getElementById("boss-giraffe-fill");

const LEVEL_DURATION = 15;

const stage = {
  width: canvas.width,
  height: canvas.height,
  groundY: canvas.height - 68
};

const input = {
  left: false,
  right: false,
  jumpQueued: false,
  shootQueued: false
};

const state = {
  giraffe: null,
  items: [],
  squirrels: [],
  powerUps: [],
  giraffeBullets: [],
  elephantBullets: [],
  boss: null,
  spawnTimer: 0,
  squirrelSpawnTimer: 0,
  powerUpSpawnTimer: 0,
  score: 0,
  health: 65,
  leavesEaten: 0,
  applesHit: 0,
  running: true,
  time: 0,
  invincibilityTimer: 0,
  level: 1,
  phase: "level",
  phaseTimeRemaining: LEVEL_DURATION
};

function createGiraffe() {
  const height = 154;

  return {
    x: stage.width / 2 - 34,
    y: stage.groundY - height,
    baseY: stage.groundY - height,
    width: 68,
    height,
    speed: 360,
    velocityY: 0,
    gravity: 1700,
    jumpStrength: 760,
    onGround: true,
    fallenTimer: 0
  };
}

function clearLevelEntities() {
  state.items = [];
  state.squirrels = [];
  state.powerUps = [];
  state.giraffeBullets = [];
  state.elephantBullets = [];
  state.spawnTimer = 0;
  state.squirrelSpawnTimer = 0;
  state.powerUpSpawnTimer = 0;
  state.invincibilityTimer = 0;
  state.boss = null;
}

function resetGiraffePosition() {
  const giraffe = state.giraffe;
  giraffe.x = stage.width / 2 - giraffe.width / 2;
  giraffe.y = giraffe.baseY;
  giraffe.velocityY = 0;
  giraffe.onGround = true;
  giraffe.fallenTimer = 0;
}

function startLevel(levelNumber, isFreshGame = false) {
  state.level = levelNumber;
  state.phase = "level";
  state.phaseTimeRemaining = LEVEL_DURATION;
  clearLevelEntities();
  resetGiraffePosition();

  if (isFreshGame) {
    state.health = 65;
  } else {
    state.health = Math.min(100, state.health + 12);
  }

  statusBanner.textContent = `Level ${state.level}: survive 15 seconds, then face the elephant boss.`;
  updateHud();
}

function startBossFight() {
  state.phase = "boss";
  state.phaseTimeRemaining = 0;
  state.items = [];
  state.squirrels = [];
  state.powerUps = [];
  state.giraffeBullets = [];
  state.elephantBullets = [];
  state.invincibilityTimer = 0;
  resetGiraffePosition();

  state.boss = {
    x: stage.width - 208,
    y: 108,
    width: 168,
    height: 118,
    health: 100,
    maxHealth: 100,
    giraffeHealth: 50,
    maxGiraffeHealth: 50,
    shootTimer: 0,
    shootInterval: Math.max(0.8, 1.65 - (state.level - 1) * 0.08)
  };

  statusBanner.textContent = "Boss fight! Shoot with F or Enter and dodge the elephant's blasts.";
  updateHud();
}

function resetGame() {
  state.giraffe = createGiraffe();
  state.score = 0;
  state.leavesEaten = 0;
  state.applesHit = 0;
  state.running = true;
  state.time = 0;
  startLevel(1, true);
}

function updateHud() {
  const health = Math.max(0, Math.min(100, state.health));
  const sickness = 100 - health;

  scoreValue.textContent = String(state.score);
  leavesValue.textContent = String(state.leavesEaten);
  applesValue.textContent = String(state.applesHit);
  healthValue.textContent = `${Math.round(health)}%`;
  sicknessValue.textContent = `${Math.round(sickness)}%`;
  healthFill.style.width = `${health}%`;
  sicknessFill.style.width = `${sickness}%`;

  levelReadout.textContent = `Level ${state.level}`;
  phaseReadout.textContent = state.phase === "boss"
    ? "Boss fight"
    : `${Math.max(0, Math.ceil(state.phaseTimeRemaining))}s until boss`;

  if (state.phase === "boss" && state.boss) {
    bossPanel.classList.remove("hidden");
    bossHealthValue.textContent = `${state.boss.health} / ${state.boss.maxHealth}`;
    bossHealthFill.style.width = `${(state.boss.health / state.boss.maxHealth) * 100}%`;
    bossGiraffeValue.textContent = `${state.boss.giraffeHealth} / ${state.boss.maxGiraffeHealth}`;
    bossGiraffeFill.style.width = `${(state.boss.giraffeHealth / state.boss.maxGiraffeHealth) * 100}%`;
  } else {
    bossPanel.classList.add("hidden");
    bossHealthFill.style.width = "0%";
    bossGiraffeFill.style.width = "0%";
  }
}

function addItem() {
  const isLeaf = Math.random() < 0.7;
  const levelBoost = (state.level - 1) * 20;
  const size = isLeaf ? 32 : 40;

  state.items.push({
    type: isLeaf ? "leaf" : "apple",
    x: 26 + Math.random() * (stage.width - 52 - size),
    y: -size,
    width: size,
    height: size,
    speed: 160 + levelBoost + Math.random() * 120
  });
}

function addSquirrel() {
  state.squirrels.push({
    x: stage.width + 50,
    y: stage.groundY - 26,
    width: 44,
    height: 26,
    speed: 125 + (state.level - 1) * 16 + Math.random() * 45,
    phase: Math.random() * Math.PI * 2
  });
}

function addPowerUp() {
  state.powerUps.push({
    x: 40 + Math.random() * (stage.width - 80),
    y: -28,
    width: 28,
    height: 28,
    speed: 145 + (state.level - 1) * 6
  });
}

function endGame(message = "The giraffe is too sick. Press restart to try again.") {
  state.running = false;
  statusBanner.textContent = message;
}

function getGiraffeBounds() {
  const giraffe = state.giraffe;

  if (giraffe.fallenTimer > 0) {
    return {
      x: giraffe.x + 2,
      y: giraffe.baseY + giraffe.height - 66,
      width: giraffe.height - 12,
      height: giraffe.width - 8
    };
  }

  return {
    x: giraffe.x + 10,
    y: giraffe.y + 4,
    width: giraffe.width - 18,
    height: giraffe.height - 4
  };
}

function getBossBounds() {
  if (!state.boss) {
    return null;
  }

  return {
    x: state.boss.x + 18,
    y: state.boss.y + 8,
    width: state.boss.width - 26,
    height: state.boss.height - 8
  };
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function handleItemCollision(item) {
  if (item.type === "leaf") {
    state.health = Math.min(100, state.health + 12);
    state.score += 10;
    state.leavesEaten += 1;
    statusBanner.textContent = "Crunch! The giraffe feels stronger after eating a leaf.";
    return;
  }

  state.health = Math.max(0, state.health - 18);
  state.applesHit += 1;
  statusBanner.textContent = "Oof! Apple hit. The giraffe feels a little sicker.";
}

function jumpGiraffe() {
  const giraffe = state.giraffe;

  if (!giraffe.onGround || giraffe.fallenTimer > 0 || state.phase !== "level") {
    return;
  }

  giraffe.velocityY = -giraffe.jumpStrength;
  giraffe.onGround = false;
  statusBanner.textContent = "Boing! Hop over the squirrels.";
}

function knockDownGiraffe() {
  const giraffe = state.giraffe;

  giraffe.fallenTimer = 2;
  giraffe.velocityY = 0;
  giraffe.y = giraffe.baseY;
  giraffe.onGround = true;
  statusBanner.textContent = "Oops! A squirrel tripped the giraffe for 2 seconds.";
}

function collectPowerUp() {
  state.invincibilityTimer = 3;
  statusBanner.textContent = "Invincibility power! Squirrels cannot knock the giraffe down for 3 seconds.";
}

function fireGiraffeBullet() {
  const giraffe = state.giraffe;

  if (state.phase !== "boss" || !state.boss) {
    return;
  }

  state.giraffeBullets.push({
    x: giraffe.x + giraffe.width - 6,
    y: giraffe.y + 34,
    width: 18,
    height: 6,
    velocityX: 440,
    velocityY: -180
  });

  statusBanner.textContent = "Zap! Keep shooting the elephant boss.";
}

function fireElephantBullet() {
  if (!state.boss) {
    return;
  }

  const giraffeBounds = getGiraffeBounds();
  const startX = state.boss.x + 20;
  const startY = state.boss.y + 56;
  const targetX = giraffeBounds.x + giraffeBounds.width / 2;
  const targetY = giraffeBounds.y + giraffeBounds.height / 2;
  const distanceX = targetX - startX;
  const distanceY = targetY - startY;
  const length = Math.hypot(distanceX, distanceY) || 1;
  const bulletSpeed = 250 + (state.level - 1) * 18;

  state.elephantBullets.push({
    x: startX - 6,
    y: startY - 6,
    width: 12,
    height: 12,
    velocityX: (distanceX / length) * bulletSpeed,
    velocityY: (distanceY / length) * bulletSpeed
  });
}

function updateGiraffeMotion(deltaSeconds, allowJump) {
  const giraffe = state.giraffe;

  if (giraffe.fallenTimer > 0) {
    giraffe.fallenTimer = Math.max(0, giraffe.fallenTimer - deltaSeconds);

    if (giraffe.fallenTimer === 0) {
      statusBanner.textContent = "Back on your feet! Keep moving.";
    }
  } else {
    if (allowJump && input.jumpQueued) {
      jumpGiraffe();
    }

    if (input.left) {
      giraffe.x -= giraffe.speed * deltaSeconds;
    }

    if (input.right) {
      giraffe.x += giraffe.speed * deltaSeconds;
    }
  }

  if (!giraffe.onGround) {
    giraffe.velocityY += giraffe.gravity * deltaSeconds;
    giraffe.y += giraffe.velocityY * deltaSeconds;

    if (giraffe.y >= giraffe.baseY) {
      giraffe.y = giraffe.baseY;
      giraffe.velocityY = 0;
      giraffe.onGround = true;
    }
  }

  giraffe.x = Math.max(12, Math.min(stage.width - giraffe.width - 12, giraffe.x));
}

function updateLevelPhase(deltaSeconds) {
  state.phaseTimeRemaining = Math.max(0, state.phaseTimeRemaining - deltaSeconds);
  state.health = Math.max(0, state.health - deltaSeconds * 3.8);

  if (state.invincibilityTimer > 0) {
    state.invincibilityTimer = Math.max(0, state.invincibilityTimer - deltaSeconds);

    if (state.invincibilityTimer === 0) {
      statusBanner.textContent = "The invincibility power faded. Watch for squirrels.";
    }
  }

  updateGiraffeMotion(deltaSeconds, true);

  const levelElapsed = LEVEL_DURATION - state.phaseTimeRemaining;
  const spawnInterval = Math.max(0.22, 0.74 - levelElapsed * 0.02 - (state.level - 1) * 0.05);
  state.spawnTimer += deltaSeconds;

  while (state.spawnTimer >= spawnInterval) {
    state.spawnTimer -= spawnInterval;
    addItem();
  }

  if (levelElapsed > 6) {
    const squirrelInterval = Math.max(1.15, 2.9 - (levelElapsed - 6) * 0.14 - (state.level - 1) * 0.12);
    state.squirrelSpawnTimer += deltaSeconds;
    state.powerUpSpawnTimer += deltaSeconds;

    while (state.squirrelSpawnTimer >= squirrelInterval) {
      state.squirrelSpawnTimer -= squirrelInterval;
      addSquirrel();
    }

    const powerUpInterval = Math.max(4.8, 6.4 - (state.level - 1) * 0.2);
    while (state.powerUpSpawnTimer >= powerUpInterval) {
      state.powerUpSpawnTimer -= powerUpInterval;

      if (state.powerUps.length < 1) {
        addPowerUp();
      }
    }
  } else {
    state.squirrelSpawnTimer = 0;
    state.powerUpSpawnTimer = 0;
  }

  const giraffeBounds = getGiraffeBounds();
  const remainingItems = [];

  for (const item of state.items) {
    item.y += item.speed * deltaSeconds;

    if (intersects(item, giraffeBounds)) {
      handleItemCollision(item);
      continue;
    }

    if (item.y > stage.height + item.height) {
      if (item.type === "leaf") {
        state.health = Math.max(0, state.health - 3);
      }
      continue;
    }

    remainingItems.push(item);
  }

  state.items = remainingItems;

  const remainingPowerUps = [];

  for (const powerUp of state.powerUps) {
    powerUp.y += powerUp.speed * deltaSeconds;

    if (intersects(powerUp, giraffeBounds)) {
      collectPowerUp();
      continue;
    }

    if (powerUp.y > stage.height + powerUp.height) {
      continue;
    }

    remainingPowerUps.push(powerUp);
  }

  state.powerUps = remainingPowerUps;

  const remainingSquirrels = [];

  for (const squirrel of state.squirrels) {
    squirrel.x -= squirrel.speed * deltaSeconds;

    if (state.invincibilityTimer <= 0 && state.giraffe.fallenTimer <= 0 && intersects(squirrel, giraffeBounds)) {
      knockDownGiraffe();
      continue;
    }

    if (squirrel.x + squirrel.width < -20) {
      continue;
    }

    remainingSquirrels.push(squirrel);
  }

  state.squirrels = remainingSquirrels;

  if (state.health <= 0) {
    endGame("The giraffe got too sick before reaching the boss.");
    return;
  }

  if (state.phaseTimeRemaining === 0) {
    startBossFight();
  }
}

function updateBossPhase(deltaSeconds) {
  updateGiraffeMotion(deltaSeconds, false);

  if (input.shootQueued) {
    fireGiraffeBullet();
  }

  const bossBounds = getBossBounds();
  const giraffeBounds = getGiraffeBounds();

  state.boss.shootTimer += deltaSeconds;

  if (state.boss.shootTimer >= state.boss.shootInterval) {
    state.boss.shootTimer = 0;
    fireElephantBullet();
  }

  const remainingGiraffeBullets = [];

  for (const bullet of state.giraffeBullets) {
    bullet.x += bullet.velocityX * deltaSeconds;
    bullet.y += bullet.velocityY * deltaSeconds;

    if (bossBounds && intersects(bullet, bossBounds)) {
      state.boss.health = Math.max(0, state.boss.health - 10);
      state.score += 20;
      continue;
    }

    if (bullet.x > stage.width + 20 || bullet.y < -20) {
      continue;
    }

    remainingGiraffeBullets.push(bullet);
  }

  state.giraffeBullets = remainingGiraffeBullets;

  const remainingElephantBullets = [];

  for (const bullet of state.elephantBullets) {
    bullet.x += bullet.velocityX * deltaSeconds;
    bullet.y += bullet.velocityY * deltaSeconds;

    if (intersects(bullet, giraffeBounds)) {
      state.boss.giraffeHealth = Math.max(0, state.boss.giraffeHealth - 5);
      statusBanner.textContent = "The elephant blasted the giraffe!";
      continue;
    }

    if (
      bullet.x < -20 ||
      bullet.x > stage.width + 20 ||
      bullet.y < -20 ||
      bullet.y > stage.height + 20
    ) {
      continue;
    }

    remainingElephantBullets.push(bullet);
  }

  state.elephantBullets = remainingElephantBullets;

  if (state.boss.health <= 0) {
    state.score += 100;
    startLevel(state.level + 1);
    return;
  }

  if (state.boss.giraffeHealth <= 0) {
    endGame("The elephant boss won the battle. Press restart to try again.");
  }
}

function update(deltaSeconds) {
  if (!state.running) {
    return;
  }

  state.time += deltaSeconds;

  if (state.phase === "level") {
    updateLevelPhase(deltaSeconds);
  } else {
    updateBossPhase(deltaSeconds);
  }

  input.jumpQueued = false;
  input.shootQueued = false;
  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, stage.width, stage.height);

  ctx.fillStyle = state.phase === "boss" ? "#9fc8e2" : "#a5dcff";
  ctx.fillRect(0, 0, stage.width, stage.groundY);

  ctx.save();
  ctx.translate(stage.width - 72, 72);
  ctx.fillStyle = "#ffd44d";
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f4b728";
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 36, Math.sin(angle) * 36);
    ctx.lineTo(Math.cos(angle) * 52, Math.sin(angle) * 52);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  for (const [x, y, w] of [
    [96, 72, 84],
    [266, 110, 96],
    [540, 76, 104],
    [688, 122, 78]
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, w * 0.18, 0, Math.PI * 2);
    ctx.arc(x + w * 0.22, y - 10, w * 0.24, 0, Math.PI * 2);
    ctx.arc(x + w * 0.44, y, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f7f3cb";
  ctx.fillRect(0, stage.groundY, stage.width, stage.height - stage.groundY);

  for (const treeX of [14, 728]) {
    ctx.fillStyle = "#7a5124";
    ctx.fillRect(treeX, stage.groundY - 132, 22, 132);

    ctx.fillStyle = "#5fa53a";
    for (const [offsetX, offsetY, radius] of [
      [10, -110, 26],
      [-8, -84, 24],
      [24, -82, 24],
      [8, -58, 22]
    ]) {
      ctx.beginPath();
      ctx.arc(treeX + offsetX, stage.groundY + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#8ebd44";
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + i * 110, stage.groundY + 22, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#4e9a2d";
  for (let x = 0; x < stage.width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, stage.height);
    ctx.lineTo(x + 6, stage.groundY + 8);
    ctx.lineTo(x + 12, stage.height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#8f6230";
  ctx.fillRect(248, 12, 8, 58);
  ctx.fillRect(544, 12, 8, 58);

  ctx.fillStyle = "#d5a95f";
  ctx.strokeStyle = "#8a5b28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(220, 16, 360, 54, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#5a3718";
  ctx.textAlign = "center";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Welcome to the Zoo", stage.width / 2, 50);
}

function drawLeaf(item) {
  ctx.save();
  ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
  ctx.rotate(Math.sin((state.time + item.x) * 2.2) * 0.3);

  const leafGradient = ctx.createLinearGradient(-item.width / 3, -item.height / 3, item.width / 3, item.height / 3);
  leafGradient.addColorStop(0, "#9be45c");
  leafGradient.addColorStop(0.45, "#59ac2d");
  leafGradient.addColorStop(1, "#2f6e1f");

  ctx.fillStyle = leafGradient;
  ctx.beginPath();
  ctx.moveTo(0, -item.height / 2.1);
  ctx.bezierCurveTo(item.width / 2.2, -item.height / 2.8, item.width / 2.4, item.height / 3.2, 0, item.height / 2.15);
  ctx.bezierCurveTo(-item.width / 2.3, item.height / 3.2, -item.width / 2.25, -item.height / 2.8, 0, -item.height / 2.1);
  ctx.fill();

  ctx.strokeStyle = "#2c5f19";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, item.height / 2.2);
  ctx.lineTo(0, -item.height / 2.2);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  for (const direction of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(direction * 8, -12);
    ctx.moveTo(0, 4);
    ctx.lineTo(direction * 9, 0);
    ctx.moveTo(0, 12);
    ctx.lineTo(direction * 8, 14);
    ctx.stroke();
  }

  ctx.restore();
}

function drawApple(item) {
  ctx.save();
  ctx.translate(item.x + item.width / 2, item.y + item.height / 2);

  const appleGradient = ctx.createRadialGradient(-6, -10, 3, 0, 0, item.width / 1.4);
  appleGradient.addColorStop(0, "#ffb08a");
  appleGradient.addColorStop(0.45, "#e63e2e");
  appleGradient.addColorStop(1, "#9b1d14");

  ctx.fillStyle = appleGradient;
  ctx.beginPath();
  ctx.moveTo(0, -item.height / 2.1);
  ctx.bezierCurveTo(item.width / 3.2, -item.height / 2.1, item.width / 2.2, -item.height / 8, item.width / 2.15, item.height / 6);
  ctx.bezierCurveTo(item.width / 2.05, item.height / 2, item.width / 4.5, item.height / 2.3, 0, item.height / 2.15);
  ctx.bezierCurveTo(-item.width / 4.8, item.height / 2.3, -item.width / 2.05, item.height / 2, -item.width / 2.15, item.height / 6);
  ctx.bezierCurveTo(-item.width / 2.25, -item.height / 8, -item.width / 3.2, -item.height / 2.1, 0, -item.height / 2.1);
  ctx.fill();

  ctx.strokeStyle = "#7d1e16";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f4e5cb";
  ctx.beginPath();
  ctx.arc(item.width / 4.8, -item.height / 5.5, 5.1, 0, Math.PI * 2);
  ctx.arc(item.width / 2.75, -item.height / 8, 4.4, 0, Math.PI * 2);
  ctx.arc(item.width / 3.65, item.height / 16, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5d3a12";
  ctx.fillRect(-2, -item.height / 2.3, 4, 11);

  ctx.strokeStyle = "#2e5c1f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -item.height / 2.2);
  ctx.quadraticCurveTo(9, -item.height / 2.55, 14, -item.height / 2.1);
  ctx.stroke();

  ctx.fillStyle = "#4b7d29";
  ctx.beginPath();
  ctx.ellipse(12, -item.height / 2.15, 8, 4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerUp(powerUp) {
  ctx.save();
  ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
  ctx.rotate(state.time * 2.4);

  ctx.fillStyle = "#7bd3ff";
  ctx.strokeStyle = "#2a83b9";
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const outerRadius = powerUp.width / 2.1;
    const innerRadius = powerUp.width / 4.3;
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSquirrel(squirrel) {
  ctx.save();
  ctx.translate(squirrel.x, squirrel.y);

  const bounce = Math.sin(state.time * 14 + squirrel.phase) * 1.4;

  ctx.strokeStyle = "#815430";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(31, 17);
  ctx.quadraticCurveTo(45, 2 + bounce, 35, -17);
  ctx.quadraticCurveTo(22, -24, 16, -7);
  ctx.stroke();

  ctx.fillStyle = "#a77443";
  ctx.beginPath();
  ctx.ellipse(18, 14, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c99661";
  ctx.beginPath();
  ctx.ellipse(17, 16, 8, 6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a77443";
  ctx.beginPath();
  ctx.ellipse(31, 9, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8e6137";
  ctx.beginPath();
  ctx.ellipse(34, 2, 3.2, 5, -0.35, 0, Math.PI * 2);
  ctx.ellipse(27, 2, 3.2, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a2016";
  ctx.beginPath();
  ctx.arc(34, 8, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f1d2bb";
  ctx.beginPath();
  ctx.ellipse(36, 12, 3.8, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4d3220";
  ctx.beginPath();
  ctx.arc(39, 12, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGiraffeBody(wobble) {
  ctx.fillStyle = "#efb457";
  ctx.fillRect(23, 0, 18, 74);
  ctx.fillRect(16, 74, 34, 48);
  ctx.fillRect(11, 114, 10, 40);
  ctx.fillRect(47, 114, 10, 40);

  ctx.beginPath();
  ctx.ellipse(32, 92, 32, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(33 + wobble, 18, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9d6727";
  for (const [x, y, radius] of [
    [28, 12, 6],
    [21, 78, 5],
    [39, 104, 5],
    [27, 54, 4],
    [43, 70, 5],
    [22, 126, 4]
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillRect(18, -8, 4, 16);
  ctx.fillRect(42, -8, 4, 16);

  ctx.beginPath();
  ctx.arc(20, -10, 4, 0, Math.PI * 2);
  ctx.arc(44, -10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#9d6727";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, 92);
  ctx.quadraticCurveTo(78, 98 + wobble, 74, 120);
  ctx.quadraticCurveTo(71, 129, 79, 136);
  ctx.stroke();

  ctx.fillStyle = "#6b3f1a";
  ctx.beginPath();
  ctx.moveTo(79, 136);
  ctx.lineTo(89, 140);
  ctx.lineTo(79, 145);
  ctx.lineTo(73, 139);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2a2016";
  ctx.beginPath();
  ctx.arc(25, 15, 3, 0, Math.PI * 2);
  ctx.arc(40, 15, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2a2016";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 28);
  ctx.quadraticCurveTo(33, 33, 39, 28);
  ctx.stroke();

  ctx.strokeStyle = "#d79642";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(24, 74);
  ctx.lineTo(24, 12);
  ctx.moveTo(40, 74);
  ctx.lineTo(40, 12);
  ctx.stroke();
}

function drawGiraffe() {
  const giraffe = state.giraffe;

  ctx.save();

  if (state.invincibilityTimer > 0 && state.phase === "level") {
    const glowBounds = getGiraffeBounds();
    ctx.fillStyle = "rgba(107, 210, 255, 0.28)";
    ctx.strokeStyle = "rgba(64, 154, 219, 0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(glowBounds.x - 8, glowBounds.y - 8, glowBounds.width + 16, glowBounds.height + 16, 20);
    ctx.fill();
    ctx.stroke();
  }

  if (giraffe.fallenTimer > 0) {
    ctx.translate(giraffe.x + 6, giraffe.baseY + giraffe.height - 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(0, -giraffe.height);
    drawGiraffeBody(0);
  } else {
    ctx.translate(giraffe.x, giraffe.y);
    drawGiraffeBody(Math.sin(state.time * 8) * 1.2);
  }

  if (state.phase === "boss") {
    ctx.fillStyle = "#536c8f";
    ctx.fillRect(giraffe.x + giraffe.width - 2, giraffe.y + 42, 18, 5);
    ctx.fillRect(giraffe.x + giraffe.width + 14, giraffe.y + 40, 6, 9);
  }

  ctx.restore();
}

function drawElephantBoss() {
  if (!state.boss) {
    return;
  }

  const boss = state.boss;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.fillStyle = "#9aa6b6";
  ctx.beginPath();
  ctx.ellipse(74, 54, 58, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(112, 34, 34, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b5bfcc";
  ctx.beginPath();
  ctx.ellipse(44, 38, 22, 28, -0.4, 0, Math.PI * 2);
  ctx.ellipse(122, 42, 18, 22, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8c96a5";
  ctx.fillRect(34, 86, 16, 32);
  ctx.fillRect(62, 88, 16, 30);
  ctx.fillRect(92, 88, 16, 30);
  ctx.fillRect(118, 86, 16, 32);

  ctx.strokeStyle = "#7a8491";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(126, 48);
  ctx.quadraticCurveTo(150, 72, 136, 104);
  ctx.stroke();

  ctx.fillStyle = "#f3e8d1";
  ctx.beginPath();
  ctx.moveTo(114, 52);
  ctx.lineTo(126, 60);
  ctx.lineTo(112, 72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#243144";
  ctx.beginPath();
  ctx.arc(118, 30, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBullet(bullet, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.ellipse(
    bullet.x + bullet.width / 2,
    bullet.y + bullet.height / 2,
    bullet.width / 2,
    bullet.height / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawHudHints() {
  if (state.running) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(60, 39, 15, 0.52)";
  ctx.fillRect(0, 0, stage.width, stage.height);

  ctx.fillStyle = "#fff7df";
  ctx.fillRect(150, 140, 500, 200);

  ctx.fillStyle = "#503b1b";
  ctx.textAlign = "center";
  ctx.font = "bold 38px Arial";
  ctx.fillText("Game over at the zoo", stage.width / 2, 214);
  ctx.font = "20px Arial";
  ctx.fillText(`Final score: ${state.score}`, stage.width / 2, 258);
  ctx.fillText(`Reached level ${state.level}`, stage.width / 2, 288);
  ctx.restore();
}

function draw() {
  drawBackground();

  for (const squirrel of state.squirrels) {
    drawSquirrel(squirrel);
  }

  for (const powerUp of state.powerUps) {
    drawPowerUp(powerUp);
  }

  for (const item of state.items) {
    if (item.type === "leaf") {
      drawLeaf(item);
    } else {
      drawApple(item);
    }
  }

  if (state.phase === "boss") {
    drawElephantBoss();

    for (const bullet of state.giraffeBullets) {
      drawBullet(bullet, "#4f87ff");
    }

    for (const bullet of state.elephantBullets) {
      drawBullet(bullet, "#ff935b");
    }
  }

  drawGiraffe();
  drawHudHints();
}

let previousTime = performance.now();

function frame(now) {
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.033);
  previousTime = now;

  update(deltaSeconds);
  draw();

  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    event.preventDefault();
    input.left = true;
  }

  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    event.preventDefault();
    input.right = true;
  }

  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W" || event.key === " ") {
    event.preventDefault();
    input.jumpQueued = true;
  }

  if (event.key === "f" || event.key === "F" || event.key === "Enter") {
    event.preventDefault();
    input.shootQueued = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    event.preventDefault();
    input.left = false;
  }

  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    event.preventDefault();
    input.right = false;
  }
});

restartButton.addEventListener("click", () => {
  resetGame();
});

resetGame();
requestAnimationFrame(frame);
