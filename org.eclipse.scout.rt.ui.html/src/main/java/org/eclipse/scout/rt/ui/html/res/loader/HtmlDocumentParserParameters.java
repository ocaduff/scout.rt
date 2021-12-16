/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.ui.html.res.loader;

public class HtmlDocumentParserParameters {

  private final boolean m_minify;
  private final boolean m_cacheEnabled;
  private final boolean m_isBrowserSupported;
  private final String m_basePath;
  private final String m_theme;
  private final String m_htmlPath;

  public HtmlDocumentParserParameters(String htmlPath, String theme, boolean minify, boolean cacheEnabled, String basePath) {
    this(htmlPath, theme, minify, cacheEnabled, basePath, true);
  }

  public HtmlDocumentParserParameters(String htmlPath, String theme, boolean minify, boolean cacheEnabled, String basePath, boolean isBrowserSupported) {
    m_minify = minify;
    m_cacheEnabled = cacheEnabled;
    m_isBrowserSupported = isBrowserSupported;
    m_basePath = basePath;
    m_theme = theme;
    m_htmlPath = htmlPath;
  }

  public boolean isMinify() {
    return m_minify;
  }

  public boolean isCacheEnabled() {
    return m_cacheEnabled;
  }

  public boolean isBrowserSupported() {
    return m_isBrowserSupported;
  }

  public String getHtmlPath() {
    return m_htmlPath;
  }

  public String getBasePath() {
    return m_basePath;
  }

  public String getTheme() {
    return m_theme;
  }
}
