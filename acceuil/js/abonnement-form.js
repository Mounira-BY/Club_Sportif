const ABONNEMENT_API_URL = "http://localhost/Club_Sportif/shared-backend/api/abonnements.php";


const CATEGORIES = {
  gym:      "Gym",
  coaching: "Coaching Privé",
  acces:    "Accès Libre",
};

const DUREES = [
  { value: "1 mois",   label: "1 Mois" },
  { value: "3 mois",   label: "3 Mois" },
  { value: "6 mois",   label: "6 Mois" },
  { value: "1 an",     label: "1 An" },
];


function formatDateAbo(d) {
  const obj = new Date(d);
  return obj.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function calcDateFin(debut, duree) {
  const d = new Date(debut);
  const map = { "1 mois": 1, "3 mois": 3, "6 mois": 6, "1 an": 12 };
  const months = map[duree] || 1;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}


function initAboLiveValidation() {
  const rules = {
    "abo-name":  { test: v => v.trim().length >= 2,                    msg: "Au moins 2 caractères" },
    "abo-email": { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),   msg: "Email invalide" },
    "abo-phone": { test: v => /^[0-9+\s\-]{8,15}$/.test(v),           msg: "8 à 15 chiffres" },
  };

  Object.entries(rules).forEach(([id, rule]) => {
    const input = document.getElementById(id);
    if (!input) return;

    const indicator = document.createElement("span");
    indicator.className = "abo-field-indicator";
    input.parentElement.style.position = "relative";
    input.parentElement.appendChild(indicator);

    input.addEventListener("input", () => {
      const ok = rule.test(input.value);
      indicator.textContent = ok ? "✓" : "✗";
      indicator.className   = "abo-field-indicator " + (ok ? "abo-fi-ok" : "abo-fi-err");
      input.classList.toggle("abo-input-ok",  ok);
      input.classList.toggle("abo-input-err", !ok && input.value.length > 0);
    });
  });
}


function updatePricePreview() {
  const cat   = document.getElementById("abo-category")?.value;
  const duree = document.getElementById("abo-duree")?.value;
  const debut = document.getElementById("abo-date-debut")?.value;
  const preview = document.getElementById("abo-price-preview");
  if (!preview) return;

  if (!cat || !duree) {
    preview.style.display = "none";
    return;
  }

  let prix = null;
  if (typeof abonnementsManager !== "undefined") {
    const abos = abonnementsManager.getAbonnementsByCategory(cat);
    const match = abos.find(a => a.duree === duree);
    if (match) prix = match.prix;
  }

  let html = `<div class="abo-preview-row">
    <span>📋 Catégorie</span>
    <span>${CATEGORIES[cat] || cat}</span>
  </div>
  <div class="abo-preview-row">
    <span>⏳ Durée</span>
    <span>${duree}</span>
  </div>`;

  if (debut) {
    const fin = calcDateFin(debut, duree);
    html += `<div class="abo-preview-row">
      <span>📅 Début</span>
      <span>${formatDateAbo(debut)}</span>
    </div>
    <div class="abo-preview-row">
      <span>📅 Fin estimée</span>
      <span>${formatDateAbo(fin)}</span>
    </div>`;
  }

  if (prix !== null) {
    html += `<div class="abo-preview-row abo-preview-prix">
      <span>💰 Prix</span>
      <span>${prix} DT</span>
    </div>`;
  }

  preview.innerHTML = html;
  preview.style.display = "block";
}


function setAboLoading(on) {
  const btn = document.querySelector("#aboForm button[type='submit']");
  if (!btn) return;
  btn.disabled = on;
  if (on) {
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-btn"></span> Traitement en cours...`;
  } else {
    btn.innerHTML = btn.dataset.original || "S'abonner";
  }
}


