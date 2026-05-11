const API    = 'http://localhost/JSproject/Club_Sportif/shared-backend/api/abonnements_catalogue.php';
const COLORS = { gym:'#4272d7', coaching:'#00ad5f', acces:'#ff9800', padel:'#e91e63', basketball:'#9c27b0' };

const CATEGORIES = [
  { key: 'gym',        label: 'Salle de Gym',   icon: 'fa-dumbbell' },
  { key: 'coaching',   label: 'Coaching Privé',  icon: 'fa-user-tie' },
  { key: 'acces',      label: 'Accès Libre',     icon: 'fa-door-open' },
  { key: 'padel',      label: 'Padel',           icon: 'fa-table-tennis-paddle-ball' },
  { key: 'basketball', label: 'Basketball',      icon: 'fa-basketball-ball' },
];

let allData    = [];
let toDeleteId = null;

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildSections();
  loadAll();
});

// ── Build HTML skeletons once ────────────────────────────────────
function buildSections() {
  document.getElementById('sectionsContainer').innerHTML = CATEGORIES.map(c => `
    <div class="category-section">
      <div class="category-header">
        <h2 class="category-title">
          <i class="fas ${c.icon}" style="color:${COLORS[c.key]};margin-right:8px"></i>${c.label}
        </h2>
        <button class="btn-add" onclick="openAdd('${c.key}')">
          <i class="fas fa-plus"></i> Ajouter un abonnement
        </button>
      </div>
      <div id="grid-${c.key}" class="abonnements-grid">
        <div class="empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Chargement...</p>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Load all from API ────────────────────────────────────────────
async function loadAll() {
  try {
    const res  = await fetch(API);
    const json = await res.json();

    if (!json.success) throw new Error(json.error || 'API error');

    allData = json.data || [];
    CATEGORIES.forEach(c => renderCategory(c.key));

  } catch(err) {
    console.error('API error:', err);
    document.getElementById('sectionsContainer').insertAdjacentHTML('afterbegin', `
      <div class="alert alert-danger" style="margin-bottom:20px">
        ⚠️ Impossible de joindre l'API : <strong>${err.message}</strong><br>
        Vérifiez que Laragon est actif et que le fichier
        <code>api/abonnements_catalogue.php</code> existe.
      </div>
    `);
  }
}

// ── Render one category grid ─────────────────────────────────────
function renderCategory(cat) {
  const grid  = document.getElementById('grid-' + cat);
  if (!grid) return;

  const items = allData.filter(a => a.categorie === cat);

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>Aucun abonnement dans cette catégorie</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(a => `
    <div class="abonnement-card">
      <div class="abonnement-name">${esc(a.nom)}</div>
      <div class="abonnement-price">${Number(a.prix).toLocaleString('fr-TN')} DT</div>
      <div class="abonnement-duration">par ${esc(a.duree)}</div>
      ${a.description
        ? `<div class="abonnement-description">${esc(a.description)}</div>`
        : ''}
      ${a.pack10
        ? `<div style="font-size:.85rem;color:#6c757d;margin-bottom:10px">
             Pack 10 séances : <strong>${Number(a.pack10).toLocaleString('fr-TN')} DT</strong>
           </div>`
        : ''}
      <div class="abonnement-actions">
        <button class="btn-edit"   onclick="openEdit(${a.id})">
          <i class="fas fa-edit"></i> Modifier
        </button>
        <button class="btn-delete" onclick="askDelete(${a.id})">
          <i class="fas fa-trash"></i> Supprimer
        </button>
      </div>
    </div>
  `).join('');
}

// ── Modal: Add ───────────────────────────────────────────────────
function openAdd(cat) {
  clearForm();
  document.getElementById('modalTitle').textContent  = 'Ajouter un abonnement';
  document.getElementById('f_categorie').value       = cat;
  document.getElementById('pack10Group').style.display =
    (cat === 'coaching' || cat === 'acces') ? 'block' : 'none';
  document.getElementById('abonnementModal').style.display = 'flex';
}

// ── Modal: Edit ──────────────────────────────────────────────────
function openEdit(id) {
  const a = allData.find(x => x.id == id);
  if (!a) return;

  document.getElementById('modalTitle').textContent    = 'Modifier l\'abonnement';
  document.getElementById('f_id').value                = a.id;
  document.getElementById('f_categorie').value         = a.categorie;
  document.getElementById('f_nom').value               = a.nom;
  document.getElementById('f_prix').value              = a.prix;
  document.getElementById('f_duree').value             = a.duree;
  document.getElementById('f_description').value       = a.description || '';
  document.getElementById('f_pack10').value            = a.pack10 || '';
  document.getElementById('pack10Group').style.display =
    (a.categorie === 'coaching' || a.categorie === 'acces') ? 'block' : 'none';
  document.getElementById('abonnementModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('abonnementModal').style.display = 'none';
}

function clearForm() {
  ['f_id','f_nom','f_prix','f_duree','f_description','f_pack10'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ── Save (POST or PUT) ───────────────────────────────────────────
async function saveAbonnement() {
  const id    = document.getElementById('f_id').value;
  const nom   = document.getElementById('f_nom').value.trim();
  const prix  = document.getElementById('f_prix').value;
  const duree = document.getElementById('f_duree').value.trim();

  if (!nom || !prix || !duree) {
    showToast('Nom, prix et durée sont obligatoires.', 'warning');
    return;
  }

  const pack10val = document.getElementById('f_pack10').value;
  const payload   = {
    categorie:   document.getElementById('f_categorie').value,
    nom,
    prix:        parseFloat(prix),
    duree,
    description: document.getElementById('f_description').value.trim() || null,
    pack10:      pack10val !== '' ? parseFloat(pack10val) : null,
  };
  if (id) payload.id = parseInt(id);

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Enregistrement...';

  try {
    const res    = await fetch(API, {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      closeModal();
      await loadAll();
      showToast(id ? '✅ Abonnement mis à jour !' : '✅ Abonnement ajouté !', 'success');
    } else {
      showToast('Erreur: ' + (result.error || 'inconnue'), 'danger');
    }
  } catch(err) {
    showToast('Impossible de joindre l\'API.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i> Enregistrer';
  }
}

// ── Delete ───────────────────────────────────────────────────────
function askDelete(id) {
  toDeleteId = id;
  document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  toDeleteId = null;
}

async function confirmDelete() {
  if (!toDeleteId) return;
  try {
    const res    = await fetch(API, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: toDeleteId })
    });
    const result = await res.json();

    if (result.success) {
      closeDeleteModal();
      await loadAll();
      showToast('🗑️ Abonnement supprimé.', 'success');
    } else {
      showToast('Erreur: ' + (result.error || 'inconnue'), 'danger');
    }
  } catch(err) {
    showToast('Impossible de joindre l\'API.', 'danger');
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow`;
  t.style.cssText = 'z-index:9999;min-width:280px';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}