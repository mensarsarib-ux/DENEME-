# Video araçları

Tanıtım videosu (`video/`) için yardımcı araçlar. Uygulamanın derlemesinden bağımsızdır.

## Gereksinimler
- **FFmpeg** (sistem programı): video kesme ve MP4 çıktısı için. macOS: `brew install ffmpeg`. Motion Canvas render'ı da bunu kullanır.
- **Python 3.10+**

## Kurulum
```
cd tools
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
Whisper ilk kullanımda ses modelini indirir ve PyTorch büyük bir kütüphanedir; kurulum uzun sürebilir.

## Araçlar
- **Whisper** (OpenAI, MIT): ses dosyasından altyazı üretir. Örnek:
  `whisper ses.mp3 --language Turkish --model small --output_format srt`
- **yt-dlp** (Unlicense): video indirir. **Kullanım sınırı:** Yalnızca kendi videolarını ya da indirme izni verilmiş içerikleri indir. Başkasının videosunu izinsiz indirip yeniden kullanmak telif hakkını ve platformun kullanım koşullarını ihlal eder.

## Notlar
- Bu araçlar bilgisayarında çalışır, depoda çalıştırılmaz.
- Ücretli API anahtarı gerektirmez (Whisper yerelde çalışır).
