/* global FastClick */
/**
 * Provides information about the device and its supported features.<p>
 * The informations are detected lazily.
 */
scout.Device = function(userAgent) {
  this.userAgent = userAgent;
  this.system;
  this.features = {};
  this.type;
  this.browser = scout.Device.SupportedBrowsers.UNKNOWN;
  this.browserVersion = 0;

  // initialize with empty string so that it can be used without calling initUnselectableAttribute()
  this.unselectableAttribute = '';
  this.tableAdditionalDivRequired = false;

  this.parseUserAgent(userAgent);
  this.parseBrowserVersion(userAgent);
};

scout.Device.vendorPrefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'];

scout.Device.SupportedBrowsers = {
  UNKNOWN: 'Unknown',
  FIREFOX: 'Firefox',
  CHROME: 'Chrome',
  INTERNET_EXPLORER: 'InternetExplorer',
  SAFARI: 'Safari'
};

scout.Device.System = {
  IOS: 'IOS',
  ANDROID: 'ANDROID'
};

/**
 * Called during bootstrap by index.html before the session startup.<p>
 * Precalculates the value of some attributes to store them
 * in a static way (and prevent many repeating function calls within loops).<p>
 * Also loads device specific scripts (fast click for ios devices)
 */
scout.Device.prototype.bootstrap = function() {
  var $deferred;

  // Precalculate value and store in a simple property, to prevent many function calls inside loops (e.g. when generating table rows)
  this.unselectableAttribute = this.getUnselectableAttribute();
  this.tableAdditionalDivRequired = this.isTableAdditionalDivRequired();

  if (this.isIos()) {
    // We use fastscript to prevent the 300ms delay when touching an element.
    // With Chrome 32 the issue is solved, so no need to load the script for other devices than ios
    $deferred = $
      .getCachedScript("res/fastclickmod-1.0.1.min.js")
      .done(function(script, textStatus) {
        FastClick.attach(document.body);
      });
  }
  return $deferred;
};

scout.Device.prototype.isIos = function() {
  return this.system === scout.Device.System.IOS;
};

/**
 * This method returns false for very old browsers. Basically we check for the first version
 * that supports ECMAScript 5. This methods excludes all browsers that are known to be
 * unsupported, all others (e.g. unknown engines) are allowed by default.
 */
scout.Device.prototype.isSupportedBrowser = function(browser, version) {
  browser = scout.helpers.nvl(browser, this.browser);
  version = scout.helpers.nvl(version, this.browserVersion);
  var browsers = scout.Device.SupportedBrowsers;
  if ((browser === browsers.INTERNET_EXPLORER && version < 9) ||
      (browser === browsers.CHROME && version < 23) ||
      (browser === browsers.FIREFOX && version < 21) ||
      (browser === browsers.SAFARI && version < 7)) {
    return false;
  }
  return true;
};

scout.Device.prototype.parseUserAgent = function(userAgent) {
  if (!userAgent) {
    return;
  }
  this._parseSystem(userAgent);
  this._parseBrowser(userAgent);
};

scout.Device.prototype._parseSystem = function(userAgent) {
  var i, device, iosDevices = ['iPad', 'iPhone'];
  for (i = 0; i < iosDevices.length; i++) {
    device = iosDevices[i];
    if (this.contains(userAgent, device)) {
      this.type = device;
      this.system = scout.Device.System.IOS;
      return;
    }
  }
  if (this.contains(userAgent, "Android")) {
    this.system = scout.Device.System.ANDROID;
  }
};

scout.Device.prototype._parseBrowser = function(userAgent) {
  if (this.contains(userAgent, 'Firefox')) {
    this.browser = scout.Device.SupportedBrowsers.FIREFOX;
  } else if (this.contains(userAgent, 'MSIE') || this.contains(userAgent, 'Trident')) {
    this.browser = scout.Device.SupportedBrowsers.INTERNET_EXPLORER;
  } else if (this.contains(userAgent, 'Chrome')) {
    this.browser = scout.Device.SupportedBrowsers.CHROME;
  } else if (this.contains(userAgent, 'Safari')) {
    this.browser = scout.Device.SupportedBrowsers.SAFARI;
  }
};

//we cannot use scout.strings at the time parseUserAgent is executed
scout.Device.prototype.contains = function contains(haystack, needle) {
  return haystack.indexOf(needle) !== -1;
};

scout.Device.prototype.supportsFeature = function(property, checkFunc) {
  if (this.features[property] === undefined) {
    this.features[property] = checkFunc(property);
  }
  return this.features[property];
};

scout.Device.prototype.supportsTouch = function() {
  // Implement when needed, see https://hacks.mozilla.org/2013/04/detecting-touch-its-the-why-not-the-how/
};

scout.Device.prototype.supportsFile = function() {
  return (window.File ? true : false);
};

