(function () {
  const complex = (re, im = 0) => ({ re, im });
  const add = (a, b) => complex(a.re + b.re, a.im + b.im);
  const mul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const expi = (theta) => complex(Math.cos(theta), Math.sin(theta));

  const gateX = () => [
    [complex(0), complex(1)],
    [complex(1), complex(0)]
  ];

  const gateZ = () => [
    [complex(1), complex(0)],
    [complex(0), complex(-1)]
  ];

  const gateH = () => {
    const inv = 1 / Math.sqrt(2);
    return [
      [complex(inv), complex(inv)],
      [complex(inv), complex(-inv)]
    ];
  };

  const gateS = () => [
    [complex(1), complex(0)],
    [complex(0), complex(0, 1)]
  ];

  const gateP = (theta) => [
    [complex(1), complex(0)],
    [complex(0), expi(theta)]
  ];

  const gateRx = (theta) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return [
      [complex(c), complex(0, -s)],
      [complex(0, -s), complex(c)]
    ];
  };

  const gateRz = (theta) => [
    [expi(-theta / 2), complex(0)],
    [complex(0), expi(theta / 2)]
  ];

  const gateCZ = () => [
    [complex(1), complex(0), complex(0), complex(0)],
    [complex(0), complex(1), complex(0), complex(0)],
    [complex(0), complex(0), complex(1), complex(0)],
    [complex(0), complex(0), complex(0), complex(-1)]
  ];

  const gateCNOT01 = () => [
    [complex(1), complex(0), complex(0), complex(0)],
    [complex(0), complex(1), complex(0), complex(0)],
    [complex(0), complex(0), complex(0), complex(1)],
    [complex(0), complex(0), complex(1), complex(0)]
  ];

  const gateCNOT10 = () => [
    [complex(1), complex(0), complex(0), complex(0)],
    [complex(0), complex(0), complex(0), complex(1)],
    [complex(0), complex(0), complex(1), complex(0)],
    [complex(0), complex(1), complex(0), complex(0)]
  ];

  const applySingleQubitGate = (state, gate, target) => {
    const out = [complex(0), complex(0), complex(0), complex(0)];
    for (let a = 0; a < 2; a += 1) {
      for (let b = 0; b < 2; b += 1) {
        const idx = (a << 1) | b;
        if (target === 0) {
          for (let a2 = 0; a2 < 2; a2 += 1) {
            const outIdx = (a2 << 1) | b;
            out[outIdx] = add(out[outIdx], mul(gate[a2][a], state[idx]));
          }
        } else {
          for (let b2 = 0; b2 < 2; b2 += 1) {
            const outIdx = (a << 1) | b2;
            out[outIdx] = add(out[outIdx], mul(gate[b2][b], state[idx]));
          }
        }
      }
    }
    return out;
  };

  const applyTwoQubitGate = (state, gate) => {
    const out = [complex(0), complex(0), complex(0), complex(0)];
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 4; j += 1) {
        out[i] = add(out[i], mul(gate[i][j], state[j]));
      }
    }
    return out;
  };

  const buildGate = (gateName, theta) => {
    switch (gateName) {
      case 'X':
        return gateX();
      case 'Z':
        return gateZ();
      case 'S':
        return gateS();
      case 'P':
        return gateP(theta || 0);
      case 'H':
        return gateH();
      case 'Rx':
        return gateRx(theta || 0);
      case 'Rz':
        return gateRz(theta || 0);
      default:
        return gateH();
    }
  };

  const computeStateFromSteps = (steps) => {
    let state = [complex(1), complex(0), complex(0), complex(0)];
    steps.forEach((step) => {
      if (step.type === 'single') {
        state = applySingleQubitGate(state, buildGate(step.gate, step.theta), step.target);
      } else if (step.type === 'cz') {
        state = applyTwoQubitGate(state, gateCZ());
      } else if (step.type === 'cnot') {
        if (step.control === 0 && step.target === 1) {
          state = applyTwoQubitGate(state, gateCNOT01());
        } else {
          state = applyTwoQubitGate(state, gateCNOT10());
        }
      }
    });
    return state;
  };

  const stateToProbs = (state) => state.map((amp) => amp.re * amp.re + amp.im * amp.im);

  const applyBitFlipNoise = (probs, p) => {
    const out = [0, 0, 0, 0];
    for (let from = 0; from < 4; from += 1) {
      for (let to = 0; to < 4; to += 1) {
        let weight = 1;
        for (let bit = 0; bit < 2; bit += 1) {
          const same = ((from >> bit) & 1) === ((to >> bit) & 1);
          weight *= same ? (1 - p) : p;
        }
        out[to] += probs[from] * weight;
      }
    }
    return out;
  };

  const clampPct = (value) => Math.min(100, Math.max(0, value));

  const renderHistogram = (container, probs) => {
    const bars = container.querySelectorAll('[data-bar]');
    const values = container.querySelectorAll('[data-value]');
    probs.forEach((prob, idx) => {
      const heightPct = clampPct(prob * 100);
      const bar = bars[idx];
      const value = values[idx];
      if (bar) bar.style.height = `${heightPct}%`;
      if (value) value.textContent = `${heightPct.toFixed(1)}%`;
    });
  };

  window.SimuladorCore = {
    computeStateFromSteps,
    stateToProbs,
    applyBitFlipNoise,
    renderHistogram
  };
})();
