# Kareleri ses ve efektlerle birleştirir: python3 sfx_real.py && python3 mux.py
import subprocess, numpy as np, wave, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SR = 44100; DUR = 18.05
os.makedirs('out', exist_ok=True)
cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-i', 'frames/%05d.jpg',
       '-i', 'assets/voice.mp3', '-i', 'assets/sfx.wav', '-i', 'assets/music.wav',
       '-filter_complex', '[1:a]volume=1.0[va];[2:a]volume=0.8[sa];[3:a]volume=0.12[ma];[va][sa][ma]amix=inputs=3:duration=longest:normalize=0[aout]',
       '-map', '0:v', '-map', '[aout]', '-t', f'{DUR}',
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/hesabim-tanitim.mp4']
subprocess.run(cmd, check=True)
print('tamam')
