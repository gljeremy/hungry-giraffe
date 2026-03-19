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
const animalPicker = document.getElementById("animal-picker");
const animalChoices = document.querySelectorAll(".animal-choice");
const levelReadout = document.getElementById("level-readout");
const phaseReadout = document.getElementById("phase-readout");
const bossPanel = document.getElementById("boss-panel");
const bossHealthValue = document.getElementById("boss-health-value");
const bossHealthFill = document.getElementById("boss-health-fill");
const bossGiraffeValue = document.getElementById("boss-giraffe-value");
const bossGiraffeFill = document.getElementById("boss-giraffe-fill");

const LEVEL_DURATION = 15;
const ANIMAL_CONFIG = {
  giraffe: {
    label: "Giraffe",
    speed: 360,
    jumpStrength: 780,
    regularMaxHealth: 65,
    bossHealth: 50,
    leafHeal: 12,
    appleDamage: 20,
    bossShotDamage: 10,
    giraffeShootInterval: 0.38,
    bossDamageMultiplier: 1.15
  },
  tiger: {
    label: "Tiger",
    speed: 560,
    jumpStrength: 760,
    regularMaxHealth: 55,
    bossHealth: 40,
    leafHeal: 11,
    appleDamage: 18,
    bossShotDamage: 10,
    giraffeShootInterval: 0.38,
    bossDamageMultiplier: 1
  },
  "baby-elephant": {
    label: "Baby Elephant",
    speed: 300,
    jumpStrength: 680,
    regularMaxHealth: 82,
    bossHealth: 60,
    leafHeal: 10,
    appleDamage: 12,
    bossShotDamage: 10,
    giraffeShootInterval: 0.42,
    bossDamageMultiplier: 0.75
  },
  llama: {
    label: "Llama",
    speed: 330,
    jumpStrength: 920,
    regularMaxHealth: 60,
    bossHealth: 45,
    leafHeal: 10,
    appleDamage: 18,
    bossShotDamage: 8,
    giraffeShootInterval: 0.28,
    bossDamageMultiplier: 1
  }
};

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
  phaseTimeRemaining: LEVEL_DURATION,
  bossIntroTimer: 0,
  selectedAnimal: null,
  selectionOpen: true,
  abilityEffects: []
};

function getPlayerConfig() {
  return ANIMAL_CONFIG[state.selectedAnimal || "giraffe"];
}

function spawnAbilityEffect(kind, x, y) {
  state.abilityEffects.push({
    kind,
    x,
    y,
    timer: 0.45
  });
}

function createGiraffe() {
  const height = 154;
  const config = getPlayerConfig();

  return {
    x: stage.width / 2 - 34,
    y: stage.groundY - height,
    baseY: stage.groundY - height,
    width: 68,
    height,
    speed: config.speed,
    velocityY: 0,
    gravity: 1700,
    jumpStrength: config.jumpStrength,
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
  state.abilityEffects = [];
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
  const config = getPlayerConfig();

  state.level = levelNumber;
  state.phase = "level";
  state.phaseTimeRemaining = LEVEL_DURATION;
  clearLevelEntities();
  resetGiraffePosition();

  if (isFreshGame) {
    state.health = config.regularMaxHealth;
  } else {
    state.health = Math.min(config.regularMaxHealth, state.health + 12);
  }

  statusBanner.textContent = `Level ${state.level}: survive 15 seconds, then face the elephant boss.`;
  updateHud();
}

function startBossFight() {
  const config = getPlayerConfig();

  state.phase = "boss";
  state.phaseTimeRemaining = 0;
  state.bossIntroTimer = 0;
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
    health: 100 + (state.level - 1) * 10,
    maxHealth: 100 + (state.level - 1) * 10,
    giraffeHealth: config.bossHealth,
    maxGiraffeHealth: config.bossHealth,
    giraffeShootTimer: 0,
    giraffeShootInterval: config.giraffeShootInterval,
    shootTimer: 0,
    shootInterval: Math.max(0.5, 1.65 - (state.level - 1) * 0.14)
  };

  statusBanner.textContent = "Boss fight! Shoot with F or Enter and dodge the elephant's blasts.";
  updateHud();
}

