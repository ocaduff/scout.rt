/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package com.bsiag.scout.rt.client.ui.form.fields.chartfield;

import java.math.BigDecimal;

/**
 *
 */
public interface IChartUIFacade {
  /**
   * position for all axes in IChartBean.getAxes() ordered in same order like axes.
   *
   * @param axisPosition
   */
  public void fireUIValueClicked(int[] axesPosition, BigDecimal value);
}