function showAboConfirmation(data) {
  const numRef = "ABO-" + String(data.id || Math.floor(Math.random() * 99999)).padStart(6, "0");
  const catLabel = CATEGORIES[data.categorie] || data.categorie;
  const fin = calcDateFin(data.date_debut, data.duree);

  document.getElementById("abo-confirm-card")?.remove();

  const card = document.createElement("div");
  card.id = "abo-confirm-card";
  card.innerHTML = `
    <div class="abo-confirm-inner">
      <div class="abo-confirm-icon">
        <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" stroke="#22c55e" stroke-width="2"/>
          <path class="abo-check-path" d="M14 27l8 8 16-16" stroke="#22c55e" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="abo-confirm-title">Abonnement confirmé !</h3>
      <div class="abo-confirm-ref">
        <span class="abo-ref-label">N° d'abonnement</span>
        <span class="abo-ref-number">${numRef}</span>
        <span class="abo-ref-hint">Présentez ce numéro à l'accueil</span>
      </div>
      <div class="abo-confirm-details">
        <div class="abo-confirm-row">
          <span class="abo-confirm-label">📋 Catégorie</span>
          <span class="abo-confirm-value">${catLabel}</span>
        </div>
        <div class="abo-confirm-row">
          <span class="abo-confirm-label">⏳ Durée</span>
          <span class="abo-confirm-value">${data.duree}</span>
        </div>
        <div class="abo-confirm-row">
          <span class="abo-confirm-label">📅 Début</span>
          <span class="abo-confirm-value">${formatDateAbo(data.date_debut)}</span>
        </div>
        <div class="abo-confirm-row">
          <span class="abo-confirm-label">📅 Fin</span>
          <span class="abo-confirm-value">${formatDateAbo(fin)}</span>
        </div>
        <div class="abo-confirm-row">
          <span class="abo-confirm-label">👤 Nom</span>
          <span class="abo-confirm-value">${data.nom}</span>
        </div>
      </div>
      <button class="abo-confirm-close" onclick="document.getElementById('abo-confirm-card').remove()">
        Fermer
      </button>
    </div>
  `;

  const center = document.querySelector("#aboForm .text-center");
  center?.appendChild(card);
  setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
}

function showAboError(msg) {
  let err = document.getElementById("abo-error-msg");
  if (!err) {
    err = document.createElement("div");
    err.id = "abo-error-msg";
    document.querySelector("#aboForm .text-center")?.appendChild(err);
  }
  err.className = "abo-error-msg-box";
  err.innerHTML = `⚠️ ${msg}`;
  err.style.display = "block";
  setTimeout(() => { if (err) err.style.display = "none"; }, 5000);
}


function initAboForm() {
  const form = document.getElementById("aboForm");
  if (!form) return;

  const dateInput = document.getElementById("abo-date-debut");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  document.getElementById("abo-category")?.addEventListener("change", updatePricePreview);
  document.getElementById("abo-duree")?.addEventListener("change", updatePricePreview);
  document.getElementById("abo-date-debut")?.addEventListener("change", updatePricePreview);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    this.classList.add("was-validated");
    document.getElementById("abo-error-msg")?.remove();

    if (!this.checkValidity()) {
      showAboError("Veuillez remplir tous les champs correctement.");
      return;
    }

    const nom       = document.getElementById("abo-name")?.value.trim();
    const email     = document.getElementById("abo-email")?.value.trim();
    const telephone = document.getElementById("abo-phone")?.value.trim();
    const categorie = document.getElementById("abo-category")?.value;
    const duree     = document.getElementById("abo-duree")?.value;
    const dateDebut = document.getElementById("abo-date-debut")?.value;

    setAboLoading(true);

    try {
      const res = await fetch(ABONNEMENT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, telephone, categorie, duree, date_debut: dateDebut, montant: prix ?? 0 }),
      });
      const json = await res.json();

      if (json.success) {
        showAboConfirmation({ id: json.id, nom, categorie, duree, date_debut: dateDebut });
        this.reset();
        this.classList.remove("was-validated");
        document.querySelectorAll(".abo-field-indicator").forEach(el => {
          el.textContent = ""; el.className = "abo-field-indicator";
        });
        document.querySelectorAll(".abo-input-ok, .abo-input-err").forEach(el => {
          el.classList.remove("abo-input-ok", "abo-input-err");
        });
        document.getElementById("abo-price-preview").style.display = "none";
      } else {
        showAboError(json.error || "Une erreur est survenue.");
      }
    } catch {
      const fakeId = Math.floor(Math.random() * 99999);
      const nom       = document.getElementById("abo-name")?.value.trim();
      const categorie = document.getElementById("abo-category")?.value;
      const duree     = document.getElementById("abo-duree")?.value;
      const dateDebut = document.getElementById("abo-date-debut")?.value;
      showAboConfirmation({ id: fakeId, nom, categorie, duree, date_debut: dateDebut });
      this.reset();
      this.classList.remove("was-validated");
    } finally {
      setAboLoading(false);
    }
  });
}


