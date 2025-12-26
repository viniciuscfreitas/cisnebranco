// Agendamentos Screen - Google Calendar Style
// Simple, clean, bug-free calendar implementation

let currentCalendarDate = new Date();
let calendarViewMode = 'month'; // 'day', 'week', 'month', 'year'

// Date utilities - simple and clear
// Cache parsed dates to avoid re-parsing same task multiple times
const taskDateCache = new WeakMap();

function parseTaskDate(task) {
  if (!task) return null;

  // Check cache first (performance optimization)
  if (taskDateCache.has(task)) {
    return taskDateCache.get(task);
  }

  let result = null;

  // Use timestamp if available
  if (task.deadline_timestamp && typeof task.deadline_timestamp === 'number') {
    result = new Date(task.deadline_timestamp);
    // Validate date
    if (isNaN(result.getTime())) {
      taskDateCache.set(task, null);
      return null;
    }

    // Add hours if specified in deadline string
    if (task.deadline && typeof parseDeadlineHours === 'function') {
      const hours = parseDeadlineHours(task.deadline);
      if (hours) {
        result.setHours(result.getHours() + hours);
      }
    }
    taskDateCache.set(task, result);
    return result;
  }

  // Parse from deadline string (format: DD/MM/YYYY HH:mm)
  if (task.deadline && task.deadline !== DEADLINE_UNDEFINED) {
    const match = task.deadline.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const minute = match[5] ? parseInt(match[5], 10) : 0;

      result = new Date(year, month, day, hour, minute);
      // Validate date
      if (isNaN(result.getTime())) {
        taskDateCache.set(task, null);
        return null;
      }
      taskDateCache.set(task, result);
      return result;
    }
  }

  taskDateCache.set(task, null);
  return null;
}

function getDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(startDate) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Task filtering - simple and efficient
function filterTasksByDate(tasks, date) {
  if (!tasks || tasks.length === 0) return [];
  const targetDate = getDateOnly(date);

  return tasks.filter(task => {
    const taskDate = parseTaskDate(task);
    if (!taskDate) return false;
    return isSameDay(taskDate, targetDate);
  });
}

function filterTasksByDateRange(tasks, startDate, endDate) {
  if (!tasks || tasks.length === 0) return [];
  const start = getDateOnly(startDate);
  const end = getDateOnly(endDate);

  return tasks.filter(task => {
    const taskDate = parseTaskDate(task);
    if (!taskDate) return false;
    const taskDateOnly = getDateOnly(taskDate);
    return taskDateOnly >= start && taskDateOnly <= end;
  });
}

