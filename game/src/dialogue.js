// Solmar Bay — mission dialogue and cutscene subtitles.
// One job: the words. Every mission opens with a short briefing line and
// answers back at its turning points, so the story is heard, not just
// read off the objective bar. Lines play as a subtitle card at the bottom
// of the screen for a few seconds each; staged scenes pin a line open
// (long duration) so the screenshot catches the exchange mid-sentence.

export function createDialogue() {
  return { queue: [], active: null, timer: 0 };
}

// Queue a subtitle. Speaker is shown in gold, the line in white.
export function say(S, speaker, text, duration = 4) {
  if (!S.dialogue) return;
  S.dialogue.queue.push({ speaker, text, duration });
}

export function updateDialogue(S, dt) {
  const d = S.dialogue;
  if (!d) return;
  if (d.active) {
    d.timer -= dt;
    if (d.timer <= 0) d.active = null;
  }
  if (!d.active && d.queue.length > 0) {
    d.active = d.queue.shift();
    d.timer = d.active.duration;
  }
}

export function drawDialogue(ctx, S) {
  const d = S.dialogue;
  if (!d || !d.active) return;
  const line = d.active;
  ctx.font = 'bold 15px sans-serif';
  const textW = ctx.measureText(`${line.speaker}: ${line.text}`).width;
  const w = Math.min(880, textW + 36);
  const x0 = (1280 - w) / 2;
  const y0 = 720 - 108;
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, 34, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 61, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(line.speaker, x0 + 18, y0 + 22);
  const speakerW = ctx.measureText(line.speaker).width;
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(`: ${line.text}`, x0 + 18 + speakerW, y0 + 22);
  ctx.textAlign = 'center';
}

export const MISSION_BRIEFINGS = {
  0: [
    ['RICO', 'First job. Steal a car, bring it to the garage — and try not to scratch it.'],
    ['MARLA', 'Sports car pays extra. The garage loves a fast one.'],
  ],
  1: [
    ['MARLA', 'Package at the north docks. Ninety seconds. The buyer does not wait.'],
    ['RICO', 'Ninety seconds? I drive fast. That is the whole job.'],
  ],
  2: [
    ['DISPATCH', 'All units: Rico Vega, three stars. Bring him in.'],
    ['RICO', 'Three stars for one afternoon. Lay low, lose them, get paid.'],
  ],
  3: [
    ['KING', 'Rico. You came to the wrong plaza, wheelman.'],
    ['RICO', 'Wrong plaza? This is the one with your name on it.'],
  ],
  4: [
    ['MARLA', 'Solmar Bank. Crack the vault, hold still — then run like the whole city is watching.'],
    ['RICO', 'It will be. Five stars of it.'],
  ],
};

export const MISSION_OUTROS = {
  0: ['MARLA', 'Clean wheels. The garage is happy — and so is my cut.'],
  1: ['MARLA', 'Delivered with time to spare. The buyer sends his regards. And a bonus.'],
  2: ['RICO', 'Heat gone. Solmar PD, you will have to try harder than that.'],
  3: ['KING', '…Finish it clean, Vega. The plaza is yours.'],
  4: ['MARLA', 'Five thousand, two hundred and fifty. Solmar Bay is ours, Rico.'],
};