scout.Device.prototype.supportsCssAnimation = function() {
  return this.supportsCssProperty('animation');
};

scout.Device.prototype.supportsCssUserSelect = function() {
  return this.supportsCssProperty('userSelect');
};

scout.Device.prototype.supportsInternationalization = function() {
  return window.Intl && typeof window.Intl === 'object';
};

/**
 * Returns true if the device supports the download of resources in the same window as the single page app is running.
 * With "download" we mean: change <code>window.location.href</code> to the URL of the resource to download. Some browsers don't
 * support this behavior and require the resource to be opened in a new window with <code>window.open</code>.
 */
scout.Device.prototype.supportsDownloadInSameWindow = function() {
  return scout.Device.SupportedBrowsers.FIREFOX !== this.browser;
};

scout.Device.prototype.hasPrettyScrollbars = function() {
  return this.supportsFeature('_prettyScrollbars', check.bind(this));

  function check(property) {
    var SYSTEM = scout.Device.System;
    // TODO CGU add windows phone, what about desktop windows with touch support? Maybe add touch support to scrollbars?
    return SYSTEM.IOS === this.system ||
    SYSTEM.ANDROID === this.system;
  }
};

scout.Device.prototype.supportsCopyFromDisabledInputFields = function() {
  return scout.Device.SupportedBrowsers.FIREFOX !== this.browser;
};

scout.Device.prototype.supportsCssProperty = function(property) {
  return this.supportsFeature(property, check);

  function check(property) {
    var i;
    if (document.body.style[property] !== undefined) {
      return true;
    }

    property = property.charAt(0).toUpperCase() + property.slice(1);
    for (i = 0; i < scout.Device.vendorPrefixes.length; i++) {
      if (document.body.style[scout.Device.vendorPrefixes[i] + property] !== undefined) {
        return true;
      }
    }

    return false;
  }
};

/**
 * Returns '' for modern browsers, that support the 'user-select' CSS property.
 * Returns ' unselectable="on"' for IE9.
 * This string can be used to add to any HTML element as attribute.
 */
scout.Device.prototype.getUnselectableAttribute = function() {
  return this.supportsFeature('_unselectableAttribute', function(property) {
    if (this.supportsCssUserSelect()) {
      return '';
    }
    // workaround for IE 9
    return ' unselectable="on"';
  }.bind(this));
};

/**
 * Returns false for modern browsers, that support CSS table-cell properties restricted
 * with a max-width and hidden overflow. Returns true if an additional div level is required.
 */
scout.Device.prototype.isTableAdditionalDivRequired = function() {
  return this.supportsFeature('_tableAdditionalDivRequired',  function(property) {
    var test = $('body').appendDiv();
    test.text('Scout');
    test.css('visibility', 'hidden');
    test.css('display', 'table-cell');
    test.css('max-width', '1px');
    test.css('overflow', 'hidden');
    var result = test.width() > 1;
    test.remove();
    return result;
  }.bind(this));
};

scout.Device.prototype.supportsIframeSecurityAttribute = function() {
  return this.supportsFeature('_iframeSecurityAttribute', function(property) {
    var test = document.createElement('iframe');
    return ('security' in test);
  }.bind(this));
};

/**
 * Currently the browserVersion is only set for IE. Because the only version-check we do,
 * is whether or not we use an old IE version. Version regex only matches the first number pair
 * but not the revision-version. Example:
 * - 21     match: 21
 * - 21.1   match: 21.1
 * - 21.1.3 match: 21.1
 *
 */
scout.Device.prototype.parseBrowserVersion = function(userAgent) {
  var versionRegex, browsers = scout.Device.SupportedBrowsers;
  if (this.browser === browsers.INTERNET_EXPLORER) {
    // with internet explorer 11 user agent string does not contain the 'MSIE' string anymore
    // additionally in new version the version-number after Trident/ is not the browser-version
    // but the engine-version.
    if (this.contains(userAgent, 'MSIE')) {
      versionRegex = /MSIE ([0-9]+\.?[0-9]*)/;
    } else {
      versionRegex = /rv:([0-9]+\.?[0-9]*)/;
    }
  } else if (this.browser === browsers.SAFARI) {
    versionRegex = /Version\/([0-9]+\.?[0-9]*)/;
  } else if (this.browser === browsers.FIREFOX) {
    versionRegex = /Firefox\/([0-9]+\.?[0-9]*)/;
  } else if (this.browser === browsers.CHROME) {
    versionRegex = /Chrome\/([0-9]+\.?[0-9]*)/;
  }
  if (versionRegex) {
    var matches = versionRegex.exec(userAgent);
    if (Array.isArray(matches) && matches.length === 2) {
      this.browserVersion = parseFloat(matches[1]);
    }
  }
};

// ------------ Singleton ----------------

scout.device = new scout.Device(navigator.userAgent);
