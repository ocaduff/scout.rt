/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.json.form.fields.sequencebox;

import org.eclipse.scout.rt.client.ui.form.fields.sequencebox.ISequenceBox;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonFormField;
import org.json.JSONObject;

/**
 * This class creates JSON output for an <code>ISequenceBox</code>.
 */
public class JsonSequenceBox<T extends ISequenceBox> extends JsonFormField<T> {

  public static final String PROP_FIELDS = "fields";

  public JsonSequenceBox(T model, IJsonSession session, String id) {
    super(model, session, id);
  }

  @Override
  public String getObjectType() {
    return "SequenceBox";
  }

  @Override
  protected void createChildAdapters() {
    super.createChildAdapters();
    attachAdapters(getModel().getFields());
    // TODO AWE: ask C.GU ... müsste das jetzt nicht ins attach rein?
    // wollen wir vielleicht auch noch ein attachChildAdapters machen?
    // naming ist auch falsch irgendwie getOrCreateAndAttach :)
  }

  @Override
  protected void disposeChildAdapters() {
    super.disposeChildAdapters();
    disposeAdapters(getModel().getFields());
  }

  @Override
  public JSONObject toJson() {
    return putProperty(super.toJson(), PROP_FIELDS, getAdapterIdsForModels(getModel().getFields()));
  }

}
