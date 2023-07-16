let bubbles = [];
let collisionLayer = [];
let boundingWalls = [];
const friction = 0;
let elasticity = 1;

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  subtract(vector) {
    return new Vector(this.x - vector.x, this.y - vector.y);
  }
  multiply(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
  divide(factor) {
    return new Vector(this.x / factor, this.y / factor);
  }
  norm() {
    return Math.sqrt(this.x**2 + this.y**2);
  }
  normal() {
    return new Vector(-this.y, this.x).unit();
  }
  unit() {
    return (this.norm() === 0) ? new Vector(0, 0) : new Vector(this.x/this.norm(), this.y/this.norm());
  }
  static dot(vector1, vector2) {
    return vector1.x*vector2.x + vector1.y*vector2.y;
  }
}
class Bubble {
  constructor(x = 0, y = 0, v_x = 0, v_y = 0, m = 1, r = window.innerHeight/11) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(v_x, v_y);
    this.acceleration = new Vector(0, 0);
    this.mass = m;
    this.inverseMass = this.mass === 0 ? 0 : 1 / this.mass;
    this.radius = r;
    this.hueRotation = Math.round(Math.random() * 360);
    bubbles.push(this);
  }

  move() {
    this.acceleration = this.acceleration.unit().multiply(1337);
    this.velocity = this.velocity.add(this.acceleration).multiply(1-friction);
    this.position = this.position.add(this.velocity);

    this.hueRotation = (this.hueRotation + 1) % 360;
  }
  draw(ctx) {
    const img = document.getElementById("bubble");
    ctx.filter = `hue-rotate(${this.hueRotation}deg) grayscale(0%) saturate(150%) brightness(150%)`;
    ctx.drawImage(img, this.position.x - this.radius, this.position.y - this.radius, this.radius * 2, this.radius * 2);
  }
}
class Wall {
  constructor (x1, y1, x2, y2) {
    this.start = new Vector(x1, y1);
    this.end = new Vector(x2, y2);
    boundingWalls.push(this);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
  }

  unit() {
    return this.end.subtract(this.start).unit();
  }
}

