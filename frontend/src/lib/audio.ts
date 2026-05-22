/**
 * Sequentially plays PCM16 audio chunks from Gemini Live.
 * Gemini sends audio at 24kHz mono.
 */
export class PcmPlayer {
  private ctx: AudioContext;
  private nextStart = 0;
  private readonly sampleRate: number;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.ctx = new AudioContext({ sampleRate });
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueue(base64: string) {
    const bytes = base64ToBytes(base64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 0x8000;

    const buf = this.ctx.createBuffer(1, float.length, this.sampleRate);
    buf.copyToChannel(float, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const startAt = Math.max(now, this.nextStart);
    src.start(startAt);
    this.nextStart = startAt + buf.duration;
  }

  interrupt() {
    this.nextStart = this.ctx.currentTime;
  }

  close() {
    this.ctx.close();
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
