/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
// FIXME awe: (calendar) check bug reported from Michael: switch month when items are still loading (async)
scout.Calendar = function() {
  scout.Calendar.parent.call(this);

  // main elements
  this.$container;
  this.$header;
  this.$range;
  this.$modes;
  this.$grid;
  this.$list;
  this.$progress;

  // additional modes; should be stored in model
  this._showYearPanel = false;
  this._showListPanel = false;

  /**
   * The narrow view range is different from the regular view range.
   * It contains only dates that exactly match the requested dates,
   * the regular view range contains also dates from the first and
   * next month. The exact range is not sent to the server.
   */
  this._exactRange;

  /**
   * When the list panel is shown, this list contains the scout.CalenderListComponent
   * items visible on the list.
   */
  this._listComponents = [];

  this._addAdapterProperties(['components', 'menus', 'selectedComponent']);
};
scout.inherits(scout.Calendar, scout.ModelAdapter);

scout.Calendar.prototype.init = function(model, session, register) {
  scout.Calendar.parent.prototype.init.call(this, model, session, register);

  this._tooltipSupport = new scout.TooltipSupport({
    parent: this,
    htmlEnabled: true
  });
};

/**
 * Enum providing display-modes for calender-like components like calendar and planner.
 * @see ICalendarDisplayMode.java
 */
scout.Calendar.DisplayMode = {
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
  WORK_WEEK: 4
};

/**
 * Used as a multiplier in date calculations back- and forward (in time).
 */
scout.Calendar.Direction = {
  BACKWARD: -1,
  FORWARD: 1
};

scout.Calendar.prototype._isDay = function() {
  return this.displayMode === scout.Calendar.DisplayMode.DAY;
};

scout.Calendar.prototype._isWeek = function() {
  return this.displayMode === scout.Calendar.DisplayMode.WEEK;
};

scout.Calendar.prototype._isMonth = function() {
  return this.displayMode === scout.Calendar.DisplayMode.MONTH;
};

scout.Calendar.prototype._isWorkWeek = function() {
  return this.displayMode === scout.Calendar.DisplayMode.WORK_WEEK;
};

scout.Calendar.prototype._init = function(model) {
  scout.Calendar.parent.prototype._init.call(this, model);
  this._yearPanel = scout.create('YearPanel', {
    parent: this
  });
  this._yearPanel.on('dateSelect', this._onYearPanelDateSelect.bind(this));
  this._syncSelectedDate(model.selectedDate);
  this._syncDisplayMode(model.displayMode);
  this._exactRange = this._calcExactRange();
  this._yearPanel.setViewRange(this._exactRange);
  this.viewRange = this._calcViewRange();
  // We must send the view-range to the client-model on the server.
  // The view-range is determined by the UI. Thus the calendar cannot
  // be completely initialized without the view-range from the UI.
  this._sendViewRangeChanged();
};

scout.Calendar.prototype._syncSelectedDate = function(dateString) {
  this.selectedDate = scout.dates.parseJsonDate(dateString);
  this._yearPanel.selectDate(this.selectedDate);
};

scout.Calendar.prototype._syncDisplayMode = function(displayMode) {
  this.displayMode = displayMode;
  this._yearPanel.setDisplayMode(this.displayMode);
};

scout.Calendar.prototype._syncViewRange = function(viewRange) {
  this.viewRange = new scout.DateRange(
    scout.dates.parseJsonDate(viewRange.from),
    scout.dates.parseJsonDate(viewRange.to));
};

scout.Calendar.prototype._syncMenus = function(menus, oldMenus) {
  this.menus = menus;
  // FIXME awe: (calendar) here we should update the menu-bar (see Table.js)
  $.log.debug('(Calendar#_syncMenus) impl.');
};