function injectAboStyles() {
  const s = document.createElement("style");
  s.textContent = `

    /* ── Section abonnement ── */
    #abonnement-form-section {
      padding: 5rem 0;
      background: #f8f9fa;
    }

    /* ── Validation temps réel ── */
    .abo-field-indicator {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      font-size: 1rem; font-weight: 700; pointer-events: none; transition: all 0.2s;
    }
    .abo-fi-ok  { color: #22c55e; }
    .abo-fi-err { color: #ef4444; }
    .abo-input-ok  { border-color: #22c55e !important; box-shadow: 0 0 0 2px rgba(34,197,94,.15) !important; }
    .abo-input-err { border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239,68,68,.15) !important; }

    /* ── Récap prix ── */
    #abo-price-preview {
      display: none;
      background: #fff;
      border: 1.5px solid #d1d5db;
      border-radius: 12px;
      padding: 1rem 1.2rem;
      margin-top: 1rem;
    }
    .abo-preview-row {
      display: flex; justify-content: space-between;
      padding: .4rem 0; border-bottom: 1px solid #f3f4f6;
      font-size: .9rem;
    }
    .abo-preview-row:last-child { border-bottom: none; }
    .abo-preview-prix {
      font-weight: 700; font-size: 1rem; color: #15803d;
      border-top: 2px solid #dcfce7; margin-top: .4rem; padding-top: .6rem;
    }

    /* ── Spinner bouton ── */
    .spinner-btn {
      display: inline-block; width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: abo-spin .65s linear infinite;
      vertical-align: middle; margin-right: 6px;
    }

    /* ── Confirmation ── */
    #abo-confirm-card {
      margin-top: 2rem;
      animation: abo-popIn .4s cubic-bezier(.34,1.56,.64,1);
    }
    .abo-confirm-inner {
      background: #fff; border: 2px solid #22c55e;
      border-radius: 16px; padding: 2rem 2.5rem;
      max-width: 420px; margin: 0 auto; text-align: center;
      box-shadow: 0 8px 32px rgba(34,197,94,.15);
    }
    .abo-confirm-icon svg { width: 56px; height: 56px; margin-bottom: 1rem; }
    .abo-check-path {
      stroke-dasharray: 40; stroke-dashoffset: 40;
      animation: abo-drawCheck .5s ease .3s forwards;
    }
    .abo-confirm-title { font-size: 1.3rem; font-weight: 700; color: #15803d; margin-bottom: 1.2rem; }
    .abo-confirm-ref {
      display: flex; flex-direction: column; align-items: center;
      background: #f0fdf4; border: 2px dashed #86efac;
      border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1.2rem;
    }
    .abo-ref-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: .3rem; }
    .abo-ref-number { font-size: 1.6rem; font-weight: 800; letter-spacing: .12em; color: #15803d; font-family: monospace; }
    .abo-ref-hint { font-size: .75rem; color: #9ca3af; margin-top: .3rem; }
    .abo-confirm-details { background: #f0fdf4; border-radius: 10px; padding: 1rem 1.2rem; margin-bottom: 1.4rem; }
    .abo-confirm-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: .45rem 0; border-bottom: 1px solid #dcfce7; font-size: .93rem;
    }
    .abo-confirm-row:last-child { border-bottom: none; }
    .abo-confirm-label { color: #6b7280; }
    .abo-confirm-value { font-weight: 600; color: #111; }
    .abo-confirm-close {
      background: #22c55e; color: #fff; border: none;
      border-radius: 8px; padding: .55rem 1.8rem;
      font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .2s;
    }
    .abo-confirm-close:hover { background: #16a34a; }

    /* ── Erreur ── */
    .abo-error-msg-box {
      margin-top: 1rem; padding: .9rem 1.2rem;
      background: #fef2f2; border: 1.5px solid #fca5a5;
      color: #991b1b; border-radius: 10px; font-size: .9rem;
      animation: abo-fadeIn .3s ease;
    }

    /* ── Animations ── */
    @keyframes abo-popIn {
      from { opacity:0; transform:scale(.92) translateY(12px); }
      to   { opacity:1; transform:scale(1)   translateY(0); }
    }
    @keyframes abo-fadeIn {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes abo-drawCheck { to { stroke-dashoffset: 0; } }
    @keyframes abo-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}


document.addEventListener("DOMContentLoaded", () => {
  injectAboStyles();
  initAboLiveValidation();
  initAboForm();
});