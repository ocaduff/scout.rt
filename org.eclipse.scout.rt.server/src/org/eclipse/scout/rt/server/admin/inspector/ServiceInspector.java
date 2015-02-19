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
package org.eclipse.scout.rt.server.admin.inspector;

import java.beans.PropertyDescriptor;
import java.lang.reflect.Method;

import org.eclipse.scout.commons.TypeCastUtility;
import org.eclipse.scout.service.IServiceInventory;

public class ServiceInspector {

  private final Object m_service;

  public ServiceInspector(Object service) {
    m_service = service;
  }

  public ReflectServiceInventory buildInventory() {
    ReflectServiceInventory inv = new ReflectServiceInventory(m_service);
    if (m_service instanceof IServiceInventory) {
      // make service inventory
      IServiceInventory si = (IServiceInventory) m_service;
      inv.addState(si.getInventory());
    }
    return inv;
  }

  public Object getService() {
    return m_service;
  }

  public void changeProperty(PropertyDescriptor propDesc, String propText) throws Exception {
    if (propText != null && propText.length() == 0) {
      propText = null;
    }
    Method setterMethod = propDesc.getWriteMethod();
    if (setterMethod != null) {
      Object value = TypeCastUtility.castValue(propText, propDesc.getPropertyType());
      setterMethod.invoke(m_service, new Object[]{value});
    }
  }

}
