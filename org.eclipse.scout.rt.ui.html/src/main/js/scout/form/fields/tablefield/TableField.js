// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.TableField = function() {
  scout.TableField.parent.call(this);
  this._addAdapterProperties(['table']);
};
scout.inherits(scout.TableField, scout.FormField);

scout.TableField.prototype._render = function($parent) {
  this.addContainer($parent, 'table-field');
  this.addLabel();
  this.addMandatoryIndicator();
  this.addStatus();
  this._renderTable();
};

scout.TableField.prototype._renderTable = function() {
  if (this.table) {
    this.table.render(this.$container);
    this.addField(this.table.$container);
  }
};

scout.TableField.prototype._removeTable = function(oldTable) {
  oldTable.remove();
  this.removeField();
};
