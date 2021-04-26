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
/**
 * Abstract class for all form-fields.
 * @abstract
 */
scout.FormField = function() {
  scout.FormField.parent.call(this);
  this.$label;

  /**
   * Note the difference between $field and $fieldContainer:
   * - $field points to the input-field (typically a browser-text field)
   * - $fieldContainer could point to the same input-field or when the field is a composite,
   *   to the parent DIV of that composite. For instance: the multi-line-smartfield is a
   *   composite with a input-field and a DIV showing the additional lines. In that case $field
   *   points to the input-field and $fieldContainer to the parent DIV of the input-field.
   *   This property should be used primarily for layout-functionality.
   */
  this.$field;
  this.$fieldContainer;

  /**
   * The status label is used for error-status, tooltip-icon and menus.
   */
  this.$status;
  this._addAdapterProperties(['keyStrokes', 'menus']);
  this.refFieldId;
  this.mode = scout.FormField.MODE_DEFAULT;
  this.loadingSupport; // Object to handle the 'loading' property (different for tile fields)

  /**
   * Set this property to true when the form-field should stay enabled in offline case.
   * By default the field will be disabled.
   */
  this.enabledWhenOffline = false;

  /**
   * Some browsers don't support copying text from disabled input fields. If such a browser is detected
   * and this flag is true (defaul is false), an overlay DIV is rendered over disabled fields which
   * provides a custom copy context menu that opens the ClipboardForm.
   */
  this.disabledCopyOverlay = false;
  this.$disabledCopyOverlay;
};
scout.inherits(scout.FormField, scout.ModelAdapter);

scout.FormField.LABEL_POSITION_DEFAULT = 0;
scout.FormField.LABEL_POSITION_LEFT = 1;
scout.FormField.LABEL_POSITION_ON_FIELD = 2;
scout.FormField.LABEL_POSITION_RIGHT = 3;
scout.FormField.LABEL_POSITION_TOP = 4;

scout.FormField.STATUS_POSITION_DEFAULT = 'default';
scout.FormField.STATUS_POSITION_TOP = 'top';

/**
 * Indicates the field to be used in default mode, e.g. in a Form.
 */
scout.FormField.MODE_DEFAULT = 'default';
/**
 * Indicates the field to be used within a cell editor.
 */
scout.FormField.MODE_CELLEDITOR = 'celleditor';

scout.FormField.prototype._init = function(model) {
  scout.FormField.parent.prototype._init.call(this, model);
  this.refFieldId = this.uniqueId('ref');
  this._syncKeyStrokes(this.keyStrokes);
  this._syncMenus(this.menus);
  this._syncErrorStatus(this.errorStatus);
};

/**
 * All sub-classes of scout.FormField must implement a _render method. The default implementation
 * will throw an Error when _render is called. The _render method should call the various add*
 * methods provided by the FormField class. A possible _render implementation could look like this.
 *
 * <pre>
 * this.addContainer($parent, 'form-field');
 * this.addLabel();
 * this.addField($parent.makeDiv('foo', 'bar'));
 * this.addMandatoryIndicator();
 * this.addStatus();
 * </pre>
 */
scout.FormField.prototype._render = function($parent) {
  throw new Error('sub-classes of scout.FormField must implement a _render method');
};

scout.FormField.prototype._renderProperties = function() {
  this._renderEnabled();
  this._renderMandatory();
  this._renderVisible();
  this._renderTooltipText();
  this._renderErrorStatus();
  this._renderMenus();
  this._renderLabel();
  this._renderLabelVisible();
  this._renderStatusVisible();
  this._renderStatusPosition();
  this._renderCssClass();
  this._renderFont();
  this._renderForegroundColor();
  this._renderBackgroundColor();
  this._renderLabelFont();
  this._renderLabelForegroundColor();
  this._renderLabelBackgroundColor();
  this._renderGridData();
  this._renderLoading();
};

scout.FormField.prototype._remove = function() {
  scout.FormField.parent.prototype._remove.call(this);
  this._removeField();
  this._removeStatus();
  this._removeLabel();
  this._removeDisabledCopyOverlay();
  this._uninstallDragAndDropHandler();
};

scout.FormField.prototype._renderMandatory = function() {
  this.$container.toggleClass('mandatory', this.mandatory);
};

