import {defineConfig} from 'vite';
import motionCanvasModule from '@motion-canvas/vite-plugin';
import ffmpegModule from '@motion-canvas/ffmpeg';

// Bu paketler CommonJS olarak yayınlanıyor; ESM içe aktarmada varsayılan dışa aktarım iç içe geliyor
const motionCanvas = (motionCanvasModule as any).default ?? motionCanvasModule;
const ffmpeg = (ffmpegModule as any).default ?? ffmpegModule;

export default defineConfig({
  plugins: [
    motionCanvas({
      project: './src/project.ts',
    }),
    ffmpeg(),
  ],
});
