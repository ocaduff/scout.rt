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
package org.eclipse.scout.rt.ui.html;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.scout.rt.platform.ApplicationScoped;

/**
 * This interceptor contributes to the {@link UiServlet}
 */
@ApplicationScoped
public interface IServletRequestInterceptor {

  public static final String MDC_SCOUT_SESSION_ID = "scout.session.id";
  public static final String MDC_SCOUT_UI_SESSION_ID = "scout.ui.session.id";

  /**
   * @return true if the request was consumed by the interceptor, no further action is then necessary
   */
  boolean interceptPost(UiServlet servlet, HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException;

  /**
   * @return true if the request was consumed by the interceptor, no further action is then necessary
   */
  boolean interceptGet(UiServlet servlet, HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException;
}