scout.FormField.prototype._renderErrorStatus = function() {
  var hasStatus = !!this.errorStatus,
    statusClass = hasStatus ? this.errorStatus.cssClass() : '';

  this.$container.removeClass(scout.Status.cssClasses);
  this.$container.addClass(statusClass, hasStatus);
  if (this.$field) {
    this.$field.removeClass(scout.Status.cssClasses);
    this.$field.addClass(statusClass, hasStatus);
  }

  this._updateStatusVisible();
  if (hasStatus) {
    this._showStatusMessage();
  } else {
    this._hideStatusMessage();
  }
};

scout.FormField.prototype._renderTooltipText = function() {
  var tooltipText = this.tooltipText;
  var hasTooltipText = scout.strings.hasText(tooltipText);
  this.$container.toggleClass('has-tooltip', hasTooltipText);
  if (this.$field) {
    this.$field.toggleClass('has-tooltip', hasTooltipText);
  }
  this._updateStatusVisible();
};

scout.FormField.prototype._renderVisible = function(visible) {
  visible = scout.nvl(visible, this.visible);
  this.$container.setVisible(visible);
  if (this.rendered) {
    var htmlCompParent = this.htmlComp.getParent();
    if (htmlCompParent) { // may be null if $container is detached
      htmlCompParent.invalidateLayoutTree();
    }
  }
};

scout.FormField.prototype._renderLabel = function() {
  var label = this.label;
  if (this.labelPosition === scout.FormField.LABEL_POSITION_ON_FIELD) {
    this._renderPlaceholder();
    if (this.$label) {
      this.$label.text('');
    }
  } else if (this.$label) {
    this._removePlaceholder();
    // Make sure an empty label is as height as the other labels, especially important for top labels
    this.$label.textOrNbsp(scout.strings.removeAmpersand(label), 'empty');

    // Invalidate layout if label width depends on its content
    if (this.labelUseUiWidth) {
      this.invalidateLayoutTree();
    }
  }
};

scout.FormField.prototype._renderPlaceholder = function($field) {
  $field = scout.nvl($field, this.$field);
  if ($field) {
    $field.placeholder(this.label);
  }
};

scout.FormField.prototype._removePlaceholder = function($field) {
  $field = scout.nvl($field, this.$field);
  if ($field) {
    $field.placeholder('');
  }
};

scout.FormField.prototype._renderLabelVisible = function() {
  var visible = this.labelVisible;
  this._renderChildVisible(this.$label, visible);
  this.$container.toggleClass('label-hidden', !visible);
};

scout.FormField.prototype._renderStatusVisible = function() {
  var statusVisible = this.statusVisible;
  this._renderChildVisible(this.$status, this._computeStatusVisible());
  // Pseudo status is only for layouting purpose, therefore tooltip, errorStatus etc. must not influence its visibility -> not necessary to use _computeStatusVisible
  this._renderChildVisible(this.$pseudoStatus, statusVisible);

  // Make sure tooltip gets removed if there is no status anymore (tooltip points to the status)
  if (this.$status && !this.$status.isVisible() && this.tooltip) {
    this.tooltip.remove();
  }
};

scout.FormField.prototype._renderStatusPosition = function() {
  this.invalidateLayoutTree();
};

/**
 * Visibility of the status not only depends on this.statusVisible but on other attributes as well, computed by _computeStatusVisible.
 * Call this method if any of the conditions change to recompute the status visibility.
 */
scout.FormField.prototype._updateStatusVisible = function() {
  if (!this.statusVisible) {
    this._renderStatusVisible();
  }
};

/**
 * Computes whether the $status should be visible based on statusVisible, errorStatus and tooltip.
 * -> errorStatus and tooltip override statusVisible, so $status may be visible event though statusVisible is set to false
 */
scout.FormField.prototype._computeStatusVisible = function() {
  var statusVisible = this.statusVisible,
    hasStatus = !!this.errorStatus,
    hasTooltip = !!this.tooltipText;

  return !this.suppressStatus && (statusVisible || hasStatus || hasTooltip || (this._hasMenus() && this.menusVisible));
};

scout.FormField.prototype._renderChildVisible = function($child, visible) {
  if (!$child) {
    return;
  }
  if ($child.isVisible() !== visible) {
    $child.setVisible(visible);
    this.invalidateLayoutTree();
    return true;
  }
};

// Don't include in renderProperties, it is not necessary to execute it initially because the positioning is done by _renderLabel
scout.FormField.prototype._renderLabelPosition = function(position) {
  this._renderLabel();
};

