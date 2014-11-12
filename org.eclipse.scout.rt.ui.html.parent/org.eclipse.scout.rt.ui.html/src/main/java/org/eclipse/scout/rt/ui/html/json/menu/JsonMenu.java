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
package org.eclipse.scout.rt.ui.html.json.menu;

import java.util.HashSet;
import java.util.Set;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.IMenuType;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.shared.ui.menu.IMenu5;
import org.eclipse.scout.rt.ui.html.json.AbstractJsonPropertyObserver;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonResponse;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonProperty;
import org.json.JSONObject;

public class JsonMenu extends AbstractJsonPropertyObserver<IMenu> {

  public static final String EVENT_MENU_ACTION = "menuAction";
  public static final String EVENT_ABOUT_TO_SHOW = "aboutToShow";
  public static final String PROP_SEPARATOR = "separator";
  public static final String PROP_MENU_TYPES = "menuTypes";
  public static final String PROP_CHILD_MENUS = "childMenus";
  public static final String PROP_SYSTEM_TYPE = "systemType";

  public JsonMenu(IMenu model, IJsonSession jsonSession, String id) {
    super(model, jsonSession, id);
  }

  @Override
  protected void initJsonProperties(IMenu model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonProperty<IMenu>(IMenu.PROP_TEXT, model) {
      @Override
      protected String modelValue() {
        return getModel().getText();
      }
    });
    putJsonProperty(new JsonProperty<IMenu>(IMenu.PROP_ICON_ID, model) {
      @Override
      protected String modelValue() {
        return getModel().getIconId();//FIXME CGU how to handle resources?
      }
    });

    putJsonProperty(new JsonProperty<IMenu>(IMenu.PROP_ENABLED, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isEnabled();
      }
    });
    putJsonProperty(new JsonProperty<IMenu>(IFormField.PROP_VISIBLE, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isVisible();
      }
    });
    putJsonProperty(new JsonProperty<IMenu>(PROP_SEPARATOR, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isSeparator();
      }
    });
    putJsonProperty(new JsonProperty<IMenu>(PROP_MENU_TYPES, model) {
      @Override
      protected Set<IMenuType> modelValue() {
        return getModel().getMenuTypes();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        Set<String> menuTypes = new HashSet<>();
        for (IMenuType type : getModel().getMenuTypes()) {
          String prefix = type.getClass().getSimpleName().replace("MenuType", "");
          menuTypes.add(prefix + "." + type.toString());
        }
        return menuTypes;
      }
    });
    if (getModel() instanceof IMenu5) {
      putJsonProperty(new JsonProperty<IMenu>(PROP_SYSTEM_TYPE, model) {
        @Override
        protected Integer modelValue() {
          return ((IMenu5) getModel()).getSystemType();
        }
      });
    }
    if (getModel() instanceof IMenu5) {
      putJsonProperty(new JsonProperty<IMenu>("defaultMenu", model) {
        @Override
        protected Boolean modelValue() {
          return ((IMenu5) getModel()).isDefault();
        }
      });
    }
  }

  @Override
  protected void handleModelPropertyChange(String propertyName, Object newValue) {
    if (IMenu.PROP_MENU_TYPES.equals(propertyName)) {
      //FIXME CGU name of IMenu.PROP_MENU_TYPES is propMenuTypes which is bad -> fix it and remove the following lines
      JsonProperty jsonProperty = getJsonProperty(PROP_MENU_TYPES);
      addPropertyChangeEvent(propertyName, jsonProperty.prepareValueForToJson(newValue));
    }
    else {
      super.handleModelPropertyChange(propertyName, newValue);
    }
  }

  @Override
  protected void attachModel() {
    super.attachModel();
    attachAdapters(getModel().getChildActions());
  }

  @Override
  public JSONObject toJson() {
    return putAdapterIdsProperty(super.toJson(), PROP_CHILD_MENUS, getModel().getChildActions());
  }

  @Override
  public String getObjectType() {
    return "Menu";
  }

  @Override
  public void handleUiEvent(JsonEvent event, JsonResponse res) {
    if (EVENT_MENU_ACTION.equals(event.getType())) {
      handleUiMenuAction(event, res);
    }
    else if (EVENT_ABOUT_TO_SHOW.equals(event.getType())) {
      handleUiMenuAboutToShow(event, res);
    }
  }

  public void handleUiMenuAction(JsonEvent event, JsonResponse res) {
    getModel().getUIFacade().fireActionFromUI();
  }

  public void handleUiMenuAboutToShow(JsonEvent event, JsonResponse res) {
    getModel().aboutToShow();
  }
}
