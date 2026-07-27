// ============================================================================
// SETUP
// ============================================================================
const ideaInput = document.getElementById('ideaInput');
const generateBtn = document.getElementById('generateBtn');
const agentRows = document.querySelectorAll('.agent');
const STEPS = ['business', 'market', 'finance', 'legal', 'report'];

let currentPlan = null; // the merged result of all 5 agents, for PDF export / history
let revenueChartInstance = null;
let marketChartInstance = null;

// ---------- Toasts ----------
function toast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------- Theme toggle ----------
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  const icon = themeToggle.querySelector('i');
  icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
applyTheme(localStorage.getItem('smai-theme') || 'dark');
themeToggle.addEventListener('click', () => {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('smai-theme', next);
});

// ---------- Notification bell ----------
document.getElementById('notifyBtn').addEventListener('click', () => {
  toast(currentPlan ? 'Your latest report is ready to export.' : 'No notifications yet — run an analysis first.');
});

// ---------- Mobile sidebar ----------
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
});
sidebar.querySelectorAll('a[data-scroll]').forEach(link => {
  link.addEventListener('click', () => sidebar.classList.remove('open'));
});

// ============================================================================
// AGENT PIPELINE
// ============================================================================
function setAgentStatus(index, state, label) {
  const row = agentRows[index];
  if (!row) return;
  row.classList.remove('running', 'done', 'error');
  if (state) row.classList.add(state);
  row.querySelector('.status').textContent = label;
}

function resetAgents() {
  agentRows.forEach((row, i) => setAgentStatus(i, null, 'Waiting'));
}

generateBtn.addEventListener('click', runPipeline);
ideaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runPipeline();
});