scout.FormField.prototype._renderEnabled = function(enabled) {
  enabled = scout.nvl(enabled, this.enabled);
  this.$container.setEnabled(enabled);
  if (this.$field) {
    this.$field.setEnabled(enabled);
  }
  this._updateDisabledCopyOverlay();
};

scout.FormField.prototype._renderCssClass = function(cssClass, oldCssClass) {
  cssClass = cssClass || this.cssClass;
  this.$container.removeClass(oldCssClass);
  this.$container.addClass(cssClass);
};

scout.FormField.prototype._renderFont = function() {
  scout.styles.legacyStyle(this, this.$field);
};

scout.FormField.prototype._renderForegroundColor = function() {
  scout.styles.legacyStyle(this, this.$field);
};

scout.FormField.prototype._renderBackgroundColor = function() {
  scout.styles.legacyStyle(this, this.$field);
};

scout.FormField.prototype._renderLabelFont = function() {
  scout.styles.legacyStyle(this, this.$label, 'label');
};

scout.FormField.prototype._renderLabelForegroundColor = function() {
  scout.styles.legacyStyle(this, this.$label, 'label');
};

scout.FormField.prototype._renderLabelBackgroundColor = function() {
  scout.styles.legacyStyle(this, this.$label, 'label');
};

scout.FormField.prototype._renderGridData = function() {
  if (this.rendered) {
    var htmlCompParent = this.htmlComp.getParent();
    if (htmlCompParent) { // may be null if $container is detached
      htmlCompParent.invalidateLayoutTree();
    }
  }
};

scout.FormField.prototype._renderMenus = function() {
  this._updateMenus();
};

scout.FormField.prototype._renderMenusVisible = function() {
  this._updateMenus();
};

scout.FormField.prototype._renderLoading = function() {
  if (this.loadingSupport) {
    this.loadingSupport.renderLoading();
  }
};

scout.FormField.prototype._getCurrentMenus = function() {
  return this.menus.filter(function(menu) {
    return menu.visible;
  });
};

scout.FormField.prototype._hasMenus = function() {
  return !!(this.menus && this._getCurrentMenus().length > 0);
};

scout.FormField.prototype._updateMenus = function() {
  this._updateStatusVisible();
  this.$container.toggleClass('has-menus', this._hasMenus() && this.menusVisible);
};

scout.FormField.prototype._syncKeyStrokes = function(keyStrokes, oldKeyStrokes) {
  this.updateKeyStrokes(keyStrokes, oldKeyStrokes);
  this.keyStrokes = keyStrokes;
};

scout.FormField.prototype._renderKeyStrokes = function() {
  // Do nothing! If this method was not overridden, the default logic would call
  // render() on the new key stroke adapters. This would cause an error, as Action.js
  // is not intended to be rendered (KeyStroke.js is not a model adapter).
};

scout.FormField.prototype._syncMenus = function(menus, oldMenus) {
  this.updateKeyStrokes(menus, oldMenus);
  this.menus = menus;
};

scout.FormField.prototype._syncErrorStatus = function(errorStatus) {
  if (errorStatus) {
    this.errorStatus = new scout.Status(errorStatus);
  } else {
    this.errorStatus = null;
  }
};

scout.FormField.prototype.setLabel = function(label) {
  this._setProperty('label', label);
  if (this.rendered) {
    this._renderLabel();
  }
};

scout.FormField.prototype.setTooltipText = function(tooltipText) {
  this._setProperty('tooltipText', tooltipText);
  if (this.rendered) {
    this._renderTooltipText();
  }
};

scout.FormField.prototype.setErrorStatus = function(errorStatus) {
  this._setProperty('errorStatus', errorStatus);
  if (this.rendered) {
    this._renderErrorStatus();
  }
};

scout.FormField.prototype.setMenus = function(menus) {
  this._setProperty('menus', menus);
  if (this.rendered) {
    this._renderMenus();
  }
};

scout.FormField.prototype.setMenusVisible = function(menusVisible) {
  this._setProperty('menusVisible', menusVisible);
  if (this.rendered) {
    this._renderMenusVisible();
  }
};

/**
 * Sets the focus on this field if the field is rendered.
 */
scout.FormField.prototype.focus = function() {
  if (!this.rendered) {
    return;
  }
  if (this.$field) {
    this.session.focusManager.requestFocus(this.$field[0]);
  } else {
    var element = this.session.focusManager.findFirstFocusableElement(this.$container);
    this.session.focusManager.requestFocus(element);
  }
};