scout.Calendar.prototype._render = function($parent) {
  this.$container = $parent.appendDiv('calendar');

  var layout = new scout.CalendarLayout(this);
  this.htmlComp = new scout.HtmlComponent(this.$container, this.session);
  this.htmlComp.setLayout(layout);
  this.htmlComp.pixelBasedSizing = false;

  // main elements
  this.$header = this.$container.appendDiv('calendar-header');
  this._yearPanel.render(this.$container);

  this.$grid = this.$container.appendDiv('calendar-grid');
  this.$list = this.$container.appendDiv('calendar-list-container').appendDiv('calendar-list');
  this.$listTitle = this.$list.appendDiv('calendar-list-title');

  // header contains all controls
  this.$range = this.$header.appendDiv('calendar-range');
  this.$range.appendDiv('calendar-previous').click(this._onClickPrevious.bind(this));
  this.$range.appendDiv('calendar-today', this.session.text('ui.CalendarToday')).click(this._onClickToday.bind(this));
  this.$range.appendDiv('calendar-next').click(this._onClickNext.bind(this));
  this.$range.appendDiv('calendar-select');

  this.$progress = this.$header.appendDiv('busyindicator-label');

  // ... and modes
  this.$commands = this.$header.appendDiv('calendar-commands');
  this.$commands.appendDiv('calendar-mode first', this.session.text('ui.CalendarDay')).attr('data-mode', scout.Calendar.DisplayMode.DAY).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode', this.session.text('ui.CalendarWorkWeek')).attr('data-mode', scout.Calendar.DisplayMode.WORK_WEEK).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode', this.session.text('ui.CalendarWeek')).attr('data-mode', scout.Calendar.DisplayMode.WEEK).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode last', this.session.text('ui.CalendarMonth')).attr('data-mode', scout.Calendar.DisplayMode.MONTH).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-toggle-year').click(this._onClickYear.bind(this));
  this.$commands.appendDiv('calendar-toggle-list').click(this._onClickList.bind(this));

  // append the main grid
  for (var w = 0; w < 7; w++) {
    var $w = this.$grid.appendDiv();
    if (w === 0) {
      $w.addClass('calendar-week-header');
    } else {
      $w.addClass('calendar-week');
    }

    for (var d = 0; d < 8; d++) {
      var $d = $w.appendDiv();
      if (w === 0 && d === 0) {
        $d.addClass('calendar-week-name');
      } else if (w === 0 && d > 0) {
        $d.addClass('calendar-day-name');
      } else if (w > 0 && d === 0) {
        $d.addClass('calendar-week-name');
      } else if (w > 0 && d > 0) {
        // FIXME awe: (calendar) we must also select the clicked day and update the model
        $d.addClass('calendar-day')
          .data('day', d)
          .data('week', w)
          .on('contextmenu', this._onDayContextMenu.bind(this));
      }
    }
  }

  // click event on all day and children elements
  $('.calendar-day', this.$grid).mousedown(this._onMousedownDay.bind(this));
  this._updateScreen(false);
};

scout.Calendar.prototype._renderProperties = function() {
  this._renderComponents();
  this._renderSelectedComponent();
  this._renderLoadInProgress();
  this._renderMenus();
  this._renderDisplayMode();
  this._renderSelectedDate();
  this._renderViewRange();
};

scout.Calendar.prototype._renderComponents = function() {
  this.components.sort(this._sortFromTo);
  this.components.forEach(function(component) {
    component.remove();
    component.render(this.$container);
  });

  this._arrangeComponents();
  this._updateListPanel();
};

scout.Calendar.prototype._renderSelectedComponent = function() {
  $.log.debug('(Calendar#_renderSelectedComponent)');
  if (this.selectedComponent) {
    this.selectedComponent.setSelected(true);
  }
};

scout.Calendar.prototype._renderLoadInProgress = function() {
  this.$progress.setVisible(this.loadInProgress);
};

scout.Calendar.prototype._renderViewRange = function() {
  $.log.debug('(Calendar#_renderViewRange) impl.');
};

scout.Calendar.prototype._renderDisplayMode = function() {
  $.log.debug('(Calendar#_renderDisplayMode) impl.');
};

scout.Calendar.prototype._renderSelectedDate = function() {
  $.log.debug('(Calendar#_renderSelectedDate) impl.');
};

scout.Calendar.prototype._renderMenus = function() {
  // NOP
};

scout.Calendar.prototype._removeMenus = function() {
  // menubar takes care about removal
};

