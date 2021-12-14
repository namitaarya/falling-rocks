"use strict";

function getCookie (name) {
	let value = `; ${document.cookie}`;
	let parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
}

let uemail = getCookie('userEmail');
console.log(uemail);
let flag = true;
if(uemail == "") {
  flag = false;
}

const DEV_MODE = false;
const stage = document.createElement('canvas');
const ctx = stage.getContext('2d');
const dialogue = document.querySelector('.dialogue');
const startBtn = document.querySelector(".start-button");
const hud = document.querySelector('.hud');
const scoreNode = document.querySelector('.hud__score span');
const highscoreNode = document.querySelector('.highscore span');
var background = new Image();
background.src = "https://fiverr-res.cloudinary.com/images/q_auto,f_auto/gigs/146464531/original/8c5628fb166d24655c9c1b87ef1d403c2a7f8f24/create-vector-2d-game-background-for-your-game.png";

var shooter = new Image();
shooter.src = "https://i.ibb.co/w0wJWjZ/Whats-App-Image-2021-12-06-at-7-46-15-PM-removebg-preview-1.png";

var rock = new Image();
rock.src = "https://www.freepnglogos.com/uploads/rock-png/home-natural-stone-company-greenville-big-rock-natural-29.png";

var laser = new Image();
laser.src = "https://www.pinclipart.com/picdir/big/270-2701567_fireball-clipart-8-bit-png-download.png";

// maintaining highscore of the user

async function getHighScore() {
  let userObj = await fetch(`/getHS?userEmail=${uemail}`)
    .then(response => response.json())
    .then(data => data);
  console.log(userObj);
  return userObj.highestScore;
}


async function updateHighScore(score) {
  console.log("Yea");
  await fetch(`setHS?userEmail=${uemail}&score=${score}`);
  return score;
}

let ship,
    lasers = [],
    enemies = [],
    playing = false,
    gameStarted = false,
    speedMultiplier,
    enemySeedFrameInterval,
    score = 0,
    highscore = 0,
    tick = 0,
    laserTick = 0;


// popup menu in the game
var menuPopupActive = false;
var menuPopup = document.querySelector('.popup')
document.querySelector('.menu-button').addEventListener('click', function () {
  menuPopup.classList.toggle('visible');
}, false)

// random place of the falling circles
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// calculate the player's score
function calcScore(x) {
  return Math.floor(1 / x * 500);
}

// shooter
function Ship(options) {
  this.radius = 15;
  this.x = options.x || stage.width * .5 - this.radius - .5;
  this.y = options.y || stage.height - this.radius - 60;
  this.width = this.radius * 2;
  this.height = this.width;
  this.color = options.color || 'red';
  this.left = false;
  this.right = false;
  this.speed = 10;
  this.active = true;

  document.addEventListener('keydown', this.onKeyDown.bind(this));
  document.addEventListener('keyup', this.onKeyUp.bind(this));
}


// console.log(Ship.prototype)
Ship.prototype.update = function (x) {
  this.x = x;
  this.y = stage.height - this.radius- 60;
};


Ship.prototype.draw = function () {
  ctx.save();

  if (DEV_MODE) {
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(this.x, this.y, this.width, this.width);
  }

  ctx.drawImage(shooter, this.x, this.y, this.width * 3, this.height * 3);
  ctx.restore();
};

Ship.prototype.onKeyDown = function (e) {
  if (ship.active) {
    if (e.keyCode === 39) this.right = true;
    else if (e.keyCode === 37) this.left = true;

    if (e.keyCode == 32 && !this.shooting) {
      this.shooting = true;
      laserTick = 0;
    }
  }
};

Ship.prototype.onKeyUp = function (e) {
  if (e.key === 'ArrowRight') this.right = false;
  else if (e.key === 'ArrowLeft') this.left = false;
  else if (e.keyCode == 32) this.shooting = false;
};

function Laser(options) {
  this.x = options.x - .5;
  this.y = options.y || stage.height - 50;
  this.width = 6;
  this.height = 20;
  this.speed = 15;
  this.color = options.color || 'white';
  this.active = true;
}

Laser.prototype.update = function (y) {
  this.y = y;
};

Laser.prototype.draw = function () {
  ctx.save();
  ctx.drawImage(laser, this.x, this.y + 5, this.width, this.height);
  ctx.beginPath();
  ctx.rect(this.x, this.y, this.width, this.height);
  ctx.closePath();
  ctx.restore();
};

function Enemy(options) {
  this.radius = randomBetween(10, 40);
  this.width = this.radius * 2;
  this.height = this.width;
  this.x = randomBetween(0, stage.width - this.width);
  this.y = -this.radius * 2;
  this.color = options != undefined && options.color ? options.color : 'white';
  this.speed = 2;
  this.active = true;
}

Enemy.prototype.update = function (x, y) {
  this.x = x;
  this.y = y;
};

Enemy.prototype.draw = function () {
  if (DEV_MODE) {
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(this.x, this.y, this.width, this.width);
  }

  ctx.save();
  ctx.drawImage(rock, this.x, this.y, this.width, this.height);
  ctx.beginPath();
  ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.restore();
};

