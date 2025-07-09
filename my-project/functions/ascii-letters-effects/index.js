export const handler = ({ inputs, mechanic, sketch }) => {
  let video;
  const canvasWidth = 1080;
  const canvasHeight = 1920;
  const gridSize = 10;
  const asciiLetters = ['x', 's', 'm', 'o', 'u', 'k'];
  const asciiColors = [
    [124, 77, 255],   // x (violeta)
    [29, 233, 182],   // s (verde claro)
    [255, 64, 129],   // m (rosa)
    [0, 229, 255],    // o (celeste)
    [255, 235, 59],   // u (amarillo)
    [255, 241, 118],  // k (amarillo claro)
  ];

  // Umbral para "detectar" figuras: si el brillo es suficientemente distinto del fondo, se muestra la letra y color
  const threshold = 30; // Puedes ajustar este valor para ser más o menos sensible

  sketch.setup = () => {
    sketch.createCanvas(canvasWidth, canvasHeight);
    sketch.pixelDensity(1);
    sketch.background(0);
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.textFont('monospace');
    sketch.textSize(gridSize * 0.6); // Ajusta el tamaño de letra para grids pequeños

    video = sketch.createCapture(sketch.VIDEO, () => {
      video.size(160, 90);
      video.hide();
    });
  };

  sketch.draw = () => {
    sketch.background(0);

    if (video && video.width > 0) {
      video.loadPixels();

      // Tomar el brillo promedio del borde superior como "fondo"
      let borderSum = 0;
      let borderCount = 0;
      for (let x = 0; x < canvasWidth; x += gridSize) {
        const cx = x + gridSize / 2;
        const cy = gridSize / 2;

        const camW = video.width;
        const camH = video.height;
        // CAMBIO: Forzar que el video ocupe el 100% del alto del canvas
        const scale = canvasHeight / camH;
        const cropW = canvasWidth / scale;
        const cropH = canvasHeight / scale;
        const offsetX = (camW - cropW) / 2;
        const offsetY = (camH - cropH) / 2;
        const videoX = offsetX + (cx / canvasWidth) * cropW;
        const videoY = offsetY + (cy / canvasHeight) * cropH;
        const px = Math.floor(sketch.constrain(videoX, 0, camW - 1));
        const py = Math.floor(sketch.constrain(videoY, 0, camH - 1));
        const idx = (px + py * camW) * 4;
        const r = video.pixels[idx];
        const g = video.pixels[idx + 1];
        const b = video.pixels[idx + 2];
        const brightness = (r + g + b) / 3;
        borderSum += brightness;
        borderCount++;
      }
      const bgBrightness = borderCount > 0 ? borderSum / borderCount : 0;

      // ASCII loop
      for (let y = 0; y < canvasHeight; y += gridSize) {
        for (let x = 0; x < canvasWidth; x += gridSize) {
          const cx = x + gridSize / 2;
          const cy = y + gridSize / 2;

          const camW = video.width;
          const camH = video.height;
          // CAMBIO: Forzar que el video ocupe el 100% del alto del canvas
          const scale = canvasHeight / camH;
          const cropW = canvasWidth / scale;
          const cropH = canvasHeight / scale;
          const offsetX = (camW - cropW) / 2;
          const offsetY = (camH - cropH) / 2;
          const videoX = offsetX + (cx / canvasWidth) * cropW;
          const videoY = offsetY + (cy / canvasHeight) * cropH;
          const px = Math.floor(sketch.constrain(videoX, 0, camW - 1));
          const py = Math.floor(sketch.constrain(videoY, 0, camH - 1));
          const idx = (px + py * camW) * 4;
          const r = video.pixels[idx];
          const g = video.pixels[idx + 1];
          const b = video.pixels[idx + 2];
          const brightness = (r + g + b) / 3;

          if (Math.abs(brightness - bgBrightness) > threshold) {
            // Muestra letra y color según brillo real
            let letterIndex;
            if (brightness < 43) {
              letterIndex = 0; // x
            } else if (brightness < 86) {
              letterIndex = 1; // s
            } else if (brightness < 129) {
              letterIndex = 2; // m
            } else if (brightness < 172) {
              letterIndex = 3; // o
            } else if (brightness < 215) {
              letterIndex = 4; // u
            } else {
              letterIndex = 5; // k
            }
            sketch.fill(...asciiColors[letterIndex], 235);
            sketch.text(asciiLetters[letterIndex], cx, cy);
          } else {
            // Fondo: sólo punto gris
            sketch.fill(110, 110, 110, 90);
            sketch.text(".", cx, cy);
          }
        }
      }
    }

    // Indicador de modo
    sketch.noStroke();
    sketch.fill(255, 180);
    sketch.textSize(25);
    sketch.textAlign(sketch.RIGHT, sketch.BOTTOM);
    sketch.text(canvasWidth - 30, canvasHeight - 30);
  };
};

export const inputs = {};

export const settings = {
  engine: require("@mechanic-design/engine-p5"),
  modules: {},
};