/* -- basics, events -------------------------------------------- */

scout.Calendar.prototype._onClickPrevious = function(event) {
  this._navigateDate(scout.Calendar.Direction.BACKWARD);
};

scout.Calendar.prototype._onClickNext = function(event) {
  this._navigateDate(scout.Calendar.Direction.FORWARD);
};

scout.Calendar.prototype._dateParts = function(date, modulo) {
  var parts = {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay()
  };
  if (modulo) {
    parts.day = (date.getDay() + 6) % 7;
  }
  return parts;
};

scout.Calendar.prototype._navigateDate = function(direction) {
  this.selectedDate = this._calcSelectedDate(direction);
  this._updateModel(false);
};

scout.Calendar.prototype._calcSelectedDate = function(direction) {
  var p = this._dateParts(this.selectedDate),
    dayOperand = direction,
    weekOperand = direction * 7,
    monthOperand = direction;

  if (this._isDay()) {
    return new Date(p.year, p.month, p.date + dayOperand);
  } else if (this._isWeek() || this._isWorkWeek()) {
    return new Date(p.year, p.month, p.date + weekOperand);
  } else if (this._isMonth()) {
    return scout.dates.shift(this.selectedDate, 0, monthOperand, 0);
  }
};

scout.Calendar.prototype._updateModel = function(animate) {
  this._exactRange = this._calcExactRange();
  this._yearPanel.setViewRange(this._exactRange);
  this.viewRange = this._calcViewRange();
  this._sendModelChanged();
  this._updateScreen(animate);
};

/**
 * Calculates exact date range of displayed components based on selected-date.
 */
scout.Calendar.prototype._calcExactRange = function() {
  var from, to,
    p = this._dateParts(this.selectedDate, true);

  if (this._isDay()) {
    from = new Date(p.year, p.month, p.date);
    to = new Date(p.year, p.month, p.date + 1);
  } else if (this._isWeek()) {
    from = new Date(p.year, p.month, p.date - p.day);
    to = new Date(p.year, p.month, p.date - p.day + 6);
  } else if (this._isMonth()) {
    from = new Date(p.year, p.month, 1);
    to = new Date(p.year, p.month + 1, 0);
  } else if (this._isWorkWeek()) {
    from = new Date(p.year, p.month, p.date - p.day);
    to = new Date(p.year, p.month, p.date - p.day + 4);
  } else {
    throw new Error('invalid value for displayMode');
  }

  return new scout.DateRange(from, to);
};

/**
 * Calculates the view-range, which is what the user sees in the UI.
 * The view-range is wider than the exact-range in the monthly mode,
 * as it contains also dates from the previous and next month.
 */
scout.Calendar.prototype._calcViewRange = function() {
  var viewFrom = _calcViewFromDate(this._exactRange.from),
    viewTo = _calcViewToDate(viewFrom);
  return new scout.DateRange(viewFrom, viewTo);

  function _calcViewFromDate(fromDate) {
    var i, tmpDate = new Date(fromDate.valueOf());
    for (i = 0; i < 42; i++) {
      tmpDate.setDate(tmpDate.getDate() - 1);
      if ((tmpDate.getDay() === 1) && tmpDate.getMonth() !== fromDate.getMonth()) {
        return tmpDate;
      }
    }
    throw new Error('failed to calc viewFrom date');
  }

  function _calcViewToDate(fromDate) {
    var i, tmpDate = new Date(fromDate.valueOf());
    for (i = 0; i < 42; i++) {
      tmpDate.setDate(tmpDate.getDate() + 1);
    }
    return tmpDate;
  }
};

scout.Calendar.prototype._onClickToday = function(event) {
  this.selectedDate = new Date();
  this._updateModel(false);
};

scout.Calendar.prototype._onClickDisplayMode = function(event) {
  var p, displayMode,
    oldDisplayMode = this.displayMode;

  displayMode = $(event.target).data('mode');
  if (oldDisplayMode !== displayMode) {
    this.displayMode = displayMode;
    this._yearPanel.setDisplayMode(displayMode);
    if (this._isWorkWeek()) {
      // change date if selectedDate is on a weekend
      p = this._dateParts(this.selectedDate, true);
      if (p.day > 4) {
        this.selectedDate = new Date(p.year, p.month, p.date - p.day + 4);
      }
    }
    this._updateModel(true);

    // only render if components has other layout
    if (oldDisplayMode === scout.Calendar.DisplayMode.MONTH || this.displayMode === scout.Calendar.DisplayMode.MONTH) {
      this._renderComponents();
    }
  }
};