async function runPipeline() {
  const idea = ideaInput.value.trim();
  if (!idea) {
    toast('Describe your startup idea first.', true);
    ideaInput.focus();
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running panel...';
  resetAgents();
  hidePipelineError();

  const context = {};
  const stepToIndex = { business: 0, market: 1, finance: 2, legal: 3, report: 4 };

  // Each step renders its own section the moment it completes, so a later
  // failure never erases work that already succeeded.
  const RENDER_AFTER_STEP = {
    business: (b) => { renderScoreKPIs(b); renderScoreDial(b.score); renderBusinessSections(b); },
    market: (m) => { renderMarketSections(m); renderCompetitors(m.competitors); renderMarketChart(m.market_growth); },
    finance: (f) => { renderRevenueKPI(f); renderFinanceSections(f); renderRevenueChart(f.revenue_breakdown); },
    legal: (l) => renderLegalSections(l),
    report: (r) => renderReportSections(r)
  };

  for (const step of STEPS) {
    const idx = stepToIndex[step];
    setAgentStatus(idx, 'running', 'Running');
    try {
      const result = await callAgent(step, idea, context);
      context[step] = result;
      setAgentStatus(idx, 'done', 'Done');
      try {
        RENDER_AFTER_STEP[step](result);
      } catch (renderErr) {
        // A rendering bug shouldn't be mistaken for an agent failure — log it
        // separately and keep going, since the underlying data did arrive.
        console.error(`Rendering failed for step "${step}":`, renderErr);
      }
    } catch (err) {
      console.error(`Agent "${step}" failed:`, err);
      setAgentStatus(idx, 'error', 'Failed');
      showPipelineError(step, err.message);
      break; // stop the pipeline, but everything rendered so far stays on screen
    }
  }

  if (STEPS.every(s => context[s])) {
    currentPlan = { idea, ...context };
    saveToHistory(currentPlan);
    toast('Analysis complete — your report is ready.');
  } else {
    // Keep a partial plan around so Download PDF / history still work with
    // whatever sections did complete.
    currentPlan = { idea, ...context };
  }

  generateBtn.disabled = false;
  generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate';
}

function showPipelineError(step, message) {
  const el = document.getElementById('pipelineError');
  const AGENT_NAMES = {
    business: 'Business Analyst', market: 'Market Research Agent',
    finance: 'Finance Advisor', legal: 'Legal Expert', report: 'Report Generator'
  };
  el.innerHTML = `<strong>${AGENT_NAMES[step] || step} failed:</strong> ${escapeHtml(message || 'Unknown error')}. ` +
    `Sections already completed above are still shown. Check your server terminal for the full error, then try Generate again.`;
  el.hidden = false;
}

function hidePipelineError() {
  const el = document.getElementById('pipelineError');
  el.hidden = true;
  el.innerHTML = '';
}

// ============================================================================
// RENDERING
// ============================================================================
function renderPlan(plan) {
  const { business, market, finance, legal, report } = plan;
  renderScoreKPIs(business);
  renderScoreDial(business.score);
  renderBusinessSections(business);
  renderRevenueKPI(finance);
  renderFinanceSections(finance);
  renderMarketSections(market);
  renderCompetitors(market.competitors);
  renderMarketChart(market.market_growth);
  renderRevenueChart(finance.revenue_breakdown);
  renderLegalSections(legal);
  renderReportSections(report);
}

function renderBusinessSections(business) {
  document.getElementById('summary').textContent = business.summary || '—';
  document.getElementById('audience').textContent = business.target_audience || '—';
  fillList('valueProp', business.value_proposition);
  fillList('customerSegments', business.customer_segments);
}

function renderMarketSections(market) {
  document.getElementById('market').textContent = market.market_analysis || '—';
  fillList('channels', market.channels);
  fillList('strengths', market.swot?.strengths);
  fillList('weaknesses', market.swot?.weaknesses);
  fillList('opportunities', market.swot?.opportunities);
  fillList('threats', market.swot?.threats);
}

function renderFinanceSections(finance) {
  document.getElementById('revenue').textContent = finance.revenue_model || '—';
  fillList('revenueStreams', finance.revenue_streams);
  fillList('costStructure', finance.cost_structure);
  fillList('funding', finance.funding_options);
}

function renderLegalSections(legal) {
  fillList('partners', legal.key_partners);
  fillList('activities', legal.key_activities);
  fillList('legal', legal.legal_checklist);
}

function renderReportSections(report) {
  document.getElementById('marketing').textContent = report.marketing_strategy || '—';
  fillList('growthStrategy', report.growth_strategy);
  fillList('roadmap', report.roadmap, true);
}

function fillList(id, items, ordered = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const list = Array.isArray(items) && items.length ? items : ['No data returned.'];
  el.innerHTML = list.map(i => `<li>${escapeHtml(i)}</li>`).join('');
}

function renderScoreKPIs(business) {
  document.getElementById('score').textContent = business.score != null ? business.score : '--';
  document.getElementById('potential').textContent = business.market_potential || '—';
  document.getElementById('risk').textContent = business.risk_level || '—';
}

function renderRevenueKPI(finance) {
  document.getElementById('revenueEstimate').textContent = finance.estimated_revenue || '—';
}

function renderScoreDial(score) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const circle = document.querySelector('#scoreCircle .circle');
  const color = pct >= 70 ? 'var(--cash)' : pct >= 40 ? 'var(--gold)' : 'var(--danger)';
  circle.style.setProperty('--dial-color', color);

  let current = 0;
  const step = Math.max(1, Math.round(pct / 30));
  const interval = setInterval(() => {
    current = Math.min(pct, current + step);
    circle.style.setProperty('--pct', current);
    document.getElementById('scorePercent').textContent = `${current}%`;
    if (current >= pct) clearInterval(interval);
  }, 20);
}

