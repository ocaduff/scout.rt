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
package org.eclipse.scout.rt.testing.server.runner;

import java.util.List;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.core.runtime.Status;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.platform.cdi.IBean;
import org.eclipse.scout.rt.server.IServerJobFactory;
import org.eclipse.scout.rt.server.ITransactionRunnable;
import org.eclipse.scout.rt.server.ServerJob;
import org.eclipse.scout.rt.testing.commons.ScoutAssert;
import org.eclipse.scout.rt.testing.shared.TestingUtility;
import org.eclipse.scout.rt.testing.shared.services.common.exceptionhandler.WrappingProcessingRuntimeExceptionHandlerService;
import org.junit.runners.model.Statement;

/**
 * JUnit statements that runs the JUnit test within a Scout {@link ServerJob}.
 */
public class ScoutServerJobWrapperStatement extends Statement {
  private static final int EXCEPTIONHANDLER_SERVICE_RANKING = 1000;
  private final Statement m_statement;
  private final IServerJobFactory m_factory;

  public ScoutServerJobWrapperStatement(IServerJobFactory factory, Statement statement) {
    m_statement = statement;
    m_factory = factory;
  }

  @Override
  public void evaluate() throws Throwable {
    if (ServerJob.getCurrentSession() != null) {
      doEvaluateWrappingExceptions();
    }
    else {
      ServerJob job = m_factory.create("JUnit Server Job Runner", new ITransactionRunnable() {
        @Override
        public IStatus run(IProgressMonitor monitor) throws ProcessingException {
          doEvaluateWrappingExceptions();
          return Status.OK_STATUS;
        }
      });
      job.setSystem(true);
      job.runNow(new NullProgressMonitor());
      ScoutAssert.jobSuccessfullyCompleted(job);
    }
  }

  protected void doEvaluateWrappingExceptions() throws ProcessingException {
    List<? extends IBean<?>> serviceReg = null;
    try {
      WrappingProcessingRuntimeExceptionHandlerService handler = new WrappingProcessingRuntimeExceptionHandlerService();
      serviceReg = TestingUtility.registerServices(EXCEPTIONHANDLER_SERVICE_RANKING, handler);
      doEvaluate();
    }
    finally {
      if (serviceReg != null) {
        TestingUtility.unregisterServices(serviceReg);
      }
    }
  }

  protected void doEvaluate() throws ProcessingException {
    try {
      m_statement.evaluate();
    }
    catch (Throwable e) {
      throw new ProcessingException(e.getMessage(), e);
    }
  }
}
