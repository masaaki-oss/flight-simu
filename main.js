const canvas = document.getElementById("simulator");
const ctx = canvas.getContext("2d");

const readout = {
  speed: document.getElementById("speed"),
  altitude: document.getElementById("altitude"),
  verticalSpeed: document.getElementById("verticalSpeed"),
  throttle: document.getElementById("throttle"),
  pitch: document.getElementById("pitch"),
  roll: document.getElementById("roll"),
  yaw: document.getElementById("yaw"),
};

const state = {
  position: { x: 0, y: 1200, z: 0 },
  velocity: { x: 140, y: 0, z: 0 },
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0.65,
  brake: 0,
};

const controls = new Set();

const maxPitchRate = 45;
const maxRollRate = 70;
const maxYawRate = 30;
const maxThrottleRate = 0.35;
const maxThrust = 250;
const maxLift = 1.6;
const dragCoefficient = 0.02;
const mass = 1200;
const gravity = 9.81;

const toRadians = (deg) => (deg * Math.PI) / 180;
const toDegrees = (rad) => (rad * 180) / Math.PI;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateControls = (dt) => {
  const pitchInput = (controls.has("KeyW") || controls.has("ArrowUp") ? 1 : 0) -
    (controls.has("KeyS") || controls.has("ArrowDown") ? 1 : 0);
  const rollInput = (controls.has("KeyD") || controls.has("ArrowRight") ? 1 : 0) -
    (controls.has("KeyA") || controls.has("ArrowLeft") ? 1 : 0);
  const yawInput = (controls.has("KeyE") ? 1 : 0) -
    (controls.has("KeyQ") ? 1 : 0);
  const throttleInput = (controls.has("KeyR") ? 1 : 0) -
    (controls.has("KeyF") ? 1 : 0);

  state.pitch += pitchInput * maxPitchRate * dt;
  state.roll += rollInput * maxRollRate * dt;
  state.yaw += yawInput * maxYawRate * dt;
  state.pitch = clamp(state.pitch, -35, 35);
  state.roll = clamp(state.roll, -65, 65);

  state.throttle = clamp(
    state.throttle + throttleInput * maxThrottleRate * dt,
    0,
    1
  );

  state.brake = controls.has("Space") ? 1 : 0;
};

const stepPhysics = (dt) => {
  const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z);
  const forward = {
    x: Math.cos(toRadians(state.yaw)) * Math.cos(toRadians(state.pitch)),
    y: Math.sin(toRadians(state.pitch)),
    z: Math.sin(toRadians(state.yaw)) * Math.cos(toRadians(state.pitch)),
  };

  const lift = maxLift * speed * speed * Math.cos(toRadians(state.roll));
  const liftForce = (lift / 1000) * mass * gravity;
  const dragForce = dragCoefficient * speed * speed * (1 + state.brake * 3);
  const thrustForce = state.throttle * maxThrust;

  const acceleration = {
    x:
      (forward.x * thrustForce - forward.x * dragForce) / mass,
    y: (liftForce / mass) - gravity,
    z:
      (forward.z * thrustForce - forward.z * dragForce) / mass,
  };

  state.velocity.x += acceleration.x * dt;
  state.velocity.y += acceleration.y * dt;
  state.velocity.z += acceleration.z * dt;

  state.position.x += state.velocity.x * dt;
  state.position.y += state.velocity.y * dt;
  state.position.z += state.velocity.z * dt;

  if (state.position.y < 0) {
    state.position.y = 0;
    state.velocity.y = Math.max(0, state.velocity.y);
  }
};

const drawBackground = () => {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const horizonOffset = (state.pitch / 30) * height * 0.25;
  const horizonY = height / 2 + horizonOffset;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(toRadians(-state.roll));
  ctx.translate(-width / 2, -height / 2);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGradient.addColorStop(0, "#4a7bd0");
  skyGradient.addColorStop(1, "#b4d7ff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY);

  const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
  groundGradient.addColorStop(0, "#32542c");
  groundGradient.addColorStop(1, "#1b2d18");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width, horizonY);
  ctx.stroke();

  ctx.restore();
};

const drawHud = () => {
  const { width, height } = canvas;
  ctx.save();
  ctx.translate(width / 2, height / 2);

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-25, 0);
  ctx.lineTo(-5, 0);
  ctx.moveTo(5, 0);
  ctx.lineTo(25, 0);
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 15);
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  for (let i = -30; i <= 30; i += 10) {
    const offset = (i / 30) * height * 0.2 + height / 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 40, offset);
    ctx.lineTo(width / 2 + 40, offset);
    ctx.stroke();
  }
  ctx.restore();
};

const updateReadout = () => {
  const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z);
  const verticalSpeed = state.velocity.y * 60 * 3.28;
  readout.speed.textContent = Math.round(speed * 1.94);
  readout.altitude.textContent = Math.round(state.position.y * 3.28);
  readout.verticalSpeed.textContent = Math.round(verticalSpeed);
  readout.throttle.textContent = Math.round(state.throttle * 100);
  readout.pitch.textContent = Math.round(state.pitch);
  readout.roll.textContent = Math.round(state.roll);
  readout.yaw.textContent = Math.round(state.yaw);
};

let lastTime = performance.now();
const loop = (time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  updateControls(dt);
  stepPhysics(dt);
  drawBackground();
  drawHud();
  updateReadout();

  requestAnimationFrame(loop);
};

document.addEventListener("keydown", (event) => {
  controls.add(event.code);
});

document.addEventListener("keyup", (event) => {
  controls.delete(event.code);
});

requestAnimationFrame(loop);