function renderCompetitors(competitors) {
  const tbody = document.getElementById('competitorTable');
  const list = Array.isArray(competitors) && competitors.length ? competitors : [];
  tbody.innerHTML = list.length
    ? list.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.strength)}</td><td>${escapeHtml(c.weakness)}</td></tr>`).join('')
    : '<tr><td colspan="3">No competitor data returned.</td></tr>';
}

function renderRevenueChart(breakdown) {
  const ctx = document.getElementById('revenueChart');
  const list = Array.isArray(breakdown) && breakdown.length ? breakdown : [{ label: 'No data', percent: 100 }];
  if (revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: list.map(d => d.label),
      datasets: [{
        data: list.map(d => d.percent),
        backgroundColor: ['#14C878', '#E8B923', '#E5484D', '#3B82F6', '#A855F7'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).getPropertyValue('--ink').trim() } } }
    }
  });
}

function renderMarketChart(growth) {
  const ctx = document.getElementById('marketChart');
  const list = Array.isArray(growth) && growth.length ? growth : [];
  if (marketChartInstance) marketChartInstance.destroy();
  marketChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: list.map(d => d.year),
      datasets: [{
        label: 'Market growth (%)',
        data: list.map(d => d.growth_percent),
        borderColor: '#E8B923',
        backgroundColor: 'rgba(232, 185, 35, 0.15)',
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted').trim() } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted').trim() } }
      }
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ============================================================================
// HISTORY (localStorage — this is the user's own browser, not a Claude artifact)
// ============================================================================
const HISTORY_KEY = 'smai-history';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveToHistory(plan) {
  const history = getHistory();
  history.unshift({ id: Date.now(), idea: plan.idea, score: plan.business.score, plan });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history');
  const history = getHistory();
  if (!history.length) {
    list.innerHTML = '<li>No saved projects yet.</li>';
    return;
  }
  list.innerHTML = history.map(h => `
    <li data-id="${h.id}">
      <span class="hist-open">${escapeHtml(h.idea)} <small>(${h.score ?? '--'}/100)</small></span>
      <i class="fa-solid fa-trash del" data-id="${h.id}"></i>
    </li>
  `).join('');

  list.querySelectorAll('.hist-open').forEach(span => {
    span.addEventListener('click', () => {
      const id = Number(span.closest('li').dataset.id);
      const entry = history.find(h => h.id === id);
      if (entry) {
        ideaInput.value = entry.idea;
        currentPlan = entry.plan;
        renderPlan(entry.plan);
        toast('Loaded saved report.');
      }
    });
  });

  list.querySelectorAll('.del').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(icon.dataset.id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(h => h.id !== id)));
      renderHistory();
    });
  });
}

renderHistory();

// ============================================================================
// PDF EXPORT
// ============================================================================
document.getElementById('downloadPDF').addEventListener('click', () => {
  if (!currentPlan) {
    toast('Run an analysis first, then export.', true);
    return;
  }
  const requiredSteps = ['business', 'market', 'finance', 'legal', 'report'];
  const missing = requiredSteps.filter(s => !currentPlan[s]);
  if (missing.length) {
    toast(`Analysis is incomplete (missing: ${missing.join(', ')}) — finish a full run before exporting.`, true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.getHeight();

  function ensureSpace(extra = lineHeight) {
    if (y + extra > pageHeight - margin) { doc.addPage(); y = 18; }
  }

  function heading(text) {
    ensureSpace(10);
    doc.setFont(undefined, 'bold'); doc.setFontSize(13);
    doc.text(text, margin, y); y += 8;
    doc.setFont(undefined, 'normal'); doc.setFontSize(10.5);
  }

  function paragraph(text) {
    const lines = doc.splitTextToSize(text || '—', 180);
    lines.forEach(line => { ensureSpace(); doc.text(line, margin, y); y += lineHeight; });
    y += 2;
  }

  function bulletList(items) {
    (items || []).forEach(item => {
      const lines = doc.splitTextToSize(`• ${item}`, 178);
      lines.forEach(line => { ensureSpace(); doc.text(line, margin + 2, y); y += lineHeight; });
    });
    y += 2;
  }

  const { business, market, finance, legal, report, idea } = currentPlan;

  doc.setFont(undefined, 'bold'); doc.setFontSize(18);
  doc.text('Startup Mentor AI — Report', margin, y); y += 9;
  doc.setFont(undefined, 'normal'); doc.setFontSize(10.5);
  paragraph(`Idea: ${idea}`);
  paragraph(`Score: ${business.score}/100  ·  Market potential: ${business.market_potential}  ·  Risk: ${business.risk_level}  ·  Est. revenue: ${finance.estimated_revenue}`);

  heading('Business Summary'); paragraph(business.summary);
  heading('Market Analysis'); paragraph(market.market_analysis);
  heading('Revenue Model'); paragraph(finance.revenue_model);
  heading('Marketing Strategy'); paragraph(report.marketing_strategy);

  heading('Value Proposition'); bulletList(business.value_proposition);
  heading('Customer Segments'); bulletList(business.customer_segments);
  heading('Revenue Streams'); bulletList(finance.revenue_streams);
  heading('Cost Structure'); bulletList(finance.cost_structure);

  heading('SWOT — Strengths'); bulletList(market.swot?.strengths);
  heading('SWOT — Weaknesses'); bulletList(market.swot?.weaknesses);
  heading('SWOT — Opportunities'); bulletList(market.swot?.opportunities);
  heading('SWOT — Threats'); bulletList(market.swot?.threats);

  heading('Legal Checklist'); bulletList(legal.legal_checklist);
  heading('30-Day Roadmap'); bulletList(report.roadmap);
  heading('Funding Options'); bulletList(finance.funding_options);

  doc.save(`${idea.slice(0, 30).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'startup'}-report.pdf`);
});
