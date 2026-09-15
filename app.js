"use strict";

const NB_POSITIONS = 73;
const STEP = 360 / NB_POSITIONS;
const MASS = 1.2;
const TOLERANCE = 0.10;
const MAX_MASSES = 15;
const FORBIDDEN = new Set(["72-73", "73-1", "1-2"]);

const angleMode = document.getElementById("angleMode");
const angleInput = document.getElementById("angleInput");
const angleLabel = document.getElementById("angleLabel");
const angleHelp = document.getElementById("angleHelp");
const massInput = document.getElementById("massInput");
const calcBtn = document.getElementById("calcBtn");
const statusText = document.getElementById("statusText");
const resultCard = document.getElementById("resultCard");
const diagramCard = document.getElementById("diagramCard");

const rAngle = document.getElementById("rAngle");
const rCorrection = document.getElementById("rCorrection");
const rMass = document.getElementById("rMass");
const rCount = document.getElementById("rCount");
const rTotal = document.getElementById("rTotal");
const rResidual = document.getElementById("rResidual");
const placementList = document.getElementById("placementList");

function normalize(angle) {
  const x = angle % 360;
  return x >= 0 ? x : x + 360;
}

function angularDistance(a, b) {
  let d = Math.abs(normalize(a) - normalize(b));
  if (d > 180) d = 360 - d;
  return d;
}

function parseFR(value) {
  return Number(String(value).trim().replace(",", "."));
}

function fmt(value, digits = 3) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function buildIntervals(correctionAngle) {
  const intervals = [];

  for (let p1 = 1; p1 <= NB_POSITIONS; p1++) {
    const p2 = p1 === NB_POSITIONS ? 1 : p1 + 1;
    const name = `${p1}-${p2}`;

    if (FORBIDDEN.has(name)) continue;

    const angle1 = (p1 - 1) * STEP;
    let angle2 = (p2 - 1) * STEP;
    if (p1 === NB_POSITIONS && p2 === 1) angle2 = 360;

    const angle = normalize((angle1 + angle2) / 2);
    const rad = angle * Math.PI / 180;

    intervals.push({
      p1, p2, name, angle,
      x: Math.cos(rad),
      y: Math.sin(rad),
      distance: angularDistance(angle, correctionAngle)
    });
  }

  intervals.sort((a, b) => {
    const d = a.distance - b.distance;
    return Math.abs(d) > 1e-12 ? d : a.angle - b.angle;
  });

  return intervals;
}

function solve(angleInputValue, imbalanceMass, mode = "imbalance") {
  if (!Number.isFinite(angleInputValue) || !Number.isFinite(imbalanceMass) || imbalanceMass <= 0) {
    throw new Error("Saisissez un angle valide et un balourd strictement supérieur à 0.");
  }

  const enteredAngle = normalize(angleInputValue);
  // Mode "correction" : l'angle saisi est directement l'endroit exact
  // où la correction doit être posée. Aucun +180° n'est ajouté.
  const correctionAngle = mode === "correction" ? enteredAngle : normalize(enteredAngle + 180);
  const angle = mode === "correction" ? normalize(enteredAngle + 180) : enteredAngle;
  const intervals = buildIntervals(correctionAngle);

  const minimumTheoretical = Math.max(
    1,
    Math.ceil((imbalanceMass - TOLERANCE) / MASS)
  );

  if (minimumTheoretical > MAX_MASSES) {
    throw new Error("Le balourd demandé nécessite plus de masses que la limite de recherche actuelle.");
  }

  for (let count = minimumTheoretical; count <= MAX_MASSES; count++) {
    const solution = bestSolution(intervals, correctionAngle, imbalanceMass, count);
    if (solution) return { ...solution, angle, correctionAngle };
  }

  throw new Error("Aucune solution trouvée dans la tolérance de 0,10 g.");
}