scout.FormField.prototype._onStatusMousedown = function(event) {
  // showing menus is more important than showing tooltips
  if (this.menusVisible && this._hasMenus()) {
    var func = function func(event) {
      if (!this.rendered || !this.attached) { // check needed because function is called asynchronously
        return;
      }
      var menus = this._getCurrentMenus();
      // Toggle menu
      if (this.contextPopup && this.contextPopup.rendered) {
        this.contextPopup.close();
        this.contextPopup = null;
      } else {
        if (!menus.some(function(menuItem) {
            return menuItem.visible;
          })) {
          return; // at least one menu item must be visible
        }
        this.contextPopup = scout.create('ContextMenuPopup', {
          parent: this,
          $anchor: this.$status,
          menuItems: menus,
          cloneMenuItems: false,
          closeOnAnchorMousedown: false
        });
        this.contextPopup.open();
      }
    }.bind(this);

    scout.menus.showContextMenuWithWait(this.session, func, event);
  } else {
    // Toggle tooltip
    if (this.tooltip && this.tooltip.rendered) {
      this._hideStatusMessage();
    } else {
      this._showStatusMessage();
    }
  }
};

scout.FormField.prototype._showStatusMessage = function() {
  // Don't show a tooltip if there is no visible $status (tooltip points to the status)
  if (!this.$status || !this.$status.isVisible()) {
    return;
  }

  var opts,
    text = this.tooltipText,
    severity = scout.Status.OK,
    autoRemove = true;

  if (this.errorStatus) {
    text = this.errorStatus.message;
    severity = this.errorStatus.severity;
    autoRemove = !(this.errorStatus && this.errorStatus.isError());
    if (this.tooltip && this.tooltip.autoRemove !== autoRemove) {
      // AutoRemove may not be changed dynamically -> Remove and reopen tooltip
      this.tooltip.remove();
      this.tooltip = null;
    }

    // If the field is used as a cell editor in a editable table, then no validation errors should be shown.
    // (Parsing and validation will be handled by the cell/column itself)
    if (this.mode === scout.FormField.MODE_CELLEDITOR) {
      return;
    }
  }

  if (scout.strings.empty(text)) {
    // Refuse to show empty tooltip
    return;
  }

  if (this.tooltip && this.tooltip.rendered) {
    // update existing tooltip
    this.tooltip.setText(text);
    this.tooltip.setSeverity(severity);
  } else {
    // create new tooltip
    opts = {
      parent: this,
      text: text,
      severity: severity,
      autoRemove: autoRemove,
      $anchor: this.$status
    };
    this.tooltip = scout.create('Tooltip', opts);
    this.tooltip.render();
  }
};

scout.FormField.prototype._hideStatusMessage = function() {
  if (this.tooltip) {
    this.tooltip.remove();
    this.tooltip = null;
  }
};

/**
 * This method returns the HtmlElement to be used as initial focus element.
 * It can be overridden, in case the FormField needs to return something other than this.$field[0].
 */
scout.FormField.prototype.getFocusableElement = function() {
  if (this.rendered) {
    return this.$field[0];
  }
  return null;
};

scout.FormField.prototype.getForm = function() {
  var parent = this.parent;
  while (parent && !(parent instanceof scout.Form)) {
    parent = parent.parent;
  }
  return parent;
};

scout.FormField.prototype._goOffline = function() {
  if (this.enabledWhenOffline) {
    return;
  }
  this._renderEnabled(false);
};

scout.FormField.prototype._goOnline = function() {
  if (this.enabledWhenOffline) {
    return;
  }
  if (this.enabled) {
    this._renderEnabled(true);
  }
};

/**
 * Appends a LABEL element to this.$container and sets the this.$label property.
 */
scout.FormField.prototype.addLabel = function() {
  this.$label = this.$container.appendElement('<label>');
  scout.tooltips.installForEllipsis(this.$label, {
    parent: this
  });
};

scout.FormField.prototype._removeLabel = function() {
  if (!this.$label) {
    return;
  }
  this.$label.remove();
  this.$label = null;
};

/**
 * Appends the given field to the this.$container and sets the property this.$field.
 * The $field is used as $fieldContainer as long as you don't explicitly call addFieldContainer before calling addField.
 */
