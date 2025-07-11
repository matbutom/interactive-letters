export const handler = ({ inputs, mechanic, sketch }) => {
  const Matter = require('matter-js');
  const Engine = Matter.Engine;
  const World = Matter.World;
  const Bodies = Matter.Bodies;
  const Body = Matter.Body;
  const Mouse = Matter.Mouse;
  const MouseConstraint = Matter.MouseConstraint;

  let initialLetterStates = [];
  let imagenesLetras = {};
  let letrasCuerpos = [];
  let engine;
  let world;
  let mConstraint;
  let video;
  const letraScale = 0.08;
  const canvasWidth = 1080;
  const canvasHeight = 1920;

  const centralPoint = { x: canvasWidth / 2, y: canvasHeight / 2 };
  const initialRadius = Math.min(canvasWidth, canvasHeight) * 0.2;
  const orbitalSpeed = 0.0001;
  const attractionForceMagnitude = 0.00001;
  const tangentialDriftMagnitude = 0.000001;

  let handtrackModel = null;
  let hands = [];
  let handBodies = [];

  sketch.preload = () => {
    for (let i = 0; i < 26; i++) {
      const letra = String.fromCharCode(97 + i);
      imagenesLetras[letra] = sketch.loadImage(`static/letter_${letra}.png`);
    }
  };

  sketch.setup = async () => {
    sketch.createCanvas(canvasWidth, canvasHeight);
    sketch.imageMode(sketch.CENTER);

    video = sketch.createCapture({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }
    }, () => {
      video.hide();
    });

    engine = Engine.create();
    world = engine.world;

    const handtrack = require('handtrackjs');
    const modelParams = {
      flipHorizontal: false,
      outputStride: 16,
      iouThreshold: 0.2,
      scoreThreshold: 0.1,
      maxNumBoxes: 3,
    };
    handtrackModel = await handtrack.load(modelParams);
    handtrack.startVideo(video.elt).then(function (status) {
      if (status) {
        runHandtrack();
      }
    });

    const numLetters = Object.keys(imagenesLetras).length;
    for (let i = 0; i < numLetters; i++) {
      const caracter = Object.keys(imagenesLetras)[i];
      const img = imagenesLetras[caracter];
      const angle = sketch.map(i, 0, numLetters, 0, sketch.TWO_PI);
      const x = centralPoint.x + initialRadius * sketch.cos(angle);
      const y = centralPoint.y + initialRadius * sketch.sin(angle);
      const randomRotation = sketch.random(-sketch.PI / 12, sketch.PI / 12);
      const nuevoCuerpo = Bodies.rectangle(x, y, img.width * letraScale, img.height * letraScale, {
        frictionAir: 0.05,
        restitution: 0.3,
        angle: randomRotation,
        label: caracter
      });
      letrasCuerpos.push({ cuerpo: nuevoCuerpo, img: img });
      World.add(world, nuevoCuerpo);

      initialLetterStates.push({
        position: { x: x, y: y },
        angle: randomRotation,
        velocity: { x: 0, y: 0 },
        angularVelocity: 0
      });
    }

    const canvasMouse = Mouse.create(sketch.canvas.elt);
    canvasMouse.pixelRatio = sketch.pixelDensity();
    mConstraint = MouseConstraint.create(engine, {
      mouse: canvasMouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    });
    World.add(world, mConstraint);

    const bordeGrosor = 50;
    const ground = Bodies.rectangle(canvasWidth / 2, canvasHeight + bordeGrosor / 2, canvasWidth, bordeGrosor, { isStatic: true });
    const ceiling = Bodies.rectangle(canvasWidth / 2, -bordeGrosor / 2, canvasWidth, bordeGrosor, { isStatic: true });
    const leftWall = Bodies.rectangle(-bordeGrosor / 2, canvasHeight / 2, bordeGrosor, canvasHeight, { isStatic: true });
    const rightWall = Bodies.rectangle(canvasWidth + bordeGrosor / 2, canvasHeight / 2, bordeGrosor, canvasHeight, { isStatic: true });
    World.add(world, [ground, ceiling, leftWall, rightWall]);
    setInterval(resetLetters, 19999);
  };

  async function runHandtrack() {
    if (handtrackModel) {
      const predictions = await handtrackModel.detect(video.elt);
      hands = predictions;
      updateHandBodies();
      requestAnimationFrame(runHandtrack);
    }
  }

  function updateHandBodies() {
    handBodies.forEach(body => World.remove(world, body));
    handBodies = [];

    hands.forEach(hand => {
      const x = hand.bbox[0] + hand.bbox[2] / 2;
      const y = hand.bbox[1] + hand.bbox[3] / 2;

      // Ajuste por rotación: video rotado -90°
      const rotatedX = y;
      const rotatedY = video.width - x;

      // Escalado para crop-to-fill
      const scale = Math.max(canvasWidth / video.height, canvasHeight / video.width);

      // Centrado en el canvas
      const centeredX = canvasWidth / 2 + (rotatedX - video.height / 2) * scale;
      const centeredY = canvasHeight / 2 + (rotatedY - video.width / 2) * scale;

      const radius = Math.max(hand.bbox[2], hand.bbox[3]) / 2 * scale;

      const handBody = Bodies.circle(centeredX, centeredY, radius, {
        isStatic: false,
        label: 'hand',
        frictionAir: 0.1
      });

      handBodies.push(handBody);
      World.add(world, handBody);
    });
  }

  sketch.draw = () => {
    sketch.background(0);

    // Dibuja el video rotado 90° a la izquierda
    sketch.push();
    const camW = video.width;
    const camH = video.height;
    const scale = Math.max(canvasWidth / camH, canvasHeight / camW);
    sketch.translate(canvasWidth / 2, canvasHeight / 2);
    sketch.rotate(-sketch.HALF_PI);
    sketch.image(video, 0, 0, 1920, 1080);
    sketch.pop();

    for (const letraObj of letrasCuerpos) {
      const deltaX = letraObj.cuerpo.position.x - centralPoint.x;
      const deltaY = letraObj.cuerpo.position.y - centralPoint.y;

      const attractionForce = {
        x: -deltaX * attractionForceMagnitude,
        y: -deltaY * attractionForceMagnitude
      };
      Matter.Body.applyForce(letraObj.cuerpo, letraObj.cuerpo.position, attractionForce);

      const orbitalForce = {
        x: -deltaY * orbitalSpeed,
        y: deltaX * orbitalSpeed
      };
      Matter.Body.applyForce(letraObj.cuerpo, letraObj.cuerpo.position, orbitalForce);

      const angleToCenter = sketch.atan2(deltaY, deltaX);
      const tangentialDriftForceAngle = angleToCenter + sketch.HALF_PI * sketch.random([-1, 1]);
      const tangentialDriftForce = {
        x: sketch.cos(tangentialDriftForceAngle) * tangentialDriftMagnitude * sketch.random(-1, 1),
        y: sketch.sin(tangentialDriftForceAngle) * tangentialDriftMagnitude * sketch.random(-1, 1)
      };
      Matter.Body.applyForce(letraObj.cuerpo, letraObj.cuerpo.position, tangentialDriftForce);
    }

    if (engine) {
      Engine.update(engine);
    }

    for (const letraObj of letrasCuerpos) {
      const pos = letraObj.cuerpo.position;
      const angle = letraObj.cuerpo.angle;
      sketch.push();
      sketch.translate(pos.x, pos.y);
      sketch.rotate(angle);
      sketch.image(letraObj.img, 0, 0, letraObj.img.width * letraScale, letraObj.img.height * letraScale);
      sketch.pop();
    }

    // Dibujo de las manos y cara detectadas
    sketch.fill(255, 0, 0, 50);
    sketch.noStroke();
    handBodies.forEach(body => {
      sketch.ellipse(body.position.x, body.position.y, body.circleRadius * 2, body.circleRadius * 2);
    });
  };

  function resetLetters() {
    letrasCuerpos.forEach((letraObj, index) => {
      Body.setPosition(letraObj.cuerpo, initialLetterStates[index].position);
      Body.setAngle(letraObj.cuerpo, initialLetterStates[index].angle);
      Body.setVelocity(letraObj.cuerpo, initialLetterStates[index].velocity);
      Body.setAngularVelocity(letraObj.cuerpo, initialLetterStates[index].angularVelocity);
    });
  }
};

export const inputs = {};

export const settings = {
  engine: require("@mechanic-design/engine-p5"),
  modules: {
    matter: require('matter-js'),
    handtrack: require('handtrackjs')
  }
};
