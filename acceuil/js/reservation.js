const API_URL = "http://localhost/Club_Sportif/shared-backend/api/reservations.php";
const SPORT   = document.body.dataset.sport || "padel";

const SPORT_CONFIG = {
  padel: {
    courtField: "padel-court",
    courts: {
      padel1: "Padel 1 – Extérieur",
      padel2: "Padel 2 – Intérieur",
      padel3: "Padel 3 – Extérieur",
    },
  },
  basketball: {
    courtField: "basketball-court",
    courts: {
      terrain1: "Terrain Intérieur – Parquet professionnel",
      terrain2: "Terrain Extérieur – Revêtement synthétique",
    },
  },
};
const CONFIG = SPORT_CONFIG[SPORT];


function formatDate(d) {
  const [y, m, j] = d.split("-");
  return `${j}/${m}/${y}`;
}
function heureFinLabel(h) {
  return String(parseInt(h) + 1).padStart(2, "0") + ":00";
}
function formatHeure(t) { return t.slice(0, 5); }


function initLiveValidation() {
  const rules = {
    name:  { test: v => v.trim().length >= 2,          msg: "Au moins 2 caractères" },
    email: { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: "Email invalide" },
    phone: { test: v => /^[0-9+\s\-]{8,15}$/.test(v), msg: "8 à 15 chiffres" },
  };

  Object.entries(rules).forEach(([id, rule]) => {
    const input = document.getElementById(id);
    if (!input) return;


    const indicator = document.createElement("span");
    indicator.className = "field-indicator";
    input.parentElement.style.position = "relative";
    input.parentElement.appendChild(indicator);

    input.addEventListener("input", () => {
      const ok = rule.test(input.value);
      indicator.textContent = ok ? "✓" : "✗";
      indicator.className   = "field-indicator " + (ok ? "fi-ok" : "fi-err");
      input.classList.toggle("input-ok",  ok);
      input.classList.toggle("input-err", !ok && input.value.length > 0);
    });
  });
}


async function refreshTimeSelect() {
  const court      = document.getElementById(CONFIG.courtField)?.value;
  const date       = document.getElementById("reservation-date")?.value;
  const timeSelect = document.getElementById("reservation-time");
  if (!timeSelect) return;

  timeSelect.disabled = true;
  const loadingOpt = document.createElement("option");
  loadingOpt.id   = "loading-opt";
  loadingOpt.text = "⏳ Vérification des disponibilités...";
  timeSelect.prepend(loadingOpt);

  Array.from(timeSelect.options).forEach(opt => {
    if (!opt.value) return;
    opt.disabled = false;
    opt.text     = `${opt.value} – ${heureFinLabel(opt.value)}`;
  });

  if (!court || !date) {
    timeSelect.disabled = false;
    document.getElementById("loading-opt")?.remove();
    return;
  }

  try {
    const res  = await fetch(`${API_URL}?activite=${SPORT}&salle=${court}&date=${date}`);
    const json = await res.json();

    document.getElementById("loading-opt")?.remove();
    timeSelect.disabled = false;

    if (!json.success) return;

    const prises = json.data
      .filter(r => r.statut === "confirmee")
      .map(r => formatHeure(r.heure_debut));

    let disabledCount = 0;
    Array.from(timeSelect.options).forEach(opt => {
      if (!opt.value) return;
      const taken  = prises.includes(opt.value);
      opt.disabled = taken;
      opt.text     = taken
        ? `${opt.value} – ${heureFinLabel(opt.value)}  ✗ Indisponible`
        : `${opt.value} – ${heureFinLabel(opt.value)}`;
      if (taken) disabledCount++;
    });

    updateAvailabilityBadge(13 - disabledCount, 13);

    if (timeSelect.value && prises.includes(timeSelect.value)) timeSelect.value = "";
  } catch {
    document.getElementById("loading-opt")?.remove();
    timeSelect.disabled = false;
  }
}

