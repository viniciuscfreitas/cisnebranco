// Agendamentos Screen Logic - Calendar View
// Tela estilo Google Calendar para visualizar agendamentos

let currentCalendarDate = new Date();
let calendarViewMode = 'month'; // 'month' or 'week'

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
  const monthYear = formatMonthYear(currentCalendarDate);

  DOM.headerInfo.innerHTML = `
    <div class="header-stat">
      <span class="header-stat-label">${monthYear}</span>
      <span class="header-stat-value">${formatCurrency(totalValue)}</span>
    </div>
    <div class="header-stat">
      <span class="header-stat-label">Agendamentos:</span>
      <span class="header-stat-value">${filteredTasks.length}</span>
    </div>
  `;
}

function formatMonthYear(date) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function parseDeadlineToDate(deadline, deadlineTimestamp) {
  if (deadlineTimestamp) {
    if (typeof parseDeadlineHours === 'function') {
      const hours = parseDeadlineHours(deadline);
      if (hours) {
        return new Date(deadlineTimestamp + (hours * MS_PER_HOUR));
      }
    }
    return new Date(deadlineTimestamp);
  }

  if (!deadline || deadline === DEADLINE_UNDEFINED) return null;

  const dateStr = deadline.trim();
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3], 10);
    const hour = dateMatch[4] ? parseInt(dateMatch[4], 10) : 0;
    const minute = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
    return new Date(year, month, day, hour, minute);
  }

  return null;
}

function getTasksForDate(tasks, date) {
  return tasks.filter(task => {
    const taskDate = parseDeadlineToDate(task.deadline, task.deadline_timestamp);
    if (!taskDate) return false;

    return taskDate.getDate() === date.getDate() &&
           taskDate.getMonth() === date.getMonth() &&
           taskDate.getFullYear() === date.getFullYear();
  });
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

    const taskDate = parseDeadlineToDate(t.deadline, t.deadline_timestamp);
    if (!taskDate) return false;

    return true;
  });

  if (calendarViewMode === 'month') {
    renderMonthCalendar(filteredTasks);
  } else {
    renderWeekCalendar(filteredTasks);
  }
}

function renderMonthCalendar(tasks) {
  if (!DOM.agendamentosContainer) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" id="calendarPrevMonth" aria-label="Mês anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${formatMonthYear(currentCalendarDate)}</h2>
      <button class="btn-text calendar-nav-btn" id="calendarNextMonth" aria-label="Próximo mês">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" id="calendarToday" aria-label="Ir para hoje">Hoje</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekdays">
        ${weekDays.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
      </div>
      <div class="calendar-days">
  `;

  for (let i = 0; i < startDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.getTime() === today.getTime();
    const dayTasks = getTasksForDate(tasks, date);
    const dayClass = isToday ? 'calendar-day today' : 'calendar-day';
    
    html += `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}">`;
    html += `<div class="calendar-day-number">${day}</div>`;
    html += `<div class="calendar-day-events">`;
    
    dayTasks.slice(0, 3).forEach(task => {
      const taskDate = parseDeadlineToDate(task.deadline, task.deadline_timestamp);
      const timeStr = taskDate ? formatTime(taskDate) : '';
      html += `
        <div class="calendar-event" data-task-id="${task.id}" role="button" tabindex="0">
          <span class="calendar-event-time">${timeStr}</span>
          <span class="calendar-event-title">${escapeHtml(task.pet_name || task.client)}</span>
        </div>
      `;
    });
    
    if (dayTasks.length > 3) {
      html += `<div class="calendar-event-more">+${dayTasks.length - 3} mais</div>`;
    }
    
    html += `</div></div>`;
  }

  const totalCells = startDayOfWeek + daysInMonth;
  const remainingCells = 42 - totalCells;
  for (let i = 0; i < remainingCells && i < 7; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  html += `</div></div>`;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners(tasks);
}

function renderWeekCalendar(tasks) {
  renderMonthCalendar(tasks);
}

function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function setupCalendarEventListeners(tasks) {
  const prevBtn = document.getElementById('calendarPrevMonth');
  const nextBtn = document.getElementById('calendarNextMonth');
  const todayBtn = document.getElementById('calendarToday');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderAgendamentos();
      renderAgendamentosHeader();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderAgendamentos();
      renderAgendamentosHeader();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      currentCalendarDate = new Date();
      renderAgendamentos();
      renderAgendamentosHeader();
    });
  }

  const eventElements = DOM.agendamentosContainer.querySelectorAll('.calendar-event[data-task-id]');
  eventElements.forEach(el => {
    const taskId = parseInt(el.dataset.taskId, 10);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      el.addEventListener('click', () => openModal(task));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(task);
        }
      });
    }
  });

  const dayElements = DOM.agendamentosContainer.querySelectorAll('.calendar-day:not(.empty)');
  dayElements.forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.calendar-event')) return;
      const dateStr = el.dataset.date;
      if (dateStr) {
        const date = new Date(dateStr);
        const newTask = {
          deadline: formatDateForForm(date),
          deadline_timestamp: date.getTime()
        };
        openModal(newTask);
      }
    });
  });
}

function formatDateForForm(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function exportAgendamentosData() {
  const tasks = AppState.getTasks();
  const csv = 'Tutor,Pet,Contato,Tipo,Preço,Status Pagamento,Horário\n' +
    tasks.map(t =>
      `"${t.client || ''}","${t.pet_name || ''}","${t.contact || ''}","${t.type || ''}",${t.price || 0},"${t.payment_status || ''}","${t.deadline || ''}"`
    ).join('\n');
  downloadCSV(csv, `agendamentos-${new Date().toISOString().split('T')[0]}.csv`);
}
