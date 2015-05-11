var FormSpecHelper = function(session) {
  this.session = session;
};

FormSpecHelper.prototype.createFormWithOneField = function(session, parentId) {
  var form = this.createFormModel();
  var rootGroupBox = this.createGroupBoxModel();
  var field = this.createFieldModel();

  form.rootGroupBox = rootGroupBox.id;
  form.owner = parentId || session.rootAdapter.id;
  rootGroupBox.fields = [field.id];

  return createAdapter(form, session, [rootGroupBox, field]);
};

FormSpecHelper.prototype.createFormModel = function() {
  return createSimpleModel('Form');
};

FormSpecHelper.prototype.createFieldModel = function(objectType) {
  var model = createSimpleModel(objectType || 'StringField');
  $.extend(model, {
    'enabled': true,
    'visible': true
  });

  return model;
};

FormSpecHelper.prototype.createGroupBoxModel = function() {
  return this.createFieldModel('GroupBox');
};

FormSpecHelper.prototype.createFormXFields = function(x, session, isModal, parentId) {
  var form = isModal ? this.createFormModelWithDisplayHint('dialog') : this.createFormModelWithDisplayHint('view');
  var rootGroupBox = this.createGroupBoxModel();
  var fields = [];
  var fieldIds = [];
  var field;
  for(var i=0; i<x ;i++){
    field = this.createFieldModel();
    fields.push(field);
    fieldIds.push(field.id);
  }
  rootGroupBox.fields = fieldIds;
  form.rootGroupBox = rootGroupBox.id;
  form.owner = parentId || session.rootAdapter.id;
  fields.push(rootGroupBox);
  return createAdapter(form, session, fields);
};

FormSpecHelper.prototype.createFormModelWithDisplayHint = function(displayHint) {
  var model = createSimpleModel('Form');
  $.extend(model, {
    'displayHint': displayHint
  });
  return model;
};
