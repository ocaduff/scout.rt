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
scout.FormTableControlLayout = function(control) {
  scout.FormTableControlLayout.parent.call(this);
  this.control = control;
};
scout.inherits(scout.FormTableControlLayout, scout.AbstractLayout);

scout.FormTableControlLayout.prototype.layout = function($container) {
  if (!this.control.contentRendered) {
    return;
  }

  var formSize,
    form = this.control.form,
    controlContentSize = scout.graphics.getSize(this.control.tableFooter.$controlContent);

  if (this.control.form) {
    var htmlForm = form.htmlComp;
    formSize = controlContentSize.subtract(htmlForm.getMargins());
    htmlForm.setSize(formSize);

    // special case: when the control is opened/resized and there is not enough space, ensure that the active element is
    // visible by scrolling to it
    if (form.rootGroupBox.fields[0] instanceof scout.TabBox) {
      var tabBox = form.rootGroupBox.fields[0];
      var tabIndex = tabBox.selectedTab;
      var tab = tabBox.tabItems[tabIndex];
      if (tab && tab.scrollable && tab.$body.has(document.activeElement)) {
        scout.scrollbars.scrollTo(tab.$body, $(document.activeElement));
      }
    }
  }
};