scout.Calendar.prototype._onClickYear = function(event) {
  this._showYearPanel = !this._showYearPanel;
  this._updateScreen(true);
};
scout.Calendar.prototype._onClickList = function(event) {
  this._showListPanel = !this._showListPanel;
  this._updateScreen(true);
};

scout.Calendar.prototype._onMousedownDay = function(event) {
  // we cannot use event.stopPropagation() in CalendarComponent.js because this would
  // prevent context-menus from being closed. With this awkward if-statement we only
  // process the event, when it is not bubbling up from somewhere else (= from mousedown
  // event on component).
  if (event.eventPhase === Event.AT_TARGET) {
    var selectedDate = $(event.delegateTarget).data('date');
    this._setSelection(selectedDate, null);
  }
};

/**
 * @param selectedDate
 * @param selectedComponent may be null when a day is selected
 */
scout.Calendar.prototype._setSelection = function(selectedDate, selectedComponent) {
  var changed = false;

  // selected date
  if (scout.dates.compare(this.selectedDate, selectedDate) !== 0) {
    changed = true;
    $('.calendar-day', this.$container).each(function(index, element) {
      var $day = $(element),
        date = $day.data('date');
      if (scout.dates.compare(date, this.selectedDate) === 0) {
        $day.select(false); // de-select old date
      } else if (scout.dates.compare(date, selectedDate) === 0) {
        $day.select(true); // select new date
      }
    }.bind(this));
    this.selectedDate = selectedDate;
  }

  // selected component / part (may be null)
  if (this.selectedComponent !== selectedComponent) {
    changed = true;
    if (this.selectedComponent) {
      this.selectedComponent.setSelected(false);
    }
    if (selectedComponent) {
      selectedComponent.setSelected(true);
    }
    this.selectedComponent = selectedComponent;
  }

  if (changed) {
    this._sendSelectionChanged();
    this._updateListPanel();
  }

  if (this._showYearPanel) {
    this._yearPanel.selectDate(this.selectedDate);
  }
};

/* --  set display mode and range ------------------------------------- */

scout.Calendar.prototype._sendModelChanged = function() {
  var data = {
    viewRange: this._jsonViewRange(),
    selectedDate: scout.dates.toJsonDate(this.selectedDate),
    displayMode: this.displayMode
  };
  this._send('modelChanged', data);
};

scout.Calendar.prototype._sendViewRangeChanged = function() {
  this._send('viewRangeChanged', {
    viewRange: this._jsonViewRange()
  });
};

scout.Calendar.prototype._sendSelectionChanged = function() {
  var selectedComponentId = this.selectedComponent ? this.selectedComponent.id : null;
  this._send('selectionChanged', {
    date: scout.dates.toJsonDate(this.selectedDate),
    componentId: selectedComponentId
  });
};

scout.Calendar.prototype._jsonViewRange = function() {
  return scout.dates.toJsonDateRange(this.viewRange);
};

scout.Calendar.prototype._updateScreen = function(animate) {
  $.log.info('(Calendar#_updateScreen)');

  // select mode
  $('.calendar-mode', this.$commands).select(false);
  $('[data-mode="' + this.displayMode + '"]', this.$modes).select(true);

  // remove selected day
  $('.selected', this.$grid).select(false);

  // layout grid
  this.layoutLabel();
  this.layoutSize(animate);
  this.layoutAxis();

  if (this._showYearPanel) {
    this._yearPanel.selectDate(this.selectedDate);
  }

  this._updateListPanel();
};