function bestSolution(intervals, correctionAngle, imbalanceMass, count) {
  const correctionRad = correctionAngle * Math.PI / 180;
  const targetX = imbalanceMass * Math.cos(correctionRad);
  const targetY = imbalanceMass * Math.sin(correctionRad);

  let bestResidual = Infinity;
  let bestPlacements = null;
  const selected = [];

  function search(startIndex, sumX, sumY) {
    const remaining = count - selected.length;

    if (remaining === 0) {
      const residual = Math.hypot(sumX - targetX, sumY - targetY);

      if (residual <= TOLERANCE && residual < bestResidual) {
        bestResidual = residual;
        bestPlacements = selected.map(i => ({
          p1: i.p1,
          p2: i.p2,
          angle: i.angle,
          mass: MASS,
          name: i.name
        }));
      }
      return;
    }

    if (intervals.length - startIndex < remaining) return;

    const distanceToTarget = Math.hypot(sumX - targetX, sumY - targetY);
    const maxReach = remaining * MASS;
    if (distanceToTarget > maxReach + TOLERANCE) return;

    const currentMagnitude = Math.hypot(sumX, sumY);
    if (currentMagnitude + maxReach < imbalanceMass - TOLERANCE) return;

    const lastStart = intervals.length - remaining;

    for (let index = startIndex; index <= lastStart; index++) {
      const interval = intervals[index];

      const newX = sumX + MASS * interval.x;
      const newY = sumY + MASS * interval.y;

      const afterRemaining = remaining - 1;
      const distanceAfter = Math.hypot(newX - targetX, newY - targetY);
      const maxAfterReach = afterRemaining * MASS;

      if (distanceAfter > maxAfterReach + TOLERANCE) continue;

      const magnitudeAfter = Math.hypot(newX, newY);
      if (magnitudeAfter + maxAfterReach < imbalanceMass - TOLERANCE) continue;

      selected.push(interval);
      search(index + 1, newX, newY);
      selected.pop();

      if (bestResidual < 1e-8) return;
    }
  }

  search(0, 0, 0);

  if (!bestPlacements) return null;

  // Présentation des masses dans l'ordre croissant des positions.
  // Exemple : 5-6, 13-14, 20-21, 68-69.
  const sortedPlacements = [...bestPlacements].sort((a, b) => {
    if (a.p1 !== b.p1) return a.p1 - b.p1;
    return a.p2 - b.p2;
  });

  return {
    placements: sortedPlacements,
    residual: bestResidual,
    totalMass: sortedPlacements.length * MASS
  };
}

function renderResult(solution, imbalanceMass) {
  rAngle.textContent = `${fmt(solution.angle)}°`;
  rCorrection.textContent = `${fmt(solution.correctionAngle)}°`;
  rMass.textContent = `${fmt(imbalanceMass)} g`;
  rCount.textContent = String(solution.placements.length);
  rTotal.textContent = `${fmt(solution.totalMass)} g`;
  rResidual.textContent = `${fmt(solution.residual)} g`;

  placementList.innerHTML = "";

  solution.placements.forEach((p, index) => {
    const row = document.createElement("div");
    row.className = "placement";
    row.innerHTML = `
      <span class="placement-index">${index + 1}</span>
      <span class="placement-text">
        <strong>Entre P${p.p1} et P${p.p2}</strong>
        <small>Angle milieu : ${fmt(p.angle)}°</small>
      </span>
      <span class="placement-mass">1,2 g</span>
    `;
    placementList.appendChild(row);
  });

  resultCard.classList.remove("hidden");
  diagramCard.classList.remove("hidden");
  drawDiagram(solution, imbalanceMass);
}

function polar(cx, cy, radius, angle) {
  const rad = angle * Math.PI / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad)
  };
}