scout.FormField.prototype.addField = function($field) {
  if (!this.$fieldContainer) {
    this.addFieldContainer($field);
  }
  this.$field = $field;
};

/**
 * Call this method before addField if you'd like to have a different field container than $field.
 */
scout.FormField.prototype.addFieldContainer = function($fieldContainer) {
  this.$fieldContainer = $fieldContainer
    .addClass('field')
    .appendTo(this.$container);
};

/**
 * Removes this.$field and this.$fieldContainer and sets the properties to null.
 */
scout.FormField.prototype._removeField = function() {
  if (this.$field) {
    this.$field.remove();
    this.$field = null;
  }
  if (this.$fieldContainer) {
    this.$fieldContainer.remove();
    this.$fieldContainer = null;
  }
};

/**
 * Appends a SPAN element for form-field status to this.$container and sets the this.$status property.
 */
scout.FormField.prototype.addStatus = function() {
  if (this.$status) {
    return;
  }
  this.$status = this.$container
    .appendSpan('status')
    .on('mousedown', this._onStatusMousedown.bind(this));
};

scout.FormField.prototype._removeStatus = function() {
  this._hideStatusMessage();
  if (!this.$status) {
    return;
  }
  this.$status.remove();
  this.$status = null;
};

/**
 * Appends a SPAN element to this.$container and sets the this.$pseudoStatus property.
 * The purpose of a pseudo status is to consume the space an ordinary status would.
 * This makes it possible to make components without a status as width as components with a status.
 */
scout.FormField.prototype.addPseudoStatus = function() {
  this.$pseudoStatus = this.$container.appendSpan('status');
};

scout.FormField.prototype.addMandatoryIndicator = function() {
  this.$mandatory = this.$container.appendSpan('mandatory-indicator');
};

scout.FormField.prototype.removeMandatoryIndicator = function() {
  this.$mandatory.remove();
  this.$mandatory = null;
};

/**
 * Adds a SPAN element with class 'icon' the the given optional $parent.
 * When $parent is not set, the element is added to this.$container.
 * @param $parent (optional)
 */
scout.FormField.prototype.addIcon = function($parent) {
  if (!$parent) {
    $parent = this.$container;
  }
  this.$icon = scout.fields.appendIcon($parent)
    .click(this._onIconClick.bind(this));
};

scout.FormField.prototype._onIconClick = function(event) {
  this.$field.focus();
};

/**
 * Appends a DIV element as form-field container to $parent and sets the this.$container property.
 * Applies (logical) grid-data and FormFieldLayout to this.$container.
 * Sets this.htmlComp to the HtmlComponent created for this.$container.
 *
 * @param $parent to which container is appended
 * @param cssClass cssClass to add to the new container DIV
 * @param layout when layout is undefined, scout.FormFieldLayout() is set
 *
 */
scout.FormField.prototype.addContainer = function($parent, cssClass, layout) {
  this.$container = $parent.appendDiv('form-field');
  if (cssClass) {
    this.$container.addClass(cssClass);
  }
  var htmlComp = new scout.HtmlComponent(this.$container, this.session);
  htmlComp.layoutData = new scout.LogicalGridData(this);
  htmlComp.setLayout(layout || new scout.FormFieldLayout(this));
  this.htmlComp = htmlComp;
};

/**
 * Updates the "inner alignment" of a field. Usually, the GridData hints only have influence on the
 * LogicalGridLayout. However, the properties "horizontalAlignment" and "verticalAlignment" are
 * sometimes used differently. Instead of controlling the field alignment in case fillHorizontal/
 * fillVertical is false, the developer expects the _contents_ of the field to be aligned correspondingly
 * inside the field. Technically, this is not correct, but is supported for legacy and convenience
 * reasons for some of the Scout fields. Those who support the behavior may override _renderGridData()
 * and call this method. Some CSS classes are then added to the field.
 *
 * opts:
 *   useHorizontalAlignment:
 *     When this option is true, "halign-" classes are added according to gridData.horizontalAlignment.
 *   useVerticalAlignment:
 *     When this option is true, "valign-" classes are added according to gridData.verticalAlignment.
 *   $fieldContainer:
 *     Specifies the div where the classes should be added. If omitted, this.$fieldContainer is used.
 */