scout.Calendar.prototype.layoutSize = function(animate) {
  // reset animation sizes
  $('div', this.$container).removeData(['new-width', 'new-height']);

  // init vars
  var $selected = $('.selected', this.$grid),
    headerH = this.$header.height(),
    gridH = this.$grid.height(),
    gridW = this.$container.width();

  // show or hide year
  $('.calendar-toggle-year', this.$modes).select(this._showYearPanel);
  if (this._showYearPanel) {
    this._yearPanel.$container.data('new-width', 215);
    gridW -= 215;
  } else {
    this._yearPanel.$container.data('new-width', 0);
  }

  // show or hide work list
  $('.calendar-toggle-list', this.$modes).select(this._showListPanel);
  if (this._showListPanel) {
    this.$list.parent().data('new-width', 270);
    gridW -= 270;
  } else {
    this.$list.parent().data('new-width', 0);
  }

  // basic grid width
  this.$grid.data('new-width', gridW);

  // layout week
  if (this._isDay() || this._isWeek() || this._isWorkWeek()) {
    $('.calendar-week', this.$grid).data('new-height', 0);
    $selected.parent().data('new-height', gridH - headerH);
  } else {
    $('.calendar-week', this.$grid).data('new-height', parseInt((gridH - headerH) / 6, 10));
  }

  // layout days
  if (this._isDay()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', 0);
    $('.calendar-day-name:nth-child(' + ($selected.index() + 1) + '), .calendar-day:nth-child(' + ($selected.index() + 1) + ')', this.$grid)
      .data('new-width', gridW - headerH);
  } else if (this._isWorkWeek()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', 0);
    $('.calendar-day-name:nth-child(-n+6), .calendar-day:nth-child(-n+6)', this.$grid)
      .data('new-width', parseInt((gridW - headerH) / 5, 10));
  } else if (this._isMonth() || this._isWeek()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', parseInt((gridW - headerH) / 7, 10));
  }

  // set day-name (based on width of shown column)
  var width = this.$container.width(),
    weekdays;

  if (this._isDay()) {
    width /= 1;
  } else if (this._isWorkWeek()) {
    width /= 5;
  } else if (this._isWeek()) {
    width /= 7;
  } else if (this._isMonth()) {
    width /= 7;
  }

  if (width > 100) {
    weekdays = this.session.locale.dateFormat.symbols.weekdaysOrdered;
  } else {
    weekdays = this.session.locale.dateFormat.symbols.weekdaysShortOrdered;
  }

  $('.calendar-day-name', this.$grid).each(function(index) {
    $(this).attr('data-day-name', weekdays[index]);
  });

  var updateScrollbarCallback = this._updateScrollbars.bind(this);

  // animate old to new sizes
  $('div', this.$container).each(function() {
    var $e = $(this),
      w = $e.data('new-width'),
      h = $e.data('new-height');

    if (w !== undefined && w !== $e.outerWidth()) {
      if (animate) {
        $e.animateAVCSD('width', w, updateScrollbarCallback.bind($e));
      } else {
        $e.css('width', w);
        updateScrollbarCallback($e);
      }
    }
    if (h !== undefined && h !== $e.outerHeight()) {
      if (animate) {
        $e.animateAVCSD('height', h, updateScrollbarCallback.bind($e));
      } else {
        $e.css('height', h);
        updateScrollbarCallback($e);
      }
    }
  });
};

scout.Calendar.prototype._updateScrollbars = function($parent) {
  var $scrollables = $('.calendar-scrollable-components', $parent);

  for (var k = 0; k < $scrollables.length; k++) {
    var $scrollable = $scrollables.eq(k);
    scout.scrollbars.update($scrollable, true);
  }
};

scout.Calendar.prototype.layoutYearPanel = function() {
  if (this._showYearPanel) {
    scout.scrollbars.update(this._yearPanel.$yearList);
    this._yearPanel._scrollYear();
  }
};