function updateAvailabilityBadge(dispo, total) {
  let badge = document.getElementById("availability-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "availability-badge";
    document.getElementById("reservation-time")
      ?.closest(".form-group")
      ?.appendChild(badge);
  }
  const pct   = Math.round((dispo / total) * 100);
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#f59e0b" : "#ef4444";
  badge.innerHTML = `
    <div class="avail-bar-wrap">
      <div class="avail-bar" style="width:${pct}%;background:${color}"></div>
    </div>
    <span style="color:${color};font-weight:600">${dispo}/${total} créneaux disponibles</span>
  `;
}


function setLoading(on) {
  const btn = document.querySelector("#contactForm button[type='submit']");
  if (!btn) return;
  btn.disabled = on;
  if (on) {
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-btn"></span> Réservation en cours...`;
  } else {
    btn.innerHTML = btn.dataset.original || "Réserver";
  }
}


function showConfirmation(court, date, time, reservationId) {
  const courtLabel = CONFIG.courts[court] || court;
  const timeFin    = heureFinLabel(time);
  const numRef = "RES-" + String(reservationId).padStart(6, "0");

  document.getElementById("confirm-card")?.remove();

  const card = document.createElement("div");
  card.id    = "confirm-card";
  card.innerHTML = `
    <div class="confirm-inner">
      <div class="confirm-icon">
        <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" stroke="#22c55e" stroke-width="2"/>
          <path class="check-path" d="M14 27l8 8 16-16" stroke="#22c55e" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="confirm-title">Réservation confirmée !</h3>
      <div class="confirm-ref">
        <span class="ref-label">N° de réservation</span>
        <span class="ref-number">${numRef}</span>
        <span class="ref-hint">Présentez ce numéro à l'accueil</span>
      </div>
      <div class="confirm-details">
        <div class="confirm-row">
          <span class="confirm-label">🏟️ Terrain</span>
          <span class="confirm-value">${courtLabel}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">📅 Date</span>
          <span class="confirm-value">${formatDate(date)}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">🕐 Créneau</span>
          <span class="confirm-value">${time} – ${timeFin}</span>
        </div>
      </div>
      <button class="confirm-close" onclick="document.getElementById('confirm-card').remove()">
        Fermer
      </button>
    </div>
  `;

  const btn = document.querySelector("#contactForm .text-center");
  btn?.appendChild(card);

  setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
}

function showError(msg) {
  let err = document.getElementById("error-msg");
  if (!err) {
    err    = document.createElement("div");
    err.id = "error-msg";
    document.querySelector("#contactForm .text-center")?.appendChild(err);
  }
  err.className   = "error-msg-box";
  err.innerHTML   = `⚠️ ${msg}`;
  err.style.display = "block";
  setTimeout(() => { if (err) err.style.display = "none"; }, 5000);
}


function initForm() {
  const form      = document.getElementById("contactForm");
  const dateInput = document.getElementById("reservation-date");
  if (!form) return;

  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  document.getElementById(CONFIG.courtField)?.addEventListener("change", refreshTimeSelect);
  dateInput?.addEventListener("change", refreshTimeSelect);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    this.classList.add("was-validated");
    document.getElementById("error-msg")?.remove();

    if (!this.checkValidity()) {
      showError("Veuillez remplir tous les champs correctement.");
      return;
    }

    const court = document.getElementById(CONFIG.courtField)?.value;
    const date  = document.getElementById("reservation-date")?.value;
    const time  = document.getElementById("reservation-time")?.value;
    const name  = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();

    setLoading(true);

    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nom: name, email, telephone: phone,
          activite: SPORT, salle: court,
          date_reservation: date,
          heure_debut: time + ":00",
        }),
      });
      const json = await res.json();

      if (json.success) {
        showConfirmation(court, date, time, json.id);
        this.reset();
        this.classList.remove("was-validated");
        document.querySelectorAll(".field-indicator").forEach(el => {
          el.textContent = "";
          el.className   = "field-indicator";
        });
        document.querySelectorAll(".input-ok, .input-err").forEach(el => {
          el.classList.remove("input-ok", "input-err");
        });
        refreshTimeSelect();
      } else {
        showError(json.error || "Une erreur est survenue.");
        if (res.status === 409) refreshTimeSelect();
      }
    } catch {
      showError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  });
}


