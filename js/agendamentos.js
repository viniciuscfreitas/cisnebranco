// Agendamentos Screen Logic
// Tela para criar e gerenciar agendamentos futuros

function renderAgendamentosHeader() {
  if (!DOM.headerInfo) return;

  const tasks = AppState.getTasks();
  if (!Array.isArray(tasks)) return;

  const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : '';
  const filteredTasks = tasks.filter(t => {
    if (!searchTerm) return true;
    if (!t || !t.client) return false;
    const clientMatches = t.client.toLowerCase().includes(searchTerm);
    const petMatches = t.pet_name && t.pet_name.toLowerCase().includes(searchTerm);
    return clientMatches || petMatches;
  });

  const totalValue = filteredTasks.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);

  DOM.headerInfo.innerHTML = `
    <div class="header-stat">
      <span class="header-stat-label">Total:</span>
      <span class="header-stat-value">${formatCurrency(totalValue)}</span>
    </div>
  `;
}

function renderAgendamentos() {
  if (!DOM.agendamentosContainer) return;

  const tasks = AppState.getTasks();
  const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : '';
  
  const filteredTasks = tasks.filter(t => {
    if (!t) return false;
    
    if (searchTerm) {
      const clientMatches = t.client && t.client.toLowerCase().includes(searchTerm);
      const petMatches = t.pet_name && t.pet_name.toLowerCase().includes(searchTerm);
      if (!clientMatches && !petMatches) return false;
    }

    return true;
  });

  if (filteredTasks.length === 0) {
    DOM.agendamentosContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-calendar" aria-hidden="true"></i></div>
        <div class="empty-state-text">Nenhum agendamento encontrado</div>
        <div class="empty-state-subtext">Crie um novo agendamento para começar</div>
        <button class="btn-primary empty-state-action" onclick="openModal()" style="margin-top: 1rem;">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Novo Agendamento
        </button>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  
  filteredTasks.forEach(task => {
    const card = createAgendamentoCard(task);
    if (card) {
      fragment.appendChild(card);
    }
  });

  DOM.agendamentosContainer.innerHTML = '';
  DOM.agendamentosContainer.appendChild(fragment);
}

function createAgendamentoCard(task) {
  if (!task) return null;

  const el = document.createElement('div');
  el.className = 'agendamento-card';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Agendamento: ${task.pet_name || task.client}, ${formatPrice(task.price)}. Use Enter ou Espaço para editar`);
  el.dataset.id = task.id;

  const formattedPrice = formatPrice(task.price);
  const deadlineDisplay = formatDeadlineDisplay(task.deadline, task.deadline_timestamp);
  const deadlineHtml = deadlineDisplay ? `<div class="agendamento-deadline">${escapeHtml(deadlineDisplay)}</div>` : '';
  const badgeHtml = task.type ? `<span class="agendamento-badge">${escapeHtml(task.type)}</span>` : '';
  const paymentHtml = task.payment_status ? `<div class="agendamento-payment">${escapeHtml(task.payment_status)}</div>` : '';

  el.innerHTML = `
    <div class="agendamento-card-header">
      <div>
        <h3 class="agendamento-card-title">${escapeHtml(task.pet_name || task.client)}</h3>
        <div class="agendamento-card-subtitle">${escapeHtml(task.client)}</div>
      </div>
      ${badgeHtml}
    </div>
    <div class="agendamento-card-body">
      ${deadlineHtml}
      ${paymentHtml}
      <div class="agendamento-card-price">${formattedPrice}</div>
    </div>
  `;

  el.addEventListener('click', () => openModal(task));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(task);
    }
  });

  return el;
}

function exportAgendamentosData() {
  const tasks = AppState.getTasks();
  const csv = 'Tutor,Pet,Contato,Tipo,Preço,Status Pagamento,Horário\n' +
    tasks.map(t =>
      `"${t.client || ''}","${t.pet_name || ''}","${t.contact || ''}","${t.type || ''}",${t.price || 0},"${t.payment_status || ''}","${t.deadline || ''}"`
    ).join('\n');
  downloadCSV(csv, `agendamentos-${new Date().toISOString().split('T')[0]}.csv`);
}

