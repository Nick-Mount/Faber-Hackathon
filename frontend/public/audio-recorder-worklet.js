// AudioWorklet that downsamples mic input to 16 kHz mono PCM16 and posts
// ~100ms chunks back to the main thread.
class RecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = 16000;
    this.inputRate = sampleRate; // AudioWorklet global
    this.ratio = this.inputRate / this.targetRate;
    this.chunkSize = Math.round(this.targetRate * 0.1); // 100ms @ 16kHz
    this.buffer = [];
    this._acc = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];

    // Naive linear-interp downsample to targetRate.
    for (let i = 0; i < ch.length; i++) {
      this._acc += 1;
      if (this._acc >= this.ratio) {
        this._acc -= this.ratio;
        const s = Math.max(-1, Math.min(1, ch[i]));
        this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
        if (this.buffer.length >= this.chunkSize) {
          const out = new Int16Array(this.buffer);
          this.buffer = [];
          this.port.postMessage(out, [out.buffer]);
        }
      }
    }
    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
