const metrics = [
  {
    label: 'Timp mediu răspuns',
    value: '2m 35s',
    trend: '+18%',
    status: 'positive',
    detail: 'rolling last 50 threads'
  },
  {
    label: 'Sesiuni paralele',
    value: '12',
    trend: '+3',
    status: 'neutral',
    detail: 'client vs suport'
  },
  {
    label: 'Rezoluții automate',
    value: '67%',
    trend: '+6%',
    status: 'positive',
    detail: 'prin mesaje scriptate'
  }
];

const features = [
  {
    title: 'Orchestrare instanțe',
    badge: 'Live sync',
    description:
      'Rulează simultan spațiul Client și consola Suport. BroadcastChannel + localStorage replică automat mesajele.',
    bullets: ['Selectare context obligatorie', 'Mesaje client → queue suport', 'Reset thread instant']
  },
  {
    title: 'Playbook-uri dinamice',
    badge: 'Knowledge',
    description:
      'Articolele din stânga sunt generate dinamic și includ descrieri scurte pentru a ghida administratorii.',
    bullets: ['10 fluxuri SaaS critice', 'CTA „get in touch” dedicat', 'Highlight vizual pentru selecție']
  },
  {
    title: 'Console de control',
    badge: 'Support ops',
    description:
      'Consola de suport conține autentificare, listă de conversații, KPI-uri și quick replies predefinite.',
    bullets: ['Login admin/admin', 'Queue cu stare nouă/activă', 'KPI-uri actualizate live']
  }
];

const workflowSteps = [
  {
    title: '1. Context client',
    description:
      'Admin-ul selectează un articol knowledge sau „Get in touch”, după care input-ul devine activ și generează un ID de conversație.'
  },
  {
    title: '2. Transmisie sincronă',
    description:
      'Mesajele se salvează în localStorage + BroadcastChannel, astfel încât instanța de suport primește instant toate evenimentele.'
  },
  {
    title: '3. Rezoluție multi-playbook',
    description:
      'Suportul răspunde cu mesaje scriptate sau custom, marchează conversațiile rezolvate și poate reseta cu un singur click.'
  }
];

const metricsGrid = document.getElementById('metricsGrid');
const featureGrid = document.getElementById('featureGrid');
const workflowContainer = document.getElementById('workflowSteps');

renderMetrics();
renderFeatures();
renderWorkflow();

function renderMetrics() {
  if (!metricsGrid) return;
  metricsGrid.innerHTML = '';
  metrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = `metric-card ${metric.status}`;
    card.innerHTML = `
      <p>${metric.label}</p>
      <div class="metric-value">
        <strong>${metric.value}</strong>
        <span>${metric.trend}</span>
      </div>
      <small>${metric.detail}</small>
    `;
    metricsGrid.appendChild(card);
  });
}

function renderFeatures() {
  if (!featureGrid) return;
  featureGrid.innerHTML = '';
  features.forEach((feature) => {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.innerHTML = `
      <div class="feature-head">
        <span class="feature-badge">${feature.badge}</span>
        <h3>${feature.title}</h3>
      </div>
      <p>${feature.description}</p>
      <ul>
        ${feature.bullets.map((bullet) => `<li>${bullet}</li>`).join('')}
      </ul>
    `;
    featureGrid.appendChild(card);
  });
}

function renderWorkflow() {
  if (!workflowContainer) return;
  workflowContainer.innerHTML = '';
  workflowSteps.forEach((step, index) => {
    const item = document.createElement('article');
    item.className = 'workflow-step';
    item.innerHTML = `
      <span class="step-index">${index + 1}</span>
      <div>
        <h4>${step.title}</h4>
        <p>${step.description}</p>
      </div>
    `;
    workflowContainer.appendChild(item);
  });
}

