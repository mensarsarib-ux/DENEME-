# Kareleri ses ve efektlerle birleştirir: python3 sfx_real.py && python3 mux.py
import subprocess, numpy as np, wave, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SR = 44100; DUR = 18.05
os.makedirs('out', exist_ok=True)
cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-i', 'frames/%05d.jpg',
       '-i', 'assets/voice.mp3', '-i', 'assets/sfx.wav', '-i', 'assets/music.wav',
       '-filter_complex', '[1:a]volume=1.0[va];[2:a]volume=0.8[sa];[3:a]volume=0.12[ma];[va][sa][ma]amix=inputs=3:duration=longest:normalize=0[aout]',
       '-map', '0:v', '-map', '[aout]', '-t', f'{DUR}', '-ac', '2',
       '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30',
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/hesabim-tanitim.mp4']
# Ses normalizasyonu (Reels için yaklaşık -14 LUFS, tepe -1 dBTP)
subprocess.run(['ffmpeg','-y','-v','error','-i','out/hesabim-tanitim.mp4','-c:v','copy','-af','loudnorm=I=-14:TP=-1:LRA=11','-c:a','aac','-b:a','192k','out/hesabim-reels.mp4'],check=True)
subprocess.run(cmd, check=True)
print('tamam')