function moveBubbles() {
  for (let i = 0; i <= bubbles.length -1; i++) {
    boundingWalls.map(wall => {
      if(isCollidingBubbleToWall(bubbles[i], wall)) {
        penetrationResolutionBubbleToWall(bubbles[i], wall);
        collisionResponseBubbleToWall(bubbles[i], wall);
      }
    });
    let notInStartArea = bubbles[i].position.x > bubbles[i].radius * 2 && bubbles[i].position.y < window.innerHeight - bubbles[i].radius * 2;
    let isCollidingInInitalLayer = bubbles.some((bubble2,j) => i !== j && isCollidingBubbleToBubble(bubbles[i], bubble2));
    let isCollidingInCollisionLayer = collisionLayer.some(bubble2 => isCollidingBubbleToBubble(bubbles[i], bubble2));
    if(notInStartArea && !isCollidingInInitalLayer && !isCollidingInCollisionLayer) {
      collisionLayer.push(bubbles[i]);
      bubbles[i].collision = true;
    }
  }

  collisionLayer.map((bubble1, i) => {
    for(let j = i + 1; j <= collisionLayer.length -1; j++) {
      if(isCollidingBubbleToBubble(bubble1, collisionLayer[j])) {
        penetrationResolutionBubbleToBubble(bubble1, collisionLayer[j]);
        collisionResponseBubbleToBubble(bubble1, collisionLayer[j]);
      }
    }
    boundingWalls.map(wall => {
      if(isCollidingBubbleToWall(bubble1, wall)) {
        penetrationResolutionBubbleToWall(bubble1, wall);
        collisionResponseBubbleToWall(bubble1, wall);
      }
    });
  });

  const canvas = document.getElementById('bubblesCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i <= bubbles.length -1; i++) {
    if(bubbles[i].collision) continue;
    bubbles[i].move();
    bubbles[i].draw(ctx);
  };
  collisionLayer.map(bubble => {
    bubble.move();
    bubble.draw(ctx);
  });

  requestAnimationFrame(moveBubbles);
}
function isCollidingBubbleToBubble(bubble1, bubble2) {
  return bubble1.radius + bubble2.radius >= bubble2.position.subtract(bubble1.position).norm();
}
function penetrationResolutionBubbleToBubble(bubble1, bubble2) {
  let distance = bubble1.position.subtract(bubble2.position);
  let penetrationDepth = bubble1.radius + bubble2.radius - distance.norm();
  let penetrationResolution = distance.unit().multiply(penetrationDepth/(bubble1.inverseMass + bubble2.inverseMass));
  bubble1.position = bubble1.position.add(penetrationResolution.multiply(bubble1.inverseMass));
  bubble2.position = bubble2.position.add(penetrationResolution.multiply(-bubble2.inverseMass));
}
function collisionResponseBubbleToBubble(bubble1, bubble2) {
  let normal = bubble1.position.subtract(bubble2.position).unit();
  let relativeVelocity = bubble1.velocity.subtract(bubble2.velocity);
  let separatingVelocity = Vector.dot(relativeVelocity, normal);
  let newSeparatingVelocity = -separatingVelocity * elasticity;
  let separatingVelocityDiff = newSeparatingVelocity - separatingVelocity;
  let impulse = separatingVelocityDiff / (bubble1.inverseMass + bubble2.inverseMass);
  let impulseVector = normal.multiply(impulse);

  bubble1.velocity = bubble1.velocity.add(impulseVector.multiply(bubble1.inverseMass));
  bubble2.velocity = bubble2.velocity.add(impulseVector.multiply(-bubble2.inverseMass));
}
function nearestWallPointToBubble(bubble, wall) {
  // Bubble closest to start coords of Wall
  let start = wall.start.subtract(bubble.position);
  if(Vector.dot(wall.unit(), start) > 0) {
    return wall.start;
  }
  // Bubble closest to end coords of Wall
  let end = bubble.position.subtract(wall.end);
  if(Vector.dot(wall.unit(), end) > 0) {
    return wall.end;
  }
  // Nearest point is somewhere on the line
  let closestDistance = Vector.dot(wall.unit(), start);
  let closestVector = wall.unit().multiply(closestDistance);
  return wall.start.subtract(closestVector);
}
function isCollidingBubbleToWall(bubble, wall) {
  let ballToNearestPoint = nearestWallPointToBubble(bubble, wall).subtract(bubble.position);
  if(ballToNearestPoint.norm() <= bubble.radius) {
    return true;
  }
}
function penetrationResolutionBubbleToWall(bubble, wall) {
  let penetrationVector = bubble.position.subtract(nearestWallPointToBubble(bubble, wall));
  bubble.position = bubble.position.add(penetrationVector.unit().multiply(bubble.radius-penetrationVector.norm()));
}
function collisionResponseBubbleToWall(bubble, wall) {
  let normal = bubble.position.subtract(nearestWallPointToBubble(bubble, wall)).unit();
  let separatingVelocity = Vector.dot(bubble.velocity, normal);
  let newSeparatingVelocity = -separatingVelocity * elasticity;
  let separatingVelocityDiff = separatingVelocity - newSeparatingVelocity;
  bubble.velocity = bubble.velocity.add(normal.multiply(-separatingVelocityDiff));
}

window.addEventListener('load', () => {
  new Wall(0,0, 0,window.innerHeight);
  new Wall(0,0, window.innerWidth,0);
  new Wall(window.innerWidth,0, window.innerWidth,window.innerHeight);
  new Wall(0,window.innerHeight, window.innerWidth,window.innerHeight);

  const spawnBubbles = setInterval(() => {
    if (bubbles.length >= 20) {
      clearInterval(spawnBubbles);
      return;
    }
    let initVel = 10;
    let angle = Math.random() * Math.PI/2; // [0, PI/2] radians
    new Bubble(window.innerHeight/7, window.innerHeight - 100, Math.cos(angle) * initVel, -Math.sin(angle) * initVel);
  }, 400);
  
  requestAnimationFrame(moveBubbles);
});
window.addEventListener('resize', () => {
  console.log('update canvas/emulation dimensions...');
});