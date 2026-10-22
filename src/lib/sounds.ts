/**
 * Arayüz sesleri. Hepsi Web Audio ile üretilir; hazır ses dosyası yoktur.
 * Gerçek bir tuş sesi tek bir ton değil, üst üste binen birkaç parçadır:
 *  - "tık": çok kısa, filtrelenmiş bir gürültü darbesi (dokunma anı)
 *  - gövde: perdesi hızla düşen alçak bir ton (tokluk)
 *  - ahşap tonu: gövdeye hafif sıcaklık veren kısa orta frekans
 *  - çok kısa oda yankısı (sesi "boşlukta" değil, bir cismin üzerinde gösterir)
 * Kaydetme sesi ise cam gibi iki notalı yumuşak bir çandır.
 * Fonksiyonlar hem AudioContext hem OfflineAudioContext ile çalışır (ses önizlemesi için).
 */
export type SoundKind = "light" | "medium" | "success" | "warning";

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Yarım saniyelik beyaz gürültü; "tık" parçaları bundan kesilir */
function noise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

/** Sessizlikten tepe değere hızlı çıkış, sonra üstel sönüm */
function envelope(
  gain: AudioParam,
  at: number,
  peak: number,
  attack: number,
  decay: number,
) {
  gain.setValueAtTime(0.0001, at);
  gain.linearRampToValueAtTime(peak, at + attack);
  gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

/** Dokunma anının "tık"ı: filtrelenmiş kısa gürültü */
function click(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  o: { freq: number; q: number; gain: number; decay: number },
) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = o.freq;
  filter.Q.value = o.q;
  const amp = ctx.createGain();
  envelope(amp.gain, at, o.gain, 0.0005, o.decay);
  source.connect(filter).connect(amp).connect(out);
  source.start(at, Math.random() * 0.3);
  source.stop(at + o.decay + 0.02);
}

/** Tokluğu veren gövde: perdesi hızla düşen kısa ton */
function body(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  o: { from: number; to: number; glide: number; gain: number; decay: number },
) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(o.from, at);
  osc.frequency.exponentialRampToValueAtTime(o.to, at + o.glide);
  const amp = ctx.createGain();
  envelope(amp.gain, at, o.gain, 0.0015, o.decay);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + o.decay + 0.03);
}

/** Cam gibi yumuşak çan: ana ton ve iki üst ton, üst tonlar daha çabuk söner */
function bell(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  o: { gain: number; decay: number },
) {
  const partials: [ratio: number, level: number, life: number][] = [
    [1, 1, 1],
    [2.01, 0.28, 0.55],
    [3.02, 0.1, 0.35],
  ];
  for (const [ratio, level, life] of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const amp = ctx.createGain();
    envelope(amp.gain, at, o.gain * level, 0.004, o.decay * life);
    osc.connect(amp).connect(out);
    osc.start(at);
    osc.stop(at + o.decay * life + 0.05);
  }
}

/** Çok kısa oda yankısı için yapay izlenim (impulse response) */
function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}

/**
 * Seslerin geçtiği hat: hafif oda yankısı + sıkıştırıcı (aşırı yükselmeyi önler).
 * Dönen düğüm seslerin bağlanacağı girişidir.
 */
export function createBus(ctx: BaseAudioContext): AudioNode {
  const input = ctx.createGain();
  // Art arda yazarken rahatsız etmesin diye kısık; kaydetme çanı tuşlardan biraz belirgin
  input.gain.value = 0.55;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.08;
  compressor.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 1;
  input.connect(dry).connect(compressor);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 0.22);
  const wet = ctx.createGain();
  wet.gain.value = 0.14;
  input.connect(reverb).connect(wet).connect(compressor);

  return input;
}

/** Belirtilen anda (`at`, saniye) ilgili sesi çalar */
export function scheduleSound(
  ctx: BaseAudioContext,
  bus: AudioNode,
  kind: SoundKind,
  at: number,
): void {
  switch (kind) {
    case "light":
      // Tuş: kısa, tok, hafif ahşabımsı
      click(ctx, bus, at, { freq: 2800, q: 0.9, gain: 0.5, decay: 0.012 });
      body(ctx, bus, at, { from: 420, to: 200, glide: 0.03, gain: 0.55, decay: 0.055 });
      body(ctx, bus, at, { from: 900, to: 600, glide: 0.02, gain: 0.14, decay: 0.022 });
      break;
    case "medium":
      // Pencere açılışı: tuştan daha dolgun ve alçak
      click(ctx, bus, at, { freq: 2200, q: 0.8, gain: 0.55, decay: 0.018 });
      body(ctx, bus, at, { from: 300, to: 130, glide: 0.05, gain: 0.7, decay: 0.09 });
      body(ctx, bus, at, { from: 700, to: 400, glide: 0.03, gain: 0.2, decay: 0.04 });
      break;
    case "success":
      // Kaydetme: yumuşak bir dokunuş ve ardından cam gibi iki notalı çan
      click(ctx, bus, at, { freq: 2400, q: 0.9, gain: 0.3, decay: 0.012 });
      body(ctx, bus, at, { from: 380, to: 190, glide: 0.03, gain: 0.32, decay: 0.05 });
      bell(ctx, bus, at + 0.02, 1046.5, { gain: 0.3, decay: 0.45 });
      bell(ctx, bus, at + 0.1, 1568, { gain: 0.27, decay: 0.55 });
      break;
    case "warning":
      // Silme: alçak, kapanan bir "güm" ve hafif ikinci vuruş
      body(ctx, bus, at, { from: 240, to: 70, glide: 0.12, gain: 0.75, decay: 0.2 });
      click(ctx, bus, at, { freq: 900, q: 0.7, gain: 0.5, decay: 0.06 });
      body(ctx, bus, at + 0.11, { from: 200, to: 65, glide: 0.1, gain: 0.45, decay: 0.16 });
      break;
  }
}