function drawArrow(ctx, cx, cy, radius, angle, color, width) {
  const p = polar(cx, cy, radius, angle);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  const a = Math.atan2(p.y - cy, p.x - cx);
  const size = 18;

  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(
    p.x - size * Math.cos(a - Math.PI / 6),
    p.y - size * Math.sin(a - Math.PI / 6)
  );
  ctx.lineTo(
    p.x - size * Math.cos(a + Math.PI / 6),
    p.y - size * Math.sin(a + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDiagram(solution, imbalanceMass) {
  const canvas = document.getElementById("diagram");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = 310;

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const bg = dark ? "#18222d" : "#ffffff";
  const text = dark ? "#eef6fb" : "#163247";
  const muted = dark ? "#8fa5b4" : "#7c8c99";

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Axes
  ctx.save();
  ctx.strokeStyle = dark ? "rgba(255,255,255,.20)" : "rgba(18,55,82,.18)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.stroke();
  ctx.restore();

  // Main circle
  ctx.strokeStyle = text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Position dots + labels
  const labels = new Set([1, 10, 20, 30, 40, 50, 60, 70, 73]);

  for (let p = 1; p <= NB_POSITIONS; p++) {
    const angle = (p - 1) * STEP;
    const pt = polar(cx, cy, radius, angle);

    ctx.beginPath();
    ctx.fillStyle = bg;
    ctx.strokeStyle = text;
    ctx.lineWidth = labels.has(p) ? 2.2 : 1.5;
    ctx.arc(pt.x, pt.y, labels.has(p) ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (labels.has(p)) {
      const lp = polar(cx, cy, radius + 38, angle);
      ctx.fillStyle = text;
      ctx.font = "700 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`P${p}`, lp.x, lp.y);
    }
  }

  // 0°
  ctx.fillStyle = muted;
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("0°", cx, cy - radius - 70);

  // Forbidden intervals
  const forbiddenPairs = [[72,73],[73,1],[1,2]];
  ctx.strokeStyle = "#e12d2d";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";

  for (const [p1,p2] of forbiddenPairs) {
    const a1 = (p1 - 1) * STEP;
    let a2 = (p2 - 1) * STEP;
    if (p1 === 73 && p2 === 1) a2 = 360;

    const start = polar(cx, cy, radius + 12, a1);
    const end = polar(cx, cy, radius + 12, a2);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  drawArrow(ctx, cx, cy, radius * .72, solution.angle, "#e12d2d", 8);
  drawArrow(ctx, cx, cy, radius * .72, solution.correctionAngle, "#1e9b50", 8);

  // Vector labels
  let p = polar(cx, cy, radius * .42, solution.angle);
  ctx.fillStyle = "#e12d2d";
  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BALOURD", p.x, p.y - 10);
  ctx.font = "700 16px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`${fmt(imbalanceMass)} g`, p.x, p.y + 14);

  p = polar(cx, cy, radius * .42, solution.correctionAngle);
  ctx.fillStyle = "#1e9b50";
  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("CORRECTION", p.x, p.y);

  // Correction masses
  solution.placements.forEach((placement, index) => {
    const mp = polar(cx, cy, radius, placement.angle);
    const lp = polar(cx, cy, radius + 72 + (index % 2) * 30, placement.angle);

    ctx.strokeStyle = "rgba(23,100,154,.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mp.x, mp.y);
    ctx.lineTo(lp.x, lp.y);
    ctx.stroke();

    ctx.fillStyle = "#17649a";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const boxW = 118, boxH = 54;
    ctx.fillStyle = "#17649a";
    roundRect(ctx, lp.x - boxW/2, lp.y - boxH/2, boxW, boxH, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 15px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(placement.name, lp.x, lp.y - 10);
    ctx.font = "700 14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("1,2 g", lp.x, lp.y + 11);
  });

  // Center
  ctx.fillStyle = text;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function runCalculation() {
  const angle = parseFR(angleInput.value);
  const mass = parseFR(massInput.value);

  calcBtn.disabled = true;
  calcBtn.textContent = "Calcul en cours…";
  statusText.textContent = "Recherche du nombre minimum de masses…";

  setTimeout(() => {
    try {
      const solution = solve(angle, mass, angleMode.value);
      renderResult(solution, mass);
      statusText.textContent = "Solution trouvée.";
      setTimeout(() => {
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      resultCard.classList.add("hidden");
      diagramCard.classList.add("hidden");
      statusText.textContent = err.message || String(err);
    } finally {
      calcBtn.disabled = false;
      calcBtn.textContent = "Calculer l’équilibrage";
    }
  }, 40);
}

function updateAngleModeUI() {
  const direct = angleMode.value === "correction";
  angleLabel.textContent = direct ? "Angle à compenser" : "Angle du balourd";
  angleInput.setAttribute("aria-label", direct ? "Angle à compenser" : "Angle du balourd");
  angleHelp.textContent = direct
    ? "Saisissez directement l’endroit exact où la correction doit être appliquée. Aucun +180° ne sera ajouté."
    : "Saisissez la position du balourd. La correction sera calculée automatiquement à l’opposé (+180°).";
}
angleMode.addEventListener("change", updateAngleModeUI);
updateAngleModeUI();

calcBtn.addEventListener("click", runCalculation);

[angleInput, massInput].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") runCalculation();
  });
});

// PWA service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

// Install prompt (Android/Chromium; iOS uses Safari Share > Add to Home Screen)
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  document.getElementById("installCard")?.classList.add("hidden");
});