function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `

    /* ── Validation temps réel ── */
    .field-indicator {
      position: absolute;
      right: 14px; top: 50%; transform: translateY(-50%);
      font-size: 1rem; font-weight: 700; pointer-events: none;
      transition: all 0.2s;
    }
    .fi-ok  { color: #22c55e; }
    .fi-err { color: #ef4444; }
    .input-ok  { border-color: #22c55e !important; box-shadow: 0 0 0 2px rgba(34,197,94,.15) !important; }
    .input-err { border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239,68,68,.15) !important; }

    /* ── Disponibilité ── */
    #availability-badge {
      margin-top: 6px; font-size: 0.82rem;
      display: flex; align-items: center; gap: 8px;
    }
    .avail-bar-wrap {
      flex: 1; height: 5px; background: #e5e7eb; border-radius: 99px; overflow: hidden;
    }
    .avail-bar { height: 100%; border-radius: 99px; transition: width 0.4s ease; }

    /* ── Spinner bouton ── */
    .spinner-btn {
      display: inline-block; width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: spin .65s linear infinite;
      vertical-align: middle; margin-right: 6px;
    }

    /* ── Numéro de réservation ── */
    .confirm-ref {
      display: flex; flex-direction: column; align-items: center;
      background: #f0fdf4; border: 2px dashed #86efac;
      border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1.2rem;
    }
    .ref-label {
      font-size: .75rem; text-transform: uppercase; letter-spacing: .08em;
      color: #6b7280; margin-bottom: .3rem;
    }
    .ref-number {
      font-size: 1.6rem; font-weight: 800; letter-spacing: .12em;
      color: #15803d; font-family: monospace;
    }
    .ref-hint {
      font-size: .75rem; color: #9ca3af; margin-top: .3rem;
    }


    #confirm-card {
      margin-top: 2rem;
      animation: popIn .4s cubic-bezier(.34,1.56,.64,1);
    }
    .confirm-inner {
      background: #fff;
      border: 2px solid #22c55e;
      border-radius: 16px;
      padding: 2rem 2.5rem;
      max-width: 420px;
      margin: 0 auto;
      text-align: center;
      box-shadow: 0 8px 32px rgba(34,197,94,.15);
    }
    .confirm-icon svg {
      width: 56px; height: 56px; margin-bottom: 1rem;
    }
    .check-path {
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
      animation: drawCheck .5s ease .3s forwards;
    }
    .confirm-title {
      font-size: 1.3rem; font-weight: 700;
      color: #15803d; margin-bottom: 1.2rem;
    }
    .confirm-details {
      background: #f0fdf4; border-radius: 10px;
      padding: 1rem 1.2rem; margin-bottom: 1.4rem;
    }
    .confirm-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: .45rem 0;
      border-bottom: 1px solid #dcfce7;
      font-size: .93rem;
    }
    .confirm-row:last-child { border-bottom: none; }
    .confirm-label { color: #6b7280; }
    .confirm-value { font-weight: 600; color: #111; }
    .confirm-close {
      background: #22c55e; color: #fff; border: none;
      border-radius: 8px; padding: .55rem 1.8rem;
      font-size: .9rem; font-weight: 600; cursor: pointer;
      transition: background .2s;
    }
    .confirm-close:hover { background: #16a34a; }

    /* ── Erreur ── */
    .error-msg-box {
      margin-top: 1rem; padding: .9rem 1.2rem;
      background: #fef2f2; border: 1.5px solid #fca5a5;
      color: #991b1b; border-radius: 10px;
      font-size: .9rem; animation: fadeIn .3s ease;
    }

    /* ── Créneaux ── */
    #reservation-time option:disabled { color: #bbb; background: #f9fafb; }

    /* ── Animations ── */
    @keyframes popIn {
      from { opacity:0; transform:scale(.92) translateY(12px); }
      to   { opacity:1; transform:scale(1)   translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}


document.addEventListener("DOMContentLoaded", () => {
  injectStyles();
  initLiveValidation();
  initForm();
});