scout.Calendar.prototype.layoutLabel = function() {
  var text, $dates,
    $selected = $('.selected', this.$grid),
    exFrom = this._exactRange.from,
    exTo = this._exactRange.to;

  // set range text
  if (this._isDay()) {
    text = this._format(exFrom, 'd. MMMM yyyy');
  } else if (this._isWorkWeek() || this._isWeek()) {
    var toText = this.session.text('ui.to');
    if (exFrom.getMonth() === exTo.getMonth()) {
      text = scout.strings.join(' ', this._format(exFrom, 'd.'), toText, this._format(exTo, 'd. MMMM yyyy'));
    } else if (exFrom.getFullYear() === exTo.getFullYear()) {
      text = scout.strings.join(' ', this._format(exFrom, 'd. MMMM'), toText, this._format(exTo, 'd. MMMM yyyy'));
    } else {
      text = scout.strings.join(' ', this._format(exFrom, 'd. MMMM yyyy'), toText, this._format(exTo, 'd. MMMM yyyy'));
    }

  } else if (this._isMonth()) {
    text = this._format(exFrom, 'MMMM yyyy');
  }
  $('.calendar-select', this.$range).text(text);

  // prepare to set all day date and mark selected one
  $dates = $('.calendar-day', this.$grid);

  var w, d, cssClass,
    currentMonth = this._exactRange.from.getMonth(),
    date = new Date(this.viewRange.from.valueOf());

  // loop all days and set value and class
  for (w = 0; w < 6; w++) {
    for (d = 0; d < 7; d++) {
      cssClass = '';
      if ((date.getDay() === 6) || (date.getDay() === 0)) {
        cssClass = date.getMonth() !== currentMonth ? ' weekend-out' : ' weekend';
      } else {
        cssClass = date.getMonth() !== currentMonth ? ' out' : '';
      }
      if (scout.dates.isSameDay(date, new Date())) {
        cssClass += ' now';
      }
      if (scout.dates.isSameDay(date, this.selectedDate)) {
        cssClass += ' selected';
      }

      // adjust position for days between 10 and 19 (because "1" is narrower than "0" or "2")
      if (date.getDate() > 9 && date.getDate() < 20) {
        cssClass += ' center-nice';
      }

      text = this._format(date, 'dd');
      $dates.eq(w * 7 + d)
        .removeClass('weekend-out weekend out selected now')
        .addClass(cssClass)
        .attr('data-day-name', text)
        .data('date', new Date(date.valueOf()));
      date.setDate(date.getDate() + 1);
    }
  }
};

scout.Calendar.prototype.layoutAxis = function() {
  var $e, $selected = $('.selected', this.$grid);

  // remove old axis
  $('.calendar-week-axis, .calendar-week-task', this.$grid).remove();

  // set weekname
  var session = this.session;
  $('.calendar-week-name', this.$container).each(function(index) {
    if (index > 0) {
      $e = $(this);
      $e.text(session.text('ui.CW', scout.dates.weekInYear($e.next().data('date'))));
    }
  });

  // day schedule
  if (!this._isMonth()) {
    //$('.calendar-week-name', this.$container).text('');
    var $parent = $selected.parent();
    $parent.appendDiv('calendar-week-axis').attr('data-axis-name', '08:00').css('top', this._dayPosition(8) + '%');
    $parent.appendDiv('calendar-week-axis').attr('data-axis-name', '12:00').css('top', this._dayPosition(12) + '%');
    $parent.appendDiv('calendar-week-axis').attr('data-axis-name', '13:00').css('top', this._dayPosition(13) + '%');
    $parent.appendDiv('calendar-week-axis').attr('data-axis-name', '17:00').css('top', this._dayPosition(17) + '%');
    $parent.appendDiv('calendar-week-task').attr('data-axis-name', session.text('ui.CalendarDay')).css('top', this._dayPosition(-1) + '%');
  }
};

/* -- year events ---------------------------------------- */

scout.Calendar.prototype._onYearPanelDateSelect = function(event) {
  this.selectedDate = event.date;
  this._updateModel(false);
};

scout.Calendar.prototype._updateListPanel = function() {
  if (this._showListPanel) {

    // remove old list-components
    this._listComponents.forEach(function(listComponent) {
      listComponent.remove();
    });

    this._listComponents = [];
    this._renderListPanel();
  }
};

