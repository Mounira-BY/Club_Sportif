const API = 'http://localhost/JSproject/Club_Sportif/shared-backend/api';
const COLORS = ['#4272d7','#00ad5f','#ff9800','#e91e63','#9c27b0','#00bcd4'];

// ── Boot ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMiniCharts();   // small sparklines in stat cards (static — no DB needed)
  loadDashboard();    // everything from DB
  setupAddMemberForm();
});

// ── Mini sparkline charts (keep static — these are decorative) ──
function initMiniCharts() {
  const mini = (id, type, data) => {
    const el = document.getElementById(id);
    if (!el) return;
    new Chart(el, {
      type,
      data: {
        labels: data.map(() => ''),
        datasets: [{
          data,
          borderColor: '#fff',
          backgroundColor: 'rgba(255,255,255,.25)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: .4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  };
  mini('widgetChart1', 'line', [200, 215, 210, 230, 240, 238, 245]);
  mini('widgetChart2', 'line', [40000, 42000, 44000, 45000, 46000, 47000, 48350]);
  mini('widgetChart3', 'line', [65, 70, 72, 75, 76, 77, 78]);
  mini('widgetChart4', 'bar',  [5, 8, 10, 12, 15, 14, 12]);
}

// ── Load everything in one API call ────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/dashboard_stats.php`);
    const json = await res.json();

    if (!json.success) {
      console.error('API error:', json.error);
      return;
    }

    const d = json.data;
    renderStatCards(d);
    renderRevenueChart(d.revenus_chart);
    renderDoughnutChart(d.repartition);
    renderRecentMembers(d.nouveaux_membres);
    renderReservations(d.reservations_today);
    renderProgressBars(d.abo_stats);

    // Update notification badge with upcoming expirations
    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = d.expirations_7j || 0;

  } catch (err) {
    console.error('Dashboard load failed:', err);
    showToast('Impossible de contacter le serveur. Vérifiez que Laragon est actif.', 'danger');
  }
}

// ── Stat cards — using IDs now, no fragile nth selectors ───────
function renderStatCards(d) {
  document.getElementById('statMembres').textContent    = d.membres_actifs;
  document.getElementById('statRevenus').textContent    = Number(d.revenus_mensuel).toLocaleString('fr-TN') + ' DT';
  document.getElementById('statExpirations').textContent = d.expirations_7j;
}

// ── Revenue line chart ──────────────────────────────────────────
let revenueChart = null;
function renderRevenueChart(data) {
  const ctx = document.getElementById('recent-rep-chart');
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'],
      datasets: [{
        label: 'Revenus ' + new Date().getFullYear(),
        data,
        borderColor: '#4272d7',
        backgroundColor: 'rgba(66,114,215,.12)',
        borderWidth: 3,
        fill: true,
        tension: .4,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => (v/1000) + 'k DT' } } }
    }
  });
}

// ── Doughnut chart ──────────────────────────────────────────────
let doughnutChart = null;
function renderDoughnutChart(repartition) {
  const ctx = document.getElementById('percent-chart');
  if (!ctx || !repartition?.length) return;
  if (doughnutChart) doughnutChart.destroy();

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: repartition.map(r => r.type_abonnement),
      datasets: [{
        data: repartition.map(r => parseInt(r.total)),
        backgroundColor: COLORS.slice(0, repartition.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      cutout: '60%'
    }
  });
}

// ── Recent members table — uses #recentMembersTbody ────────────
function renderRecentMembers(membres) {
  const tbody = document.getElementById('recentMembersTbody');
  if (!tbody) return;

  if (!membres?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Aucun nouveau membre cette semaine</td></tr>';
    return;
  }

  tbody.innerHTML = membres.map(m => `
    <tr>
      <td>${esc(m.nom)}</td>
      <td>${esc(m.type_abonnement || '—')}</td>
      <td>${formatDate(m.date_inscription)}</td>
      <td><span class="badge bg-${m.statut === 'actif' ? 'success' : 'secondary'}">${esc(m.statut)}</span></td>
    </tr>
  `).join('');
}

// ── Today's reservations — uses #reservationsTbody ─────────────
function renderReservations(reservations) {
  const tbody = document.getElementById('reservationsTbody');
  if (!tbody) return;

  if (!reservations?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Aucune réservation aujourd\'hui</td></tr>';
    return;
  }

  tbody.innerHTML = reservations.map(r => `
    <tr>
      <td>${String(r.heure_debut || '').substring(0, 5)}</td>
      <td>${esc(r.activite)}</td>
      <td>${esc(r.membre || 'Non assigné')}</td>
      <td>${esc(r.salle || '—')}</td>
    </tr>
  `).join('');
}

// ── Progress bars — uses #aboStatsContainer ────────────────────
function renderProgressBars(stats) {
  const container = document.getElementById('aboStatsContainer');
  if (!container || !stats?.length) return;

  const total = stats.reduce((s, r) => s + parseInt(r.total), 0);

  container.innerHTML = stats.map((s, i) => {
    const pct = total > 0 ? Math.round((parseInt(s.total) / total) * 100) : 0;
    const isLast = i === stats.length - 1;
    return `
      <div class="${isLast ? 'mb-0' : 'mb-3'}">
        <div class="d-flex justify-content-between">
          <strong>${esc(s.type_abonnement)}</strong>
          <span class="text-muted">${s.total} abonnés</span>
        </div>
        <div class="progress" style="height:10px">
          <div class="progress-bar" style="width:${pct}%;background:${COLORS[i] || '#888'}"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Add member form — reads by ID, not fragile index ───────────
function setupAddMemberForm() {
  const btn = document.getElementById('btnSaveMember');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const nom    = document.getElementById('f_nom').value.trim();
    const email  = document.getElementById('f_email').value.trim();
    const tel    = document.getElementById('f_tel').value.trim();
    const dob    = document.getElementById('f_dob').value;
    const type   = document.getElementById('f_type').value;
    const debut  = document.getElementById('f_debut').value;

    if (!nom || !tel) {
      showToast('Nom et téléphone sont obligatoires.', 'warning');
      return;
    }
    if (!type) {
      showToast('Veuillez sélectionner un type d\'abonnement.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Enregistrement...';

    try {
      const res = await fetch(`${API}/members.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone: tel, date_naissance: dob, type_abonnement: type, date_debut: debut })
      });
      const result = await res.json();

      if (result.success) {
        // Close modal and clear fields
        bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
        ['f_nom','f_email','f_tel','f_dob','f_type','f_debut'].forEach(id => {
          document.getElementById(id).value = '';
        });
        await loadDashboard();  // refresh all stats live
        showToast('✅ Membre ajouté avec succès !', 'success');
      } else {
        showToast('Erreur serveur: ' + (result.error || 'inconnue'), 'danger');
      }
    } catch (err) {
      showToast('Impossible de joindre l\'API. Laragon actif ?', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow`;
  t.style.cssText = 'z-index:9999;min-width:280px;animation:fadeIn .2s';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}