function hitTest(item1, item2) {
  let collision = true;

  if (item1.x > item2.x + item2.width || item1.y > item2.y + item2.height || item2.x > item1.x + item1.width || item2.y > item1.y + item1.height) {
    collision = false;
  }

  return collision;
}

async function handleLaserCollision() {
  for (let enemy of enemies) {
    for (let laser of lasers) {
      let collision = hitTest(laser, enemy);

      if (collision && laser.active) {
        console.log('you destroyed an enemy');
        enemy.active = false;
        laser.active = false; // increase enemy speed and frequency of enemy spawns

        speedMultiplier += .025;

        if (enemySeedFrameInterval > 20) {
          enemySeedFrameInterval -= 2;
        } // increase score


        score += calcScore(enemy.radius);
        scoreNode.textContent = score;

        if(highscore < score) {
          if(flag) {
            await updateHighScore(score);
          }
          highscore = score;
          highscoreNode.textContent = highscore;
        }
      }
    }
  }
}

function handleShipCollision() {
  // check for collisions between ship and enemies
  if (enemies.length) {
    for (let enemy of enemies) {
      let collision = hitTest(ship, enemy);

      if (collision) {
        console.log('your ship was destroyed');
        ship.active = false;

        setTimeout(() => {
          ship.active = true;
          speedMultiplier = 1;
          enemySeedFrameInterval = 100;
          score = 0;
          scoreNode.textContent = score;
          highscoreNode.textContent = highscore;
        }, 2000);
      }
    }
  }
}

function drawShip(xPosition) {
  if (ship.active) {
    ship.update(xPosition);
    ship.draw();
  }
}

function drawEnemies() {
  if (enemies.length) {
    for (let enemy of enemies) {
      // draw an enemy if it's active
      if (enemy.active) {
        enemy.update(enemy.x, enemy.y += enemy.speed * speedMultiplier);
        enemy.draw();
      }
    }
  }
}

function enemyCleanup() {
  if (enemies.length) {
    enemies = enemies.filter(enemy => {
      let visible = enemy.y < stage.height + enemy.width;
      let active = enemy.active === true;
      return visible && active;
    });
  }
}

function drawLasers() {
  if (lasers.length) {
    for (let laser of lasers) {
      if (laser.active) {
        laser.update(laser.y -= laser.speed);
        laser.draw();
      }
    }
  }
}

function laserCleanup() {
  lasers = lasers.filter(laser => {
    let visible = laser.y > -laser.height;
    let active = laser.active === true;
    return visible && active;
  });
}

function render(delta) {
  if (playing) {
    let xPos = ship.x; // seed new enemies

    if (tick % enemySeedFrameInterval === 0 && ship.active) {
      const enemy = new Enemy();
      enemies.push(enemy);
      console.log({
        enemySeedFrameInterval,
        speedMultiplier
      });
    } // background


    ctx.save();
    ctx.drawImage(background, 0, 0, stage.width, stage.height);
    ctx.restore();

    if (ship.left) xPos = ship.x -= ship.speed;else if (ship.right) xPos = ship.x += ship.speed; // stage boundaries

    if (gameStarted) {
      if (xPos < 0) xPos = 0;else if (xPos > stage.width - ship.width) xPos = stage.width - ship.width;
    } // create lasers, if shooting


    if (ship.active && ship.shooting) {
      if (laserTick === 0 || laserTick % 10 === 0) {
        let laser = new Laser({
          color: 'skyblue',
          x: ship.x + ship.radius - 3
        });
        lasers.push(laser);
      }
    }

    drawShip(xPos);
    handleShipCollision();
    handleLaserCollision();
    drawLasers();
    drawEnemies();
    enemyCleanup();
    laserCleanup();
    if (ship.shooting) laserTick++;
    tick++;
  }

  requestAnimationFrame(render);
}

async function startGame(e) {
  if(flag) {
    highscoreNode.textContent = await getHighScore();
  } else {
    highscoreNode.textContent = 0;
  }
  highscore = highscoreNode.textContent;
  console.log('starting game');
  dialogue.classList.add('dialogue--hidden');
  hud.classList.remove('hud--hidden');
  e.currentTarget.blur(); // reset the demo/intro to the actual game settings:

  speedMultiplier = 1;
  enemySeedFrameInterval = 100;
  ship.x = stage.width * 0.5 - ship.radius - 0.5;
  ship.y = stage.height - ship.radius - 60;
  enemies = [];
  gameStarted = true;
}

function onResize() {
  stage.width = window.innerWidth;
  stage.height = window.innerHeight;
}

startBtn.addEventListener('click', startGame);
//menuPopup.addEventListener('click', popUp);
window.addEventListener('resize', onResize);
document.body.appendChild(stage);
onResize(); // start the ship off-screen:

ship = new Ship({
  color: '#ff9d00',
  x: -100,
  y: -100
}); 

speedMultiplier = 1;
enemySeedFrameInterval = 100;
playing = true;
render();
