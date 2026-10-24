// Aviso de fim do descanso: 3 bipes curtos e vibração.
// iPhone: o Safari só toca som depois de um toque do usuário (por isso `prepararSom` é chamado no
// botão Descansar), não toca com a tela bloqueada nem no modo silencioso, e não vibra (não tem a API).

let audio: AudioContext | null = null;

type ComSessao = Navigator & { audioSession?: { type: string } };

export function prepararSom() {
  try {
    // "transient": som curto que mistura com a música que estiver tocando, sem pausá-la.
    const sessao = (navigator as ComSessao).audioSession;
    if (sessao) sessao.type = 'transient';
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // sem áudio: o aviso fica só na tela
  }
}

export function alertar() {
  try { navigator.vibrate?.([300, 150, 300]); } catch { /* sem vibração */ }
  if (!audio) return;
  try {
    const t0 = audio.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator();
      const vol = audio.createGain();
      osc.frequency.value = 880;
      osc.connect(vol);
      vol.connect(audio.destination);
      const t = t0 + i * 0.35;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.27);
    }
  } catch {
    // sem áudio: o aviso fica só na tela
  }
}
