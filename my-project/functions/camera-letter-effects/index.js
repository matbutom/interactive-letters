export const handler = ({ inputs, mechanic, sketch }) => {
  let video;
  const canvasWidth = 1080;
  const canvasHeight = 1920;
  const gridSize = 16;
  let letterImages = {};
  const lettersToLoad = ['x', 's', 'm', 'o', 'u', 'k'];

  sketch.preload = () => {
    lettersToLoad.forEach(letter => {
      letterImages[letter] = sketch.loadImage(`static/letter_${letter}.png`);
    });
  };

  sketch.setup = () => {
    sketch.createCanvas(canvasWidth, canvasHeight);
    sketch.pixelDensity(1);
    sketch.background(0);
    sketch.imageMode(sketch.CENTER);

    // Captura video horizontal para asegurar buena calidad al recortar
    video = sketch.createCapture(sketch.VIDEO, () => {
      video.size(1280, 720);
      video.hide();
    });
  };

  // FUNCION DE MAPEADO ROTADO Y CROP TO FILL - ROTACION 90° A LA IZQUIERDA
function mapCanvasToVideo(cx, cy, camW, camH) {
  const scale = Math.max(canvasWidth / camH, canvasHeight / camW);
  const cropW = canvasHeight / scale;
  const cropH = canvasWidth / scale;
  const offsetX = (camW - cropW) / 2;
  const offsetY = (camH - cropH) / 2;

  // 90° derecha (horario)
  const videoX = offsetX + ((canvasHeight - cy) / canvasHeight) * cropW;
  const videoY = offsetY + (cx / canvasWidth) * cropH;

  return [videoX, videoY];
}
  sketch.draw = () => {
    sketch.background(0);

    if (video && video.width > 0) {
      video.loadPixels();

      const camW = video.width;
      const camH = video.height;

      for (let y = 0; y < canvasHeight; y += gridSize) {
        for (let x = 0; x < canvasWidth; x += gridSize) {
          // Centro de la celda en canvas
          const cx = x + gridSize / 2;
          const cy = y + gridSize / 2;

          // Mapear cx/cy al espacio del video recortado y rotado 90° a la izquierda
          const [videoX, videoY] = mapCanvasToVideo(cx, cy, camW, camH);

          // Redondea y limita para no salirte del video
          const px = Math.floor(sketch.constrain(videoX, 0, camW - 1));
          const py = Math.floor(sketch.constrain(videoY, 0, camH - 1));

          const index = (px + py * camW) * 4;
          const brightness = (video.pixels[index] + video.pixels[index + 1] + video.pixels[index + 2]) / 3;
          let currentLetter = '';

          if (brightness < 43) {
            currentLetter = 'x';
          } else if (brightness < 86) {
            currentLetter = 's';
          } else if (brightness < 129) {
            currentLetter = 'm';
          } else if (brightness < 172) {
            currentLetter = 'o';
          } else if (brightness < 215) {
            currentLetter = 'u';
          } else {
            currentLetter = 'k';
          }

          if (letterImages[currentLetter]) {
            sketch.image(
              letterImages[currentLetter],
              cx,
              cy,
              gridSize,
              gridSize // Ahora es cuadrado, igual que en el código anterior
            );
          }
        }
      }
    }
  };
};

export const inputs = {};

export const settings = {
  engine: require("@mechanic-design/engine-p5"),
  modules: {},
};