function startBossIntro() {
  state.phase = "boss-intro";
  state.phaseTimeRemaining = 0;
  state.bossIntroTimer = 1.8;
  state.items = [];
  state.squirrels = [];
  state.powerUps = [];
  state.giraffeBullets = [];
  state.elephantBullets = [];
  state.invincibilityTimer = 0;
  resetGiraffePosition();
  statusBanner.textContent = `Level ${state.level} boss fight coming up!`;
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

function openAnimalPicker() {
  if (!state.giraffe) {
    state.giraffe = createGiraffe();
  }

  clearLevelEntities();
  resetGiraffePosition();
  state.selectionOpen = true;
  state.running = false;
  animalPicker.classList.remove("hidden");
  statusBanner.textContent = "Pick your animal to start the game.";
  updateHud();
}

function startWithAnimal(animal) {
  state.selectedAnimal = animal;
  state.selectionOpen = false;
  animalPicker.classList.add("hidden");
  resetGame();
}

function updateHud() {
  const config = getPlayerConfig();
  const health = Math.max(0, Math.min(config.regularMaxHealth, state.health));
  const healthPercent = (health / config.regularMaxHealth) * 100;
  const sickness = 100 - healthPercent;

  scoreValue.textContent = String(state.score);
  leavesValue.textContent = String(state.leavesEaten);
  applesValue.textContent = String(state.applesHit);
  healthValue.textContent = `${Math.round(health)} / ${config.regularMaxHealth}`;
  sicknessValue.textContent = `${Math.round(sickness)}%`;
  healthFill.style.width = `${healthPercent}%`;
  sicknessFill.style.width = `${sickness}%`;

  levelReadout.textContent = `Level ${state.level}`;
  phaseReadout.textContent = state.phase === "boss"
    ? `Level ${state.level} boss fight`
    : state.phase === "boss-intro"
      ? `Level ${state.level} boss incoming`
      : `Level ${state.level} boss in ${Math.max(0, Math.ceil(state.phaseTimeRemaining))}s`;

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

function endGame(message = "Your animal is too sick. Press restart to try again.") {
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

function getPickupBounds() {
  const hazardBounds = getGiraffeBounds();

  if (state.selectedAnimal !== "giraffe" || state.giraffe.fallenTimer > 0 || state.phase !== "level") {
    return hazardBounds;
  }

  return {
    x: hazardBounds.x - 8,
    y: hazardBounds.y - 24,
    width: hazardBounds.width + 16,
    height: hazardBounds.height + 24
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
  const config = getPlayerConfig();

  if (item.type === "leaf") {
    state.health = Math.min(config.regularMaxHealth, state.health + config.leafHeal);
    state.score += 10;
    state.leavesEaten += 1;
    if (state.selectedAnimal === "giraffe") {
      spawnAbilityEffect("giraffe-reach", state.giraffe.x + 34, state.giraffe.y + 26);
    }
    statusBanner.textContent = "Crunch! Your animal feels stronger after eating a leaf.";
    return;
  }

  state.health = Math.max(0, state.health - config.appleDamage);
  state.applesHit += 1;
  if (state.selectedAnimal === "baby-elephant") {
    spawnAbilityEffect("elephant-armor", state.giraffe.x + 34, state.giraffe.y + 70);
  }
  statusBanner.textContent = "Oof! Apple hit. Your animal feels a little sicker.";
}

function jumpGiraffe() {
  const giraffe = state.giraffe;

  if (!giraffe.onGround || giraffe.fallenTimer > 0 || state.phase !== "level") {
    return;
  }

  giraffe.velocityY = -giraffe.jumpStrength;
  giraffe.onGround = false;
  if (state.selectedAnimal === "llama") {
    spawnAbilityEffect("llama-poof", giraffe.x + 30, giraffe.baseY + giraffe.height - 8);
  }
  statusBanner.textContent = "Boing! Hop over the squirrels.";
}

function knockDownGiraffe() {
  const giraffe = state.giraffe;

  giraffe.fallenTimer = 2;
  giraffe.velocityY = 0;
  giraffe.y = giraffe.baseY;
  giraffe.onGround = true;
  statusBanner.textContent = "Oops! A squirrel tripped your animal for 2 seconds.";
}

function collectPowerUp() {
  state.invincibilityTimer = 3;
  if (state.selectedAnimal === "giraffe") {
    spawnAbilityEffect("giraffe-reach", state.giraffe.x + 34, state.giraffe.y + 20);
  }
  statusBanner.textContent = "Invincibility power! Squirrels cannot knock your animal down for 3 seconds.";
}

function fireGiraffeBullet() {
  if (state.phase !== "boss" || !state.boss || state.boss.giraffeShootTimer > 0) {
    return;
  }

  const giraffe = state.giraffe;

  state.giraffeBullets.push({
    x: giraffe.x + giraffe.width - 6,
    y: giraffe.y + 34,
    width: 18,
    height: 6,
    velocityX: 440,
    velocityY: -180,
    damage: getPlayerConfig().bossShotDamage
  });

  state.boss.giraffeShootTimer = state.boss.giraffeShootInterval;
  if (state.selectedAnimal === "llama") {
    spawnAbilityEffect("llama-poof", giraffe.x + giraffe.width + 12, giraffe.y + 38);
  }
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
  const pickupBounds = getPickupBounds();
  const remainingItems = [];

  for (const item of state.items) {
    item.y += item.speed * deltaSeconds;

    const collisionBounds = item.type === "leaf" ? pickupBounds : giraffeBounds;

    if (intersects(item, collisionBounds)) {
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

    if (intersects(powerUp, pickupBounds)) {
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
    endGame("Your animal got too sick before reaching the boss.");
    return;
  }

  if (state.phaseTimeRemaining === 0) {
    startBossIntro();
  }
}

function updateBossPhase(deltaSeconds) {
  updateGiraffeMotion(deltaSeconds, false);

  if (input.shootQueued) {
    fireGiraffeBullet();
  }

  state.boss.giraffeShootTimer = Math.max(0, state.boss.giraffeShootTimer - deltaSeconds);
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
      state.boss.health = Math.max(0, state.boss.health - bullet.damage);
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
      const elephantDamage = Math.round((5 + (state.level - 1) * 2) * getPlayerConfig().bossDamageMultiplier);
      state.boss.giraffeHealth = Math.max(0, state.boss.giraffeHealth - elephantDamage);
      if (state.selectedAnimal === "baby-elephant") {
        spawnAbilityEffect("elephant-armor", giraffeBounds.x + giraffeBounds.width / 2, giraffeBounds.y + 30);
      }
      statusBanner.textContent = "The elephant blasted your animal!";
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
  if (state.selectionOpen) {
    return;
  }

  if (!state.running) {
    return;
  }

  state.time += deltaSeconds;

  if (state.phase === "level") {
    updateLevelPhase(deltaSeconds);
  } else if (state.phase === "boss-intro") {
    state.bossIntroTimer = Math.max(0, state.bossIntroTimer - deltaSeconds);

    if (state.bossIntroTimer === 0) {
      startBossFight();
    }
  } else {
    updateBossPhase(deltaSeconds);
  }

  state.abilityEffects = state.abilityEffects.filter((effect) => {
    effect.timer -= deltaSeconds;
    return effect.timer > 0;
  });

  input.jumpQueued = false;
  input.shootQueued = false;
  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, stage.width, stage.height);
  const isBossSky = state.phase !== "level";

  ctx.fillStyle = isBossSky ? "#556d8a" : "#a5dcff";
  ctx.fillRect(0, 0, stage.width, stage.groundY);

  if (isBossSky) {
    ctx.save();
    ctx.translate(stage.width - 88, 82);
    ctx.fillStyle = "#eef4ff";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(8, -6, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
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
  }

  ctx.fillStyle = isBossSky ? "rgba(71, 84, 102, 0.95)" : "rgba(255, 255, 255, 0.8)";
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

  if (isBossSky) {
    ctx.strokeStyle = "#f9f2a4";
    ctx.lineWidth = 4;
    for (const [x, y] of [
      [106, 86],
      [552, 92]
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10, y + 18);
      ctx.lineTo(x + 2, y + 18);
      ctx.lineTo(x - 12, y + 40);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#f7f3cb";
  ctx.fillRect(0, stage.groundY, stage.width, stage.height - stage.groundY);

  ctx.strokeStyle = "#75b43b";
  ctx.lineWidth = 3;
  for (let x = 20; x < stage.width - 20; x += 28) {
    const tuftHeight = 12 + (x % 3) * 3;
    ctx.beginPath();
    ctx.moveTo(x, stage.groundY + 2);
    ctx.lineTo(x + 5, stage.groundY - tuftHeight);
    ctx.moveTo(x + 6, stage.groundY + 4);
    ctx.lineTo(x + 11, stage.groundY - (tuftHeight - 2));
    ctx.moveTo(x + 12, stage.groundY + 2);
    ctx.lineTo(x + 15, stage.groundY - (tuftHeight - 4));
    ctx.stroke();
  }

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

  if (!isBossSky) {
    for (const [x, scale] of [
      [150, 0.34],
      [360, 0.28],
      [635, 0.32]
    ]) {
      const grazeAngle = 0.24 + Math.sin(state.time * 2.4 + x * 0.02) * 0.16;
      const grazeBob = Math.sin(state.time * 3.6 + x * 0.03) * 4;
      const grazeWobble = Math.sin(state.time * 4.2 + x * 0.04) * 1.2;

      ctx.save();
      ctx.translate(x, stage.groundY - 78 + grazeBob);
      ctx.rotate(grazeAngle);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.75;
      drawGiraffeBody(grazeWobble);

      ctx.strokeStyle = "#4a9727";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(66, 146);
      ctx.lineTo(70, 134);
      ctx.moveTo(72, 146);
      ctx.lineTo(76, 132);
      ctx.moveTo(78, 146);
      ctx.lineTo(82, 136);
      ctx.stroke();
      ctx.restore();
    }
  }
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

function drawTigerBody(wobble) {
  ctx.fillStyle = "#f29c38";
  ctx.fillRect(14, 78, 40, 34);
  ctx.fillRect(16, 108, 10, 42);
  ctx.fillRect(42, 108, 10, 42);

  ctx.beginPath();
  ctx.ellipse(34, 94, 31, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(49 + wobble * 0.5, 66, 20, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2f1d14";
  for (const stripeX of [19, 28, 38, 47]) {
    ctx.beginPath();
    ctx.moveTo(stripeX, 78);
    ctx.lineTo(stripeX - 4, 104);
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(13, 88);
  ctx.quadraticCurveTo(1, 78 + wobble, 7, 58);
  ctx.stroke();

  ctx.fillStyle = "#f8dfb6";
  ctx.beginPath();
  ctx.ellipse(56, 72, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2f1d14";
  ctx.beginPath();
  ctx.arc(54, 64, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBabyElephantBody(wobble) {
  ctx.fillStyle = "#a7b2c2";
  ctx.beginPath();
  ctx.ellipse(34, 94, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(46, 68, 24, 21, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c1c9d5";
  ctx.beginPath();
  ctx.ellipse(23, 67, 12, 16, -0.4, 0, Math.PI * 2);
  ctx.ellipse(56, 70, 11, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#95a1b0";
  ctx.fillRect(14, 110, 10, 40);
  ctx.fillRect(43, 110, 10, 40);

  ctx.strokeStyle = "#7d8794";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(57, 78);
  ctx.quadraticCurveTo(73, 98 + wobble, 60, 120);
  ctx.stroke();

  ctx.fillStyle = "#233041";
  ctx.beginPath();
  ctx.arc(52, 63, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawLlamaBody(wobble) {
  ctx.fillStyle = "#f2e0c6";
  ctx.fillRect(25, 26, 16, 52);
  ctx.fillRect(16, 74, 34, 38);
  ctx.fillRect(14, 108, 9, 42);
  ctx.fillRect(45, 108, 9, 42);

  ctx.beginPath();
  ctx.ellipse(33, 89, 30, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(34 + wobble * 0.6, 22, 18, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8c1a2";
  for (const [x, y, r] of [
    [28, 82, 6],
    [20, 96, 5],
    [41, 98, 5],
    [35, 55, 4]
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillRect(23, -4, 4, 18);
  ctx.fillRect(39, -4, 4, 18);

  ctx.fillStyle = "#2a2016";
  ctx.beginPath();
  ctx.arc(29, 20, 2.5, 0, Math.PI * 2);
  ctx.arc(39, 20, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
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
    if (state.selectedAnimal === "tiger") {
      drawTigerBody(0);
    } else if (state.selectedAnimal === "baby-elephant") {
      drawBabyElephantBody(0);
    } else if (state.selectedAnimal === "llama") {
      drawLlamaBody(0);
    } else {
      drawGiraffeBody(0);
    }
  } else {
    ctx.translate(giraffe.x, giraffe.y);
    const wobble = Math.sin(state.time * 8) * 1.2;

    if (state.selectedAnimal === "tiger" && (input.left || input.right)) {
      ctx.fillStyle = "rgba(242, 156, 56, 0.28)";
      ctx.beginPath();
      ctx.ellipse(10, 94, 20, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 94, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.selectedAnimal === "tiger") {
      drawTigerBody(wobble);
    } else if (state.selectedAnimal === "baby-elephant") {
      drawBabyElephantBody(wobble);
    } else if (state.selectedAnimal === "llama") {
      drawLlamaBody(wobble);
    } else {
      drawGiraffeBody(wobble);
    }
  }

  if (state.phase === "boss") {
    ctx.fillStyle = "#536c8f";
    ctx.fillRect(giraffe.x + giraffe.width - 2, giraffe.y + 42, 18, 5);
    ctx.fillRect(giraffe.x + giraffe.width + 14, giraffe.y + 40, 6, 9);
  }

  ctx.restore();
}

function drawAbilityEffects() {
  for (const effect of state.abilityEffects) {
    const alpha = effect.timer / 0.45;

    if (effect.kind === "giraffe-reach") {
      ctx.strokeStyle = `rgba(150, 214, 95, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y + 18);
      ctx.lineTo(effect.x, effect.y - 24);
      ctx.moveTo(effect.x - 10, effect.y - 4);
      ctx.lineTo(effect.x - 2, effect.y - 18);
      ctx.moveTo(effect.x + 10, effect.y - 4);
      ctx.lineTo(effect.x + 2, effect.y - 18);
      ctx.stroke();
    }

    if (effect.kind === "elephant-armor") {
      ctx.strokeStyle = `rgba(183, 201, 223, ${alpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 24 + (1 - alpha) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (effect.kind === "llama-poof") {
      ctx.fillStyle = `rgba(245, 238, 224, ${alpha})`;
      for (const [offsetX, offsetY, radius] of [
        [-10, 0, 8],
        [0, -6, 10],
        [10, 1, 7]
      ]) {
        ctx.beginPath();
        ctx.arc(effect.x + offsetX, effect.y + offsetY, radius * alpha + 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
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

function drawBossIntroOverlay() {
  if (state.phase !== "boss-intro") {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(181, 230, 255, 0.82)";
  ctx.fillRect(0, 0, stage.width, stage.height);

  ctx.fillStyle = "#2f5f85";
  ctx.textAlign = "center";
  ctx.font = "bold 46px Arial";
  ctx.fillText(`Level ${state.level}`, stage.width / 2, 220);
  ctx.font = "bold 28px Arial";
  ctx.fillText("Elephant boss incoming!", stage.width / 2, 270);
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

  drawPlayer();
  drawAbilityEffects();
  drawBossIntroOverlay();
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
  if (state.selectedAnimal) {
    resetGame();
  } else {
    openAnimalPicker();
  }
});

for (const animalChoice of animalChoices) {
  animalChoice.addEventListener("click", () => {
    startWithAnimal(animalChoice.dataset.animal);
  });
}

openAnimalPicker();
requestAnimationFrame(frame);
