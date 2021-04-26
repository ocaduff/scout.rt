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
package org.eclipse.scout.rt.ui.html.res.loader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.resource.BinaryResource;
import org.eclipse.scout.rt.platform.resource.BinaryResources;
import org.eclipse.scout.rt.server.commons.servlet.cache.HttpCacheControl;
import org.eclipse.scout.rt.server.commons.servlet.cache.HttpCacheKey;
import org.eclipse.scout.rt.server.commons.servlet.cache.HttpCacheObject;
import org.eclipse.scout.rt.ui.html.res.IWebContentService;
import org.eclipse.scout.rt.ui.html.script.ScriptFileBuilder;
import org.eclipse.scout.rt.ui.html.script.ScriptOutput;
import org.eclipse.scout.rt.ui.html.script.ScriptSource.FileType;

/**
 * This class loads and parses CSS and JS files from WebContent/ folder.
 */
public class ScriptFileLoader extends AbstractResourceLoader {

  private static final String THEME_KEY = "ui.theme";

  private final String m_theme;
  private final boolean m_minify;

  public ScriptFileLoader(String theme, boolean minify) {
    super();
    m_theme = theme;
    m_minify = minify;
  }

  @Override
  public HttpCacheKey createCacheKey(String resourcePath) {
    if (FileType.JS == FileType.resolveFromFilename(resourcePath)) {
      // JavaScript files are always the same, no matter what the theme or the locale is
      return super.createCacheKey(resourcePath);
    }
    else {
      // CSS files are different for depending on the current theme (but don't depend on the locale)
      return new HttpCacheKey(resourcePath, Collections.singletonMap(THEME_KEY, m_theme));
    }
  }

  @Override
  public HttpCacheObject loadResource(HttpCacheKey cacheKey) throws IOException {
    ScriptFileBuilder builder = new ScriptFileBuilder(BEANS.get(IWebContentService.class), m_theme, m_minify);
    String resourcePath = cacheKey.getResourcePath();
    ScriptOutput out = builder.buildScript(resourcePath);
    if (out != null) {
      BinaryResource content = BinaryResources.create()
          .withFilename(out.getPathInfo())
          .withCharset(StandardCharsets.UTF_8)
          .withContent(out.getContent())
          .withLastModified(out.getLastModified())
          .withCachingAllowed(true)
          .withCacheMaxAge(HttpCacheControl.MAX_AGE_ONE_YEAR)
          .build();

      return new HttpCacheObject(cacheKey, content);
    }
    return null;
  }

}