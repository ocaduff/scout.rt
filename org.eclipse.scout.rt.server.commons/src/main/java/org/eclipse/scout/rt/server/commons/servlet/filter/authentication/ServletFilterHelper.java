/*
 * Copyright (c) BSI Business Systems Integration AG. All rights reserved.
 * http://www.bsiag.com/
 */
package org.eclipse.scout.rt.server.commons.servlet.filter.authentication;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.AccessController;
import java.security.Principal;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;

import javax.security.auth.Subject;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.eclipse.scout.commons.Base64Utility;
import org.eclipse.scout.commons.Encoding;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @since 5.0
 */
@ApplicationScoped
public class ServletFilterHelper {
  private static final Logger LOG = LoggerFactory.getLogger(ServletFilterHelper.class);

  public static final String SESSION_ATTRIBUTE_FOR_PRINCIPAL = Principal.class.getName();

  public static final String HTTP_HEADER_AUTHORIZATION = "Authorization";
  public static final String HTTP_HEADER_AUTHORIZED = "Authorized";
  public static final String HTTP_BASIC_AUTH_NAME = "Basic";
  public static final Charset HTTP_BASIC_AUTH_CHARSET = StandardCharsets.ISO_8859_1;

  // !!! IMPORTANT: This JSON message has to correspond to the response format as generated by JsonResponse.toJson()
  public static final String JSON_SESSION_TIMEOUT_RESPONSE = "{\"error\":{\"code\":10,\"message\":\"The session has expired, please reload the page.\"}}";

  /**
   * get a cached principal from the {@link HttpSession} as {@link #SESSION_ATTRIBUTE_FOR_PRINCIPAL}
   */
  public Principal getPrincipalOnSession(HttpServletRequest req) {
    final HttpSession session = req.getSession(false);
    if (session != null) {
      Principal principal = (Principal) session.getAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_PRINCIPAL);
      if (principal != null) {
        return principal;
      }
    }
    return null;
  }

  /**
   * put a principal to the {@link HttpSession} as {@link #SESSION_ATTRIBUTE_FOR_PRINCIPAL}
   */
  public void putPrincipalOnSession(HttpServletRequest req, Principal principal) {
    HttpSession session = req.getSession();
    session.setAttribute(ServletFilterHelper.SESSION_ATTRIBUTE_FOR_PRINCIPAL, principal);
  }

  public Subject createSubject(Principal principal) {
    // create subject if necessary
    Subject subject = Subject.getSubject(AccessController.getContext());
    if (subject == null || subject.isReadOnly()) {
      subject = new Subject();
    }
    subject.getPrincipals().add(principal);
    subject.setReadOnly();
    return subject;
  }

  public void continueChainAsSubject(final Principal principal, final HttpServletRequest req, final HttpServletResponse res, final FilterChain chain) throws IOException, ServletException {
    try {
      Subject.doAs(
          createSubject(principal),
          new PrivilegedExceptionAction<Object>() {
            @Override
            public Object run() throws Exception {
              HttpServletRequest secureReq = new SecureHttpServletRequestWrapper(req, principal);
              chain.doFilter(secureReq, res);
              return null;
            }
          });
    }
    catch (PrivilegedActionException e) {
      Throwable t = e.getCause();
      if (t instanceof IOException) {
        throw (IOException) t;
      }
      else if (t instanceof ServletException) {
        throw (ServletException) t;
      }
      else {
        throw new ServletException(t);
      }
    }
  }

  public String createBasicAuthRequest(String username, char[] password) {
    StringBuffer cred = new StringBuffer(username).append(":").append(password);
    String encodedCred;
    encodedCred = Base64Utility.encode(cred.toString().getBytes(HTTP_BASIC_AUTH_CHARSET));
    return new StringBuffer(HTTP_BASIC_AUTH_NAME).append(" ").append(encodedCred).toString();
  }

  public String[] parseBasicAuthRequest(HttpServletRequest req) {
    String h = req.getHeader(HTTP_HEADER_AUTHORIZATION);
    if (h == null || !h.matches(HTTP_BASIC_AUTH_NAME + " .*")) {
      return null;
    }
    return new String(Base64Utility.decode(h.substring(6)), HTTP_BASIC_AUTH_CHARSET).split(":", 2);
  }

  /**
   * forward the request to the login.html
   * <p>
   * Detects if the request is a POST. For json send a timeout message, otherwise log a warning
   */
  public void forwardToLoginForm(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    forwardTo(req, resp, "/login.html");
  }

  /**
   * forward the request to the logout.html
   * <p>
   * Detects if the request is a POST. For json send a timeout message, otherwise log a warning
   */
  public void forwardToLogoutForm(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    forwardTo(req, resp, "/logout.html");
  }

  public void forwardTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation) throws IOException, ServletException {
    forwardOrRedirectTo(req, resp, targetLocation, false);
  }

  public void redirectTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation) throws IOException, ServletException {
    forwardOrRedirectTo(req, resp, targetLocation, true);
  }

  /**
   * Forwards or redirects the request to the specified location, depending on the value of the argument 'redirect':
   * <ul>
   * <li><b>redirect=true</b>: A HTTP redirect response (302) is sent, using
   * {@link HttpServletResponse#sendRedirect(String)}.
   * <li><b>redirect=false</b>: The request is forwarded to a dispatcher using the new location, using
   * {@link RequestDispatcher#forward(javax.servlet.ServletRequest, javax.servlet.ServletResponse)). This has the same
   * effect as if the user had requested the target location from the beginning.
   * </ul>
   * This method detects if the request is a POST. If it is a JSON request, no redirection happens, but a JSON timeout
   * message is sent. For other types of POST requests, a warning is logged, but forwarding/redirection will happen
   * nevertheless.
   */
  protected void forwardOrRedirectTo(HttpServletRequest req, HttpServletResponse resp, String targetLocation, boolean redirect) throws IOException, ServletException {
    if ("POST".equals(req.getMethod())) {
      if ((req.getContentType() + "").startsWith("application/json")) {
        if (LOG.isDebugEnabled()) {
          LOG.debug("Returning session timeout error as json.");
        }
        sendJsonSessionTimeout(resp);
        return;
      }
      else {
        LOG.warn("The request for '{}' is a POST request. " + (redirect ? "Redirecting" : "Forwarding") + " to '{}' will most likely fail. (Trying nevertheless.)", req.getPathInfo(), targetLocation);
      }
    }

    if (LOG.isDebugEnabled()) {
      LOG.debug((redirect ? "Redirecting" : "Forwarding") + " '{}' to '{}'", req.getPathInfo(), targetLocation);
    }
    if (redirect) {
      resp.sendRedirect(targetLocation);
    }
    else {
      req.getRequestDispatcher(targetLocation).forward(req, resp);
    }
  }

  protected void sendJsonSessionTimeout(HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding(Encoding.UTF_8);
    resp.getWriter().print(JSON_SESSION_TIMEOUT_RESPONSE); // JsonResponse.ERR_SESSION_TIMEOUT
  }

  /**
   * If the request has a HTTP session attached, the session is invalidated.
   */
  public void doLogout(HttpServletRequest req) {
    HttpSession session = req.getSession(false);
    if (session != null) {
      session.invalidate();
    }
  }
}
