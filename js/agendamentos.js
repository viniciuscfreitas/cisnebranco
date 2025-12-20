// Agendamentos Screen Logic - Google Calendar Style
// Múltiplas visualizações: dia, semana, mês, ano

let currentCalendarDate = new Date();
let calendarViewMode = 'month'; // 'day', 'week', 'month', 'year'

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
  const dateLabel = getDateLabelForView(currentCalendarDate, calendarViewMode);

  DOM.headerInfo.innerHTML = `
    <div class="header-stat">
      <span class="header-stat-label">${dateLabel}</span>
      <span class="header-stat-value">${formatCurrency(totalValue)}</span>
    </div>
    <div class="header-stat">
      <span class="header-stat-label">Agendamentos:</span>
      <span class="header-stat-value">${filteredTasks.length}</span>
    </div>
  `;
}

function getDateLabelForView(date, view) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  if (view === 'day') {
    return `${weekDays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }
  if (view === 'week') {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}-${weekEnd.getDate()} de ${months[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${months[weekStart.getMonth()].substring(0, 3)} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()].substring(0, 3)} ${weekStart.getFullYear()}`;
  }
  if (view === 'month') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (view === 'year') {
    return `${date.getFullYear()}`;
  }
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
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

function getTasksForDateRange(tasks, startDate, endDate) {
  return tasks.filter(task => {
    const taskDate = parseDeadlineToDate(task.deadline, task.deadline_timestamp);
    if (!taskDate) return false;

    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    return taskDateOnly >= startOnly && taskDateOnly <= endOnly;
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

  if (calendarViewMode === 'day') {
    renderDayView(filteredTasks);
  } else if (calendarViewMode === 'week') {
    renderWeekView(filteredTasks);
  } else if (calendarViewMode === 'month') {
    renderMonthView(filteredTasks);
  } else if (calendarViewMode === 'year') {
    renderYearView(filteredTasks);
  }
}

function renderDayView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const date = new Date(currentCalendarDate);
  date.setHours(0, 0, 0, 0);
  const dayTasks = getTasksForDate(tasks, date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  let html = `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" id="calendarPrev" aria-label="Dia anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${weekDays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}</h2>
      <button class="btn-text calendar-nav-btn" id="calendarNext" aria-label="Próximo dia">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" id="calendarToday" aria-label="Ir para hoje">Hoje</button>
      <div class="calendar-view-selector">
        <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Dia</button>
        <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Semana</button>
        <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Mês</button>
        <button class="calendar-view-btn ${calendarViewMode === 'year' ? 'active' : ''}" data-view="year">Ano</button>
      </div>
    </div>
    <div class="calendar-day-view ${isToday ? 'today' : ''}">
      <div class="calendar-day-hours">
        ${hours.map(hour => `
          <div class="calendar-hour-row">
            <div class="calendar-hour-label">${hour.toString().padStart(2, '0')}:00</div>
            <div class="calendar-hour-slot" data-hour="${hour}"></div>
          </div>
        `).join('')}
      </div>
      <div class="calendar-day-events-container">
        ${dayTasks.map(task => {
          const taskDate = parseDeadlineToDate(task.deadline, task.deadline_timestamp);
          const hour = taskDate ? taskDate.getHours() : 0;
          const minutes = taskDate ? taskDate.getMinutes() : 0;
          const top = (hour * 60 + minutes) * (100 / (24 * 60));
          const duration = 60;
          return `
            <div class="calendar-day-event" 
                 data-task-id="${task.id}"
                 style="top: ${top}%; height: ${duration * (100 / (24 * 60))}%;"
                 role="button" tabindex="0">
              <div class="calendar-day-event-time">${formatTime(taskDate)}</div>
              <div class="calendar-day-event-title">${escapeHtml(task.pet_name || task.client)}</div>
              <div class="calendar-day-event-subtitle">${escapeHtml(task.client)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners(tasks);
}

function renderWeekView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const weekStart = getWeekStart(currentCalendarDate);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekTasks = getTasksForDateRange(tasks, weekStart, weekDates[6]);

  let html = `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" id="calendarPrev" aria-label="Semana anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${getDateLabelForView(currentCalendarDate, 'week')}</h2>
      <button class="btn-text calendar-nav-btn" id="calendarNext" aria-label="Próxima semana">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" id="calendarToday" aria-label="Ir para hoje">Hoje</button>
      <div class="calendar-view-selector">
        <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Dia</button>
        <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Semana</button>
        <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Mês</button>
        <button class="calendar-view-btn ${calendarViewMode === 'year' ? 'active' : ''}" data-view="year">Ano</button>
      </div>
    </div>
    <div class="calendar-week-view">
      <div class="calendar-week-header">
        <div class="calendar-week-time-column"></div>
        ${weekDates.map((date, idx) => {
          const isToday = date.getTime() === today.getTime();
          return `
            <div class="calendar-week-day-header ${isToday ? 'today' : ''}">
              <div class="calendar-week-day-name">${weekDays[date.getDay()]}</div>
              <div class="calendar-week-day-number">${date.getDate()}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="calendar-week-body">
        <div class="calendar-week-hours">
          ${hours.map(hour => `
            <div class="calendar-hour-row">
              <div class="calendar-hour-label">${hour.toString().padStart(2, '0')}:00</div>
            </div>
          `).join('')}
        </div>
        ${weekDates.map((date, dayIdx) => {
          const dayTasks = getTasksForDate(weekTasks, date);
          const isToday = date.getTime() === today.getTime();
          return `
            <div class="calendar-week-day-column ${isToday ? 'today' : ''}" data-date="${date.toISOString().split('T')[0]}">
              ${hours.map(hour => `
                <div class="calendar-hour-slot" data-hour="${hour}" data-day="${dayIdx}"></div>
              `).join('')}
              ${dayTasks.map(task => {
                const taskDate = parseDeadlineToDate(task.deadline, task.deadline_timestamp);
                const hour = taskDate ? taskDate.getHours() : 0;
                const minutes = taskDate ? taskDate.getMinutes() : 0;
                const top = (hour * 60 + minutes) * (100 / (24 * 60));
                const duration = 60;
                return `
                  <div class="calendar-week-event" 
                       data-task-id="${task.id}"
                       style="top: ${top}%; height: ${duration * (100 / (24 * 60))}%;"
                       role="button" tabindex="0">
                    <div class="calendar-week-event-time">${formatTime(taskDate)}</div>
                    <div class="calendar-week-event-title">${escapeHtml(task.pet_name || task.client)}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners(tasks);
}

function renderMonthView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" id="calendarPrev" aria-label="Mês anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${months[month]} ${year}</h2>
      <button class="btn-text calendar-nav-btn" id="calendarNext" aria-label="Próximo mês">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" id="calendarToday" aria-label="Ir para hoje">Hoje</button>
      <div class="calendar-view-selector">
        <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Dia</button>
        <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Semana</button>
        <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Mês</button>
        <button class="calendar-view-btn ${calendarViewMode === 'year' ? 'active' : ''}" data-view="year">Ano</button>
      </div>
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

function renderYearView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const year = currentCalendarDate.getFullYear();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" id="calendarPrev" aria-label="Ano anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${year}</h2>
      <button class="btn-text calendar-nav-btn" id="calendarNext" aria-label="Próximo ano">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" id="calendarToday" aria-label="Ir para hoje">Hoje</button>
      <div class="calendar-view-selector">
        <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Dia</button>
        <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Semana</button>
        <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Mês</button>
        <button class="calendar-view-btn ${calendarViewMode === 'year' ? 'active' : ''}" data-view="year">Ano</button>
      </div>
    </div>
    <div class="calendar-year-view">
  `;

  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    html += `
      <div class="calendar-year-month">
        <div class="calendar-year-month-title">${months[monthIdx]}</div>
        <div class="calendar-year-weekdays">
          ${weekDays.map(day => `<div class="calendar-year-weekday">${day}</div>`).join('')}
        </div>
        <div class="calendar-year-days">
    `;

    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-year-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIdx, day);
      const isToday = date.getTime() === today.getTime() && today.getFullYear() === year;
      const dayTasks = getTasksForDate(tasks, date);
      const dayClass = isToday ? 'calendar-year-day today' : 'calendar-year-day';
      const hasEvents = dayTasks.length > 0;
      
      html += `<div class="${dayClass} ${hasEvents ? 'has-events' : ''}" data-date="${date.toISOString().split('T')[0]}" title="${dayTasks.length} agendamento(s)">${day}</div>`;
    }

    html += `</div></div>`;
  }

  html += `</div>`;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners(tasks);
}

function formatTime(date) {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function navigateCalendar(direction) {
  if (calendarViewMode === 'day') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + direction);
  } else if (calendarViewMode === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + (direction * 7));
  } else if (calendarViewMode === 'month') {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
  } else if (calendarViewMode === 'year') {
    currentCalendarDate.setFullYear(currentCalendarDate.getFullYear() + direction);
  }
  renderAgendamentos();
  renderAgendamentosHeader();
}

function setupCalendarEventListeners(tasks) {
  const prevBtn = document.getElementById('calendarPrev');
  const nextBtn = document.getElementById('calendarNext');
  const todayBtn = document.getElementById('calendarToday');
  const viewButtons = DOM.agendamentosContainer.querySelectorAll('.calendar-view-btn[data-view]');
  
  if (prevBtn) {
    prevBtn.onclick = null;
    prevBtn.addEventListener('click', () => navigateCalendar(-1));
  }

  if (nextBtn) {
    nextBtn.onclick = null;
    nextBtn.addEventListener('click', () => navigateCalendar(1));
  }

  if (todayBtn) {
    todayBtn.onclick = null;
    todayBtn.addEventListener('click', () => {
      currentCalendarDate = new Date();
      renderAgendamentos();
      renderAgendamentosHeader();
    });
  }

  viewButtons.forEach(btn => {
    btn.onclick = null;
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view && ['day', 'week', 'month', 'year'].includes(view)) {
        calendarViewMode = view;
        renderAgendamentos();
        renderAgendamentosHeader();
      }
    });
  });

  const eventElements = DOM.agendamentosContainer.querySelectorAll('[data-task-id]');
  eventElements.forEach(el => {
    const taskId = parseInt(el.dataset.taskId, 10);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      el.onclick = null;
      el.addEventListener('click', () => openModal(task));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(task);
        }
      });
    }
  });

  const dayElements = DOM.agendamentosContainer.querySelectorAll('[data-date]:not(.empty)');
  dayElements.forEach(el => {
    el.onclick = null;
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-task-id]')) return;
      const dateStr = el.dataset.date;
      if (dateStr) {
        const date = new Date(dateStr);
        if (calendarViewMode === 'year') {
          calendarViewMode = 'month';
          currentCalendarDate = date;
          renderAgendamentos();
          renderAgendamentosHeader();
        } else {
          const newTask = {
            deadline: formatDateForForm(date),
            deadline_timestamp: date.getTime()
          };
          openModal(newTask);
        }
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