scout.FormField.prototype.updateInnerAlignment = function(opts) {
  opts = opts || {};
  var useHorizontalAlignment = scout.nvl(opts.useHorizontalAlignment, true);
  var useVerticalAlignment = scout.nvl(opts.useVerticalAlignment, true);
  var $fieldContainer = opts.$fieldContainer || this.$fieldContainer;

  if ($fieldContainer) {
    $fieldContainer.removeClass('has-inner-alignment halign-left halign-center halign-right valign-top valign-middle valign-bottom');
    if (useHorizontalAlignment || useVerticalAlignment) {
      // Set horizontal and vertical alignment (from gridData)
      $fieldContainer.addClass('has-inner-alignment');
      if (useHorizontalAlignment) {
        var hAlign = this.gridData.horizontalAlignment;
        $fieldContainer.addClass(hAlign < 0 ? 'halign-left' : (hAlign > 0 ? 'halign-right' : 'halign-center'));
      }
      if (useVerticalAlignment) {
        var vAlign = this.gridData.verticalAlignment;
        $fieldContainer.addClass(vAlign < 0 ? 'valign-top' : (vAlign > 0 ? 'valign-bottom' : 'valign-middle'));
      }
    }
  }
};

scout.FormField.prototype.prepareForCellEdit = function(opts) {
  opts = opts || {};

  // remove mandatory and status indicators (popup should 'fill' the whole cell)
  if (this.$mandatory) {
    this.removeMandatoryIndicator();
  }
  if (this.$status) {
    this.$status.remove();
    this.$status = null;
  }
  if (this.$container) {
    this.$container.addClass('cell-editor-form-field');
  }
  if (this.$field) {
    this.$field.addClass('cell-editor-field');
    if (opts.firstCell) {
      this.$field.addClass('first');
    }
  }
};

scout.FormField.prototype._renderDropType = function() {
  if (this.dropType) {
    this._installDragAndDropHandler();
  } else {
    this._uninstallDragAndDropHandler();
  }
};

scout.FormField.prototype._createDragAndDropHandler = function() {
  return scout.dragAndDrop.handler(this, {
    supportedScoutTypes: scout.dragAndDrop.SCOUT_TYPES.FILE_TRANSFER,
    dropType: function() {
      return this.dropType;
    }.bind(this),
    dropMaximumSize: function() {
      return this.dropMaximumSize;
    }.bind(this)
  });
};

scout.FormField.prototype._installDragAndDropHandler = function(event) {
  if (this.dragAndDropHandler) {
    return;
  }
  this.dragAndDropHandler = this._createDragAndDropHandler();
  this.dragAndDropHandler.install(this.$field);
};

scout.FormField.prototype._uninstallDragAndDropHandler = function(event) {
  if (!this.dragAndDropHandler) {
    return;
  }
  this.dragAndDropHandler.uninstall();
  this.dragAndDropHandler = null;
};

scout.FormField.prototype._updateDisabledCopyOverlay = function() {
  if (this.disabledCopyOverlay && !scout.device.supportsCopyFromDisabledInputFields()) {
    if (this.enabled) {
      this._removeDisabledCopyOverlay();
    } else {
      this._renderDisabledCopyOverlay();
      this.revalidateLayout(); // because bounds of overlay is set in FormFieldLayout
    }
  }
};

scout.FormField.prototype._renderDisabledCopyOverlay = function() {
  if (!this.$disabledCopyOverlay) {
    this.$disabledCopyOverlay = this.$container
      .appendDiv('disabled-overlay')
      .on('contextmenu', this._createCopyContextMenu.bind(this));
  }
};

scout.FormField.prototype._removeDisabledCopyOverlay = function() {
  if (this.$disabledCopyOverlay) {
    this.$disabledCopyOverlay.remove();
    this.$disabledCopyOverlay = null;
  }
};

scout.FormField.prototype._createCopyContextMenu = function(event) {
  if (!this.visible || scout.strings.empty(this.displayText)) {
    return;
  }

  var field = this;
  var menu = scout.create('Menu', {
    parent: this,
    text: this.session.text('ui.Copy')
  });
  menu.remoteHandler = function(event) {
    if ('doAction' === event.type && field instanceof scout.ValueField) {
      field._send('exportToClipboard');
    }
  };

  var popup = scout.create('ContextMenuPopup', {
    parent: this,
    menuItems: [menu],
    cloneMenuItems: false,
    location: {
      x: event.pageX,
      y: event.pageY
    },
    $anchor: this._$disabledOverlay
  });
  popup.open();
};