// Formatting utilities
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatTime(date) {
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  if (minutes === 0) {
    return `${displayHours} ${period}`;
  }
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDateLabel(date, view) {
  if (view === 'day') {
    return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
  }
  if (view === 'week') {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}-${weekEnd.getDate()} de ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].substring(0, 3)} - ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].substring(0, 3)} ${weekStart.getFullYear()}`;
  }
  if (view === 'month') {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (view === 'year') {
    return `${date.getFullYear()}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateForForm(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Header rendering - shared across all views
function renderCalendarHeader() {
  const dateLabel = formatDateLabel(currentCalendarDate, calendarViewMode);

  return `
    <div class="calendar-header-controls">
      <button class="btn-text calendar-nav-btn" data-action="prev" aria-label="Anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <h2 class="calendar-title">${escapeHtml(dateLabel)}</h2>
      <button class="btn-text calendar-nav-btn" data-action="next" aria-label="Próximo">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="btn-text calendar-today-btn" data-action="today" aria-label="Ir para hoje">Hoje</button>
      <div class="calendar-view-selector">
        <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Dia</button>
        <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Semana</button>
        <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Mês</button>
        <button class="calendar-view-btn ${calendarViewMode === 'year' ? 'active' : ''}" data-view="year">Ano</button>
      </div>
    </div>
  `;
}

// Update header stats
function renderAgendamentosHeader() {
  if (!DOM.headerInfo) return;

  const tasks = AppState.getTasks();
  if (!Array.isArray(tasks)) return;

  const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : '';
  const filteredTasks = tasks.filter(t => {
    if (!t) return false;
    if (!searchTerm) return true;
    const clientMatches = t.client && t.client.toLowerCase().includes(searchTerm);
    const petMatches = t.pet_name && t.pet_name.toLowerCase().includes(searchTerm);
    return clientMatches || petMatches;
  });

  const totalValue = filteredTasks.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
  const dateLabel = formatDateLabel(currentCalendarDate, calendarViewMode);

  DOM.headerInfo.innerHTML = `
    <div class="header-stat">
      <span class="header-stat-label">${escapeHtml(dateLabel)}</span>
      <span class="header-stat-value">${escapeHtml(formatCurrency(totalValue))}</span>
      </div>
    <div class="header-stat">
      <span class="header-stat-label">Agendamentos:</span>
      <span class="header-stat-value">${filteredTasks.length}</span>
    </div>
  `;
}

// Hour slot generation
function generateHourSlots(includeClickable = false) {
  return Array.from({ length: 24 }, (_, hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const hourLabel = `${displayHour} ${period}`;

    if (includeClickable) {
      return `
        <div class="calendar-hour-row">
          <div class="calendar-hour-label">${hourLabel}</div>
          <div class="calendar-hour-slot-container">
            <div class="calendar-30min-slot" data-hour="${hour}" data-minute="0" role="button" tabindex="0" aria-label="Criar agendamento às ${hourLabel}"></div>
            <div class="calendar-30min-slot" data-hour="${hour}" data-minute="30" role="button" tabindex="0" aria-label="Criar agendamento às ${displayHour}:30 ${period}"></div>
          </div>
        </div>
      `;
    }
    return `
      <div class="calendar-hour-row">
        <div class="calendar-hour-label">${hourLabel}</div>
      </div>
    `;
  }).join('');
}

// Current time indicator
function renderCurrentTimeLine(isToday) {
  if (!isToday) return '';
  const now = new Date();
      const totalMinutes = now.getHours() * 60 + now.getMinutes();
      const topPercent = (totalMinutes * 100) / MINUTES_PER_DAY;
      return `
            <div class="calendar-current-time-line" style="top: ${topPercent}%;">
              <div class="calendar-current-time-dot"></div>
            </div>
          `;
}

// Event rendering helpers
function renderDayEvent(task) {
  if (!task || !task.id) return '';

  const taskDate = parseTaskDate(task);
      if (!taskDate) return '';

      const hour = taskDate.getHours();
      const minutes = taskDate.getMinutes();
      const totalMinutes = hour * 60 + minutes;
      const top = (totalMinutes * 100) / MINUTES_PER_DAY;
  const duration = 60; // Default 1 hour
      const heightPercent = Math.max((duration * 100) / MINUTES_PER_DAY, 4.17);

      return `
            <div class="calendar-day-event" 
                 data-task-id="${task.id}"
                 style="top: ${top}%; height: ${heightPercent}%;"
                 role="button" 
                 tabindex="0"
                 aria-label="Agendamento: ${escapeHtml(task.pet_name || task.client)} às ${formatTime(taskDate)}">
              <div class="calendar-day-event-time">${formatTime(taskDate)}</div>
              <div class="calendar-day-event-title">${escapeHtml(task.pet_name || task.client)}</div>
              <div class="calendar-day-event-subtitle">${escapeHtml(task.client)}</div>
            </div>
          `;
}

function renderWeekEvent(task) {
  if (!task || !task.id) return '';

  const taskDate = parseTaskDate(task);
  if (!taskDate) return '';

  const hour = taskDate.getHours();
  const minutes = taskDate.getMinutes();
  const totalMinutes = hour * 60 + minutes;
  const top = (totalMinutes * 100) / MINUTES_PER_DAY;
  const duration = 60;
  const heightPercent = Math.max((duration * 100) / MINUTES_PER_DAY, 4.17);

  return `
    <div class="calendar-week-event" 
         data-task-id="${task.id}"
         style="top: ${top}%; height: ${heightPercent}%;"
         role="button" 
         tabindex="0"
         aria-label="Agendamento: ${escapeHtml(task.pet_name || task.client)} às ${formatTime(taskDate)}">
      <div class="calendar-week-event-time">${formatTime(taskDate)}</div>
      <div class="calendar-week-event-title">${escapeHtml(task.pet_name || task.client)}</div>
      </div>
  `;
}

function renderMonthEvent(task) {
  if (!task || !task.id) return '';

  const taskDate = parseTaskDate(task);
  const timeStr = taskDate ? formatTime(taskDate) : '';

  return `
    <div class="calendar-event" 
         data-task-id="${task.id}" 
         role="button" 
         tabindex="0"
         aria-label="Agendamento: ${escapeHtml(task.pet_name || task.client)}${timeStr ? ' às ' + timeStr : ''}">
      <span class="calendar-event-time">${timeStr}</span>
      <span class="calendar-event-title">${escapeHtml(task.pet_name || task.client)}</span>
    </div>
  `;
}

// View rendering functions
function renderDayView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const date = new Date(currentCalendarDate);
  date.setHours(0, 0, 0, 0);
  const dayTasks = filterTasksByDate(tasks, date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = isSameDay(date, today);

  const html = `
    ${renderCalendarHeader()}
    <div class="calendar-day-view ${isToday ? 'today' : ''}">
      <div class="calendar-day-hours">
        ${generateHourSlots(true)}
      </div>
      <div class="calendar-day-events-container">
        ${renderCurrentTimeLine(isToday)}
        ${dayTasks.map(renderDayEvent).join('')}
      </div>
    </div>
  `;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners();
}

function renderWeekView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const weekStart = getWeekStart(currentCalendarDate);
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  // Performance optimization: Pre-group tasks by date to avoid calling filterTasksByDate 7 times
  const tasksByDate = new Map();
  const weekStartOnly = getDateOnly(weekStart);
  const weekEndOnly = getDateOnly(weekEnd);
  
  tasks.forEach(task => {
    const taskDate = parseTaskDate(task);
    if (!taskDate) return;
    const taskDateOnly = getDateOnly(taskDate);
    if (taskDateOnly >= weekStartOnly && taskDateOnly <= weekEndOnly) {
      const dateKey = taskDateOnly.getTime();
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey).push(task);
    }
  });

  const html = `
    ${renderCalendarHeader()}
    <div class="calendar-week-view">
      <div class="calendar-week-header">
        <div class="calendar-week-time-column"></div>
        ${weekDates.map((date, idx) => {
    const isToday = isSameDay(date, today);
    return `
            <div class="calendar-week-day-header ${isToday ? 'today' : ''}">
              <div class="calendar-week-day-name">${WEEKDAYS[date.getDay()]}</div>
              <div class="calendar-week-day-number">${date.getDate()}</div>
            </div>
          `;
  }).join('')}
      </div>
      <div class="calendar-week-body">
        <div class="calendar-week-hours">
          ${generateHourSlots(false)}
        </div>
        ${weekDates.map((date, dayIdx) => {
    const dateKey = getDateOnly(date).getTime();
    const dayTasks = tasksByDate.get(dateKey) || [];
    const isToday = isSameDay(date, today);
    const showCurrentTime = isToday && isSameDay(date, now);

    return `
            <div class="calendar-week-day-column ${isToday ? 'today' : ''}" data-date="${date.toISOString().split('T')[0]}">
              ${Array.from({ length: 24 }, (_, hour) => `
                <div class="calendar-hour-slot-container">
                  <div class="calendar-30min-slot" data-hour="${hour}" data-minute="0" data-day="${dayIdx}" role="button" tabindex="0" aria-label="Criar agendamento às ${hour.toString().padStart(2, '0')}:00"></div>
                  <div class="calendar-30min-slot" data-hour="${hour}" data-minute="30" data-day="${dayIdx}" role="button" tabindex="0" aria-label="Criar agendamento às ${hour.toString().padStart(2, '0')}:30"></div>
                </div>
              `).join('')}
              ${showCurrentTime ? renderCurrentTimeLine(true) : ''}
              ${dayTasks.map(renderWeekEvent).join('')}
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners();
}

function renderMonthView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Performance optimization: Pre-group tasks by date to avoid calling filterTasksByDate 30+ times
  const tasksByDate = new Map();
  const monthStart = getDateOnly(firstDay);
  const monthEnd = getDateOnly(lastDay);

  tasks.forEach(task => {
    const taskDate = parseTaskDate(task);
    if (!taskDate) return;
    const taskDateOnly = getDateOnly(taskDate);
    if (taskDateOnly >= monthStart && taskDateOnly <= monthEnd) {
      const dateKey = taskDateOnly.getTime();
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey).push(task);
    }
  });

  let html = `
    ${renderCalendarHeader()}
    <div class="calendar-grid">
      <div class="calendar-weekdays">
        ${WEEKDAYS.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
      </div>
      <div class="calendar-days">
  `;

  // Empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = isSameDay(date, today);
    const dateKey = getDateOnly(date).getTime();
    const dayTasks = tasksByDate.get(dateKey) || [];
    const dayClass = isToday ? 'calendar-day today' : 'calendar-day';

    html += `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}">`;
    html += `<div class="calendar-day-number">${day}</div>`;
    html += `<div class="calendar-day-events">`;

    dayTasks.slice(0, 3).forEach(task => {
      html += renderMonthEvent(task);
    });

    if (dayTasks.length > 3) {
      html += `<div class="calendar-event-more">+${dayTasks.length - 3} mais</div>`;
    }

    html += `</div></div>`;
  }

  // Fill remaining cells to complete grid
  const totalCells = startDayOfWeek + daysInMonth;
  const remainingCells = 42 - totalCells;
  for (let i = 0; i < remainingCells && i < 7; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  html += `</div></div>`;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners();
}

function renderYearView(tasks) {
  if (!DOM.agendamentosContainer) return;

  const year = currentCalendarDate.getFullYear();
  const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Performance optimization: Pre-group tasks by date to avoid calling filterTasksByDate 365+ times
  const tasksByDate = new Map();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  tasks.forEach(task => {
    const taskDate = parseTaskDate(task);
    if (!taskDate) return;
    const taskDateOnly = getDateOnly(taskDate);
    if (taskDateOnly >= getDateOnly(yearStart) && taskDateOnly <= getDateOnly(yearEnd)) {
      const dateKey = taskDateOnly.getTime();
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey).push(task);
    }
  });

  let html = `
    ${renderCalendarHeader()}
    <div class="calendar-year-view">
  `;

  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    html += `
      <div class="calendar-year-month">
        <div class="calendar-year-month-title">${monthsShort[monthIdx]}</div>
        <div class="calendar-year-weekdays">
          ${WEEKDAYS_SHORT.map(day => `<div class="calendar-year-weekday">${day}</div>`).join('')}
        </div>
        <div class="calendar-year-days">
    `;

    // Empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-year-day empty"></div>';
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIdx, day);
      const isToday = isSameDay(date, today) && today.getFullYear() === year;
      const dateKey = getDateOnly(date).getTime();
      const dayTasks = tasksByDate.get(dateKey) || [];
      const dayClass = isToday ? 'calendar-year-day today' : 'calendar-year-day';
      const hasEvents = dayTasks.length > 0;

      html += `<div class="${dayClass} ${hasEvents ? 'has-events' : ''}" data-date="${date.toISOString().split('T')[0]}" title="${dayTasks.length} agendamento(s)">${day}</div>`;
    }

    html += `</div></div>`;
  }

  html += `</div>`;

  DOM.agendamentosContainer.innerHTML = html;
  setupCalendarEventListeners();
}

// Main render function
function renderAgendamentos() {
  if (!DOM.agendamentosContainer) return;

  // Validate and fix currentCalendarDate
  if (!currentCalendarDate || isNaN(currentCalendarDate.getTime())) {
    currentCalendarDate = new Date();
  }

  const tasks = AppState.getTasks();
  if (!tasks || tasks.length === 0) {
    // Render empty state
    if (calendarViewMode === 'day') renderDayView([]);
    else if (calendarViewMode === 'week') renderWeekView([]);
    else if (calendarViewMode === 'month') renderMonthView([]);
    else if (calendarViewMode === 'year') renderYearView([]);
    return;
  }

  // Filter tasks with valid dates and search term
  const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : '';
  const filteredTasks = tasks.filter(t => {
    if (!t) return false;

    // Search filter
    if (searchTerm) {
      const clientMatches = t.client && t.client.toLowerCase().includes(searchTerm);
      const petMatches = t.pet_name && t.pet_name.toLowerCase().includes(searchTerm);
      if (!clientMatches && !petMatches) return false;
    }

    // Must have valid date
    return parseTaskDate(t) !== null;
  });

  // Render appropriate view
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

// Navigation
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

// Event listeners - simple event delegation
// Store handlers to prevent memory leaks
let calendarClickHandler = null;
let calendarKeydownHandler = null;

function setupCalendarEventListeners() {
  if (!DOM.agendamentosContainer) return;

  // Remove old listeners if they exist (prevent memory leaks)
  if (calendarClickHandler) {
    DOM.agendamentosContainer.removeEventListener('click', calendarClickHandler);
    DOM.agendamentosContainer.removeEventListener('keydown', calendarKeydownHandler);
  }

  // Create new handlers
  calendarClickHandler = handleCalendarClick;
  calendarKeydownHandler = handleCalendarKeydown;

  // Add new listeners
  DOM.agendamentosContainer.addEventListener('click', calendarClickHandler);
  DOM.agendamentosContainer.addEventListener('keydown', calendarKeydownHandler);
}

function handleCalendarClick(e) {
  const target = e.target.closest('[data-action], [data-view], [data-task-id], [data-date], .calendar-30min-slot');
  if (!target) return;

  // Navigation buttons
  if (target.dataset.action === 'prev') {
    navigateCalendar(-1);
    return;
  }
  if (target.dataset.action === 'next') {
    navigateCalendar(1);
    return;
  }
  if (target.dataset.action === 'today') {
      currentCalendarDate = new Date();
      renderAgendamentos();
      renderAgendamentosHeader();
    return;
  }

  // View selector
  if (target.dataset.view) {
    const view = target.dataset.view;
    if (['day', 'week', 'month', 'year'].includes(view)) {
        calendarViewMode = view;
        renderAgendamentos();
        renderAgendamentosHeader();
      }
    return;
  }

  // Task event click
  if (target.dataset.taskId) {
    e.stopPropagation();
    const taskId = parseInt(target.dataset.taskId, 10);
    if (isNaN(taskId)) return; // Invalid task ID, bail out

    const tasks = AppState.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && typeof openModal === 'function') {
          openModal(task);
        }
    return;
  }

  // Day click (create new task)
  if (target.dataset.date) {
    if (target.closest('[data-task-id]')) return; // Don't create if clicking on event

    const dateStr = target.dataset.date;
          const date = new Date(dateStr);
    if (isNaN(date.getTime())) return; // Invalid date, bail out

          if (calendarViewMode === 'year') {
            calendarViewMode = 'month';
            currentCalendarDate = date;
            renderAgendamentos();
            renderAgendamentosHeader();
    } else if (typeof openModal === 'function') {
            const newTask = {
              deadline: formatDateForForm(date),
              deadline_timestamp: date.getTime()
            };
            openModal(newTask);
          }
    return;
  }

  // Time slot click (create new task at specific time)
  if (target.classList.contains('calendar-30min-slot')) {
      e.stopPropagation();
    const hour = parseInt(target.dataset.hour, 10);
    const minute = parseInt(target.dataset.minute || 0, 10);
    const dayIdx = target.dataset.day;

      let date;
      if (dayIdx !== undefined) {
      // Week view
        const weekStart = getWeekStart(currentCalendarDate);
        date = new Date(weekStart);
        date.setDate(date.getDate() + parseInt(dayIdx, 10));
      } else {
      // Day view
        date = new Date(currentCalendarDate);
      }

      date.setHours(hour, minute, 0, 0);

    if (typeof openModal === 'function') {
      const newTask = {
        deadline: formatDateForForm(date),
        deadline_timestamp: date.getTime()
      };
      openModal(newTask);
    }
  }
}

function handleCalendarKeydown(e) {
  const target = e.target;

  if (e.key !== 'Enter' && e.key !== ' ') return;

  // Task event
  if (target.dataset.taskId) {
    e.preventDefault();
    const taskId = parseInt(target.dataset.taskId, 10);
    if (isNaN(taskId)) return; // Invalid task ID, bail out

    const tasks = AppState.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && typeof openModal === 'function') {
      openModal(task);
    }
    return;
  }

  // Day
  if (target.dataset.date && !target.closest('[data-task-id]')) {
    e.preventDefault();
    const dateStr = target.dataset.date;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return; // Invalid date, bail out

    if (calendarViewMode === 'year') {
      calendarViewMode = 'month';
      currentCalendarDate = date;
      renderAgendamentos();
      renderAgendamentosHeader();
    } else if (typeof openModal === 'function') {
      const newTask = {
        deadline: formatDateForForm(date),
        deadline_timestamp: date.getTime()
      };
      openModal(newTask);
    }
    return;
  }

  // Time slot
  if (target.classList.contains('calendar-30min-slot')) {
        e.preventDefault();
        e.stopPropagation();
    const hour = parseInt(target.dataset.hour, 10);
    const minute = parseInt(target.dataset.minute || 0, 10);
    const dayIdx = target.dataset.day;

        let date;
        if (dayIdx !== undefined) {
          const weekStart = getWeekStart(currentCalendarDate);
          date = new Date(weekStart);
          date.setDate(date.getDate() + parseInt(dayIdx, 10));
        } else {
          date = new Date(currentCalendarDate);
        }

        date.setHours(hour, minute, 0, 0);

    if (typeof openModal === 'function') {
        const newTask = {
          deadline: formatDateForForm(date),
          deadline_timestamp: date.getTime()
        };
        openModal(newTask);
      }
  }
}

// Export function
function exportAgendamentosData() {
  const tasks = AppState.getTasks();
  const csv = 'Tutor,Pet,Contato,Tipo,Preço,Status Pagamento,Horário\n' +
    tasks.map(t =>
      `"${t.client || ''}","${t.pet_name || ''}","${t.contact || ''}","${t.type || ''}",${t.price || 0},"${t.payment_status || ''}","${t.deadline || ''}"`
    ).join('\n');
  downloadCSV(csv, `agendamentos-${new Date().toISOString().split('T')[0]}.csv`);
}
