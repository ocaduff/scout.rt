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
package org.eclipse.scout.rt.ui.json;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.json.JSONException;
import org.json.JSONObject;

public class JsonMenu extends AbstractJsonPropertyObserverRenderer<IMenu> {

  public JsonMenu(IMenu modelObject, IJsonSession jsonSession) {
    super(modelObject, jsonSession);
  }

  @Override
  public JSONObject toJson() throws JsonUIException {
    try {
      JSONObject json = new JSONObject();
      json.put("objectType", "Menu");
      json.put("id", getId());
      json.put("label", getModelObject().getText());//FIXME renameIMenu.PROP_TEXT
      json.put("icon", getModelObject().getIconId());//FIXME how to handle resources?
      return json;
    }
    catch (JSONException e) {
      throw new JsonUIException(e.getMessage(), e);
    }
  }

  @Override
  public void handleUiEvent(JsonEvent event, JsonResponse res) throws JsonUIException {
  }

  protected void handleUiDrillDownEvent(JsonEvent event, JsonResponse res) throws JsonUIException {
  }
}