scout.Calendar.prototype._remove = function() {
  var $days = $('.calendar-day', this.$grid);

  // Ensure that scrollbars are unregistered
  for (var k = 0; k < $days.length; k++) {
    var $day = $days.eq(k);
    var $scrollableContainer = $day.children('.calendar-scrollable-components');

    if ($scrollableContainer.length > 0) {
      scout.scrollbars.uninstall($scrollableContainer, this.session);
      $scrollableContainer.remove();
    }
  }

  scout.Calendar.parent.prototype._remove.call(this);
};

/**
 * Renders the panel on the left, showing all components of the selected date.
 */
scout.Calendar.prototype._renderListPanel = function() {
  var listComponent, components = [];

  // set title
  this.$listTitle.text(this._format(this.selectedDate, 'd. MMMM yyyy'));

  // find components to display on the list panel
  this.components.forEach(function(component) {
    if (belongsToSelectedDate.call(this, component)) {
      components.push(component);
    }
  }.bind(this));

  function belongsToSelectedDate(component) {
    var selectedDate = scout.dates.trunc(this.selectedDate);
    if (scout.dates.compare(selectedDate, component.coveredDaysRange.from) >= 0 &&
      scout.dates.compare(selectedDate, component.coveredDaysRange.to) <= 0) {
      return true;
    }
    return false;
  }

  components.forEach(function(component) {
    listComponent = new scout.CalendarListComponent(this.selectedDate, component);
    listComponent.render(this.$list);
    this._listComponents.push(listComponent);
  }.bind(this));
};

/* -- components, events-------------------------------------------- */

scout.Calendar.prototype._selectedComponentChanged = function(component, partDay) {
  this._setSelection(partDay, component);
};

scout.Calendar.prototype._onDayContextMenu = function(event) {
  this._showContextMenu(event, 'Calendar.EmptySpace');
};

scout.Calendar.prototype._showContextMenu = function(event, allowedType) {
  event.preventDefault();
  event.stopPropagation();

  var func = function func(event, allowedType) {
    if (!this.rendered || !this.attached) { // check needed because function is called asynchronously
      return;
    }
    var filteredMenus = scout.menus.filter(this.menus, [allowedType], true),
      $part = $(event.currentTarget);
    if (filteredMenus.length === 0) {
      return;
    }
    var popup = scout.create('ContextMenuPopup', {
      parent: this,
      menuItems: filteredMenus,
      location: {
        x: event.pageX,
        y: event.pageY
      },
      $anchor: $part
    });
    popup.open();
  }.bind(this);

  scout.menus.showContextMenuWithWait(this.session, func, event, allowedType);
};

/* -- components, arrangement------------------------------------ */

// TODO awe, cru: (calendar) arrange methods should work on the model, not on the DOM
scout.Calendar.prototype._arrangeComponents = function() {
  var k, $day, $allChildren, $children, $scrollableContainer, dayComponents, day,
    $days = $('.calendar-day', this.$grid);

  for (k = 0; k < $days.length; k++) {
    $day = $days.eq(k);
    $children = $day.children('.calendar-component:not(.component-task)');
    $allChildren = $day.children('.calendar-component');
    day = $day.data('date');

    $scrollableContainer = $day.children('.calendar-scrollable-components');

    if ($scrollableContainer.length > 0) {
      scout.scrollbars.uninstall($scrollableContainer, this.session);
      $scrollableContainer.remove();
    }

    if ($allChildren.length > 0) {
      $scrollableContainer = $day.appendDiv('calendar-scrollable-components');

      if (!this._isMonth()) {
        $scrollableContainer.addClass('calendar-scrollable-components-week');
      }

      for (var j = 0; j < $allChildren.length; j++) {
        var $child = $allChildren.eq(j);
        // non-tasks (communications) are distributed manually
        // within the parent container in all views except the monthly view.
        if (!this._isMonth() && !$child.hasClass('component-task')) {
          continue;
        }
        $scrollableContainer.append($child);
      }

      scout.scrollbars.install($scrollableContainer, {
        parent: this,
        session: this.session,
        axis: 'y'
      });
    }

    if (this._isMonth() && $children.length > 2) {
      $day.addClass('many-items');
    } else if (!this._isMonth() && $children.length > 1) {
      // logical placement
      dayComponents = this._getComponents($children);
      this._arrange(dayComponents, day);

      // screen placement
      this._arrangeComponentSetPlacement($children, day);
    }
  }
};

scout.Calendar.prototype._getComponents = function($children) {
  var i, $child;
  var components = [];
  for (i = 0; i < $children.length; i++) {
    $child = $children.eq(i);
    components.push($child.data('component'));
  }
  return components;
};

scout.Calendar.prototype._sort = function(components) {
  components.sort(this._sortFromTo);
};

/**
 * Arrange components (stack width, stack index) per day
 * */
scout.Calendar.prototype._arrange = function(components, day) {
  var i, j, c, r, k,
    rows = [];

  //ordered by from, to
  this._sort(components);

  //clear existing placement
  for (i = 0; i < components.length; i++) {
    c = components[i];
    if (!c.stack) {
      c.stack = {};
    }
    c.stack[day] = {};
  }

  for (i = 0; i < components.length; i++) {
    c = components[i];
    r = c.getPartDayPosition(day);

    //reduce number of rows, if all components end before this one
    if (rows.length > 0 && this._allEndBefore(rows, r.from, day)) {
      rows = [];
    }

    //replace an component that ends before and can be replaced
    k = this._findReplacableRow(rows, r.from, day);

    //insert
    if (k >= 0) {
      rows[k] = c;
      c.stack[day].x = k;
    } else {
      rows.push(c);
      c.stack[day].x = rows.length - 1;
    }

    //update stackW
    for (j = 0; j < rows.length; j++) {
      rows[j].stack[day].w = rows.length;
    }
  }
};

scout.Calendar.prototype._allEndBefore = function(rows, pos, day) {
  var i;
  for (i = 0; i < rows.length; i++) {
    if (!this._endsBefore(rows[i], pos, day)) {
      return false;
    }
  }
  return true;
};

scout.Calendar.prototype._findReplacableRow = function(rows, pos, day) {
  var j;
  for (j = 0; j < rows.length; j++) {
    if (this._endsBefore(rows[j], pos, day)) {
      return j;
    }
  }
  return -1;
};

scout.Calendar.prototype._endsBefore = function(component, pos, day) {
  return component.getPartDayPosition(day).to <= pos;
};

scout.Calendar.prototype._arrangeComponentSetPlacement = function($children, day) {
  var i, $child, stack;

  // loop and place based on data
  for (i = 0; i < $children.length; i++) {
    $child = $children.eq(i);
    stack = $child.data('component').stack[day];

    // make last element smaller
    $child
      .css('width', 100 / stack.w + '%')
      .css('left', stack.x * 100 / stack.w + '%');
  }
};

/* -- helper ---------------------------------------------------- */

scout.Calendar.prototype._dayPosition = function(hour) {
  var pos;
  if (hour < 0) {
    pos = 85;
  } else if (hour < 8) {
    pos = hour / 8 * 10 + 5;
  } else if (hour < 12) {
    pos = (hour - 8) / 4 * 25 + 15;
  } else if (hour < 13) {
    pos = (hour - 12) / 1 * 5 + 40;
  } else if (hour < 17) {
    pos = (hour - 13) / 4 * 25 + 45;
  } else if (hour <= 24) {
    pos = (hour - 17) / 7 * 10 + 70;
  }
  return Math.round(pos * 100) / 100;
};

scout.Calendar.prototype._hourToNumber = function(hour) {
  var splits = hour.split(':');
  return parseFloat(splits[0]) + parseFloat(splits[1]) / 60;
};

scout.Calendar.prototype._format = function(date, pattern) {
  return scout.dates.format(date, this.session.locale, pattern);
};

scout.Calendar.prototype._sortFromTo = function(c1, c2) {
  var from1 = scout.dates.parseJsonDate(c1.fromDate);
  var from2 = scout.dates.parseJsonDate(c2.fromDate);
  var dFrom = scout.dates.compare(from1, from2);
  if (dFrom !== 0) {
    return dFrom;
  }
  var to1 = scout.dates.parseJsonDate(c1.toDate);
  var to2 = scout.dates.parseJsonDate(c2.toDate);
  return scout.dates.compare(to1, to2);
};