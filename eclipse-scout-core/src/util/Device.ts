/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {App, EnumObject, InitModelOf, ObjectModel, objects, ObjectWithType, Predicate, scout} from '../index';
import $ from 'jquery';

let instance: Device;

export interface DeviceModel extends ObjectModel<Device> {
  userAgent: string;
}

export type DeviceSystem = EnumObject<typeof Device.System>;
export type DeviceType = EnumObject<typeof Device.Type>;
export type DeviceBrowser = EnumObject<typeof Device.Browser>;

/**
 * Provides information about the device and its supported features.<p>
 * The information is detected lazily.
 *
 * @singleton
 */
export class Device implements DeviceModel, ObjectWithType {
  declare model: DeviceModel;
  objectType: string;
  userAgent: string;
  features: Record<string, boolean>;
  system: DeviceSystem;
  type: DeviceType;
  browser: DeviceBrowser;
  browserVersion: number;
  systemVersion: number;
  scrollbarWidth: number;

  constructor(model?: InitModelOf<Device>) {
    // user agent string from browser
    this.userAgent = model.userAgent;
    this.features = {};
    this.system = Device.System.UNKNOWN;
    this.type = Device.Type.DESKTOP;
    this.browser = Device.Browser.UNKNOWN;
    this.browserVersion = 0;
    this.scrollbarWidth = 0;

    if (this.userAgent) {
      this._parseSystem();
      this._parseSystemVersion();
      this._parseBrowser();
      this._parseBrowserVersion();
    }
  }

  static VENDOR_PREFIXES = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'] as const;

  static Browser = {
    UNKNOWN: 'Unknown',
    FIREFOX: 'Firefox',
    /**
     * Chromium based: Google Chrome, Microsoft Edge, Brave, Opera
     */
    CHROME: 'Chrome',
    INTERNET_EXPLORER: 'InternetExplorer',
    /**
     * Only Legacy Edge. Chromium based Edge is reported as CHROME
     */
    EDGE: 'Edge',
    SAFARI: 'Safari'
  } as const;

  static System = {
    UNKNOWN: 'Unknown',
    IOS: 'IOS',
    ANDROID: 'ANDROID',
    WINDOWS: 'WINDOWS'
  } as const;

  static Type = {
    DESKTOP: 'DESKTOP',
    TABLET: 'TABLET',
    MOBILE: 'MOBILE'
  } as const;

  /**
   * Called during bootstrap by index.html before the session startup.
   *
   * Precalculates the value of some attributes to store them in a static way (and prevent many repeating function calls within loops).
   */
  bootstrap(): JQuery.Promise<any> {
    // Pre-calculate value and store in a simple property, to prevent many function calls inside loops
    this.scrollbarWidth = this._detectScrollbarWidth();
    this.type = this._detectType(this.userAgent);

    if (this.isIos()) {
      this._installActiveHandler();
    }

    if (this._needsIPhoneRotationHack()) {
      this._fixIPhoneRotationBug();
    }

    return $.resolvedPromise();
  }

  /**
   * IOs does only trigger :active when touching an element if a touchstart listener is attached
   * Unfortunately, the :active is also triggered when scrolling, there is no delay.
   * To fix this we would have to work with a custom active class which will be toggled on touchstart/end
   */
  protected _installActiveHandler() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    document.addEventListener('touchstart', () => {
    }, false);
  }

  protected _needsIPhoneRotationHack(): boolean {
    $.log.isDebugEnabled() && $.log.debug('Activating iPhone rotation workaround.');
    // iPad does not automatically switch to minimal-ui mode on rotation.
    // Also, the hack is not necessary if the body is scrollable (which can be achieved with a custom desktop).
    return this.isIphone() && !this.isStandalone() && $(document.body).css('overflow') === 'hidden';
  }

  /**
   * The iphone wants to activate the minimal-ui mode when it is rotated to landscape. This would actually be a good thing, but unfortunately it is buggy.
   * When the device is rotated there will be a white bar visible at the bottom of the screen.
   * When it is rotated back it may look ok at first but touching an element does not work anymore because the touch-point is about 30px at the wrong location.
   * <p>
   * This happens because the height used for layouting the desktop is smaller than it should be. This layouting is triggered by the window resize event, so obviously
   * the resize event comes too early and no resize event will be triggered when the minimal-ui mode is activated.
   * <p>
   * Unfortunately it is also not possible to schedule the relay outing after a rotation because the height does not seem to be reliable.
   * Even if the window or body size will explicitly be set to the viewport size, there will be a white bar at the bottom, even though the scout desktop is layouted with the correct size.
   * <p>
   * Luckily, it is possible to show the address bar programmatically, but we need to wait for the rotation animation to complete.
   * Since there is no event for that we need to try it several times, sometimes it will work after 150ms, sometimes we have to wait 250ms.
   * This is quite a hack and will likely break with a future ios release...
   */
  protected _fixIPhoneRotationBug() {
    $.log.isDebugEnabled() && $.log.debug('Enabling iPhone rotation workaround.');
    let orientation = this.orientation();
    let count = 0;
    let docElem = document.documentElement;
    window.addEventListener('resize', event => {
      let newOrientation = Device.get().orientation();
      if (orientation !== newOrientation) {
        orientation = newOrientation;
        count = 0;
        tryShowAddressBar();
      }
    });

    function tryShowAddressBar() {
      setTimeout(() => {
        docElem.scrollTop = 0;
        if (++count < 8) {
          tryShowAddressBar();
        }
      }, 50);
    }
  }

  orientation(): 'portrait' | 'landscape' {
    if (window.innerHeight > window.innerWidth) {
      return 'portrait';
    }
    return 'landscape';
  }

  hasOnScreenKeyboard(): boolean {
    return this.supportsFeature('_onScreenKeyboard', () => {
      return this.isIos() || this.isAndroid() || this.isWindowsTabletMode();
    });
  }

  /**
   * Returns if the current browser includes the padding-right-space in the scrollWidth calculations.<br>
   * Such a browser increases the scrollWidth only if the text-content exceeds the space <i>including</i> the right-padding.
   * This means the scrollWidth is equal to the clientWidth until the right-padding-space is consumed as well.
   */
  isScrollWidthIncludingPadding(): boolean {
    return this.isInternetExplorer() || this.isFirefox() || this.isEdge();
  }

  /**
   * Safari shows a tooltip if ellipsis are displayed due to text truncation. This is fine but, unfortunately, it cannot be prevented.
   * Because showing two tooltips at the same time (native and custom) is bad, the custom tooltip cannot be displayed.
   */
  isCustomEllipsisTooltipPossible(): boolean {
    return this.browser !== Device.Browser.SAFARI;
  }

  /**
   * @returns true if the current device is an iPhone. This is more specific than the <code>isIos</code> function
   * which also includes iPads and iPods.
   */
  isIos(): boolean {
    return Device.System.IOS === this.system;
  }

  isEdge(): boolean {
    return Device.Browser.EDGE === this.browser;
  }

  /**
   * @returns 'ms-edge' if the current browser is Microsoft Edge
   */
  cssClassForEdge(): 'ms-edge' | '' {
    return this.isEdge() ? 'ms-edge' : '';
  }

  /**
   * @returns 'iphone' if the current device is an iPhone
   */
  cssClassForIphone(): 'iphone' | '' {
    return this.isIphone() ? 'iphone' : '';
  }

  isIphone(): boolean {
    return this.userAgent.indexOf('iPhone') > -1;
  }

  isInternetExplorer(): boolean {
    return Device.Browser.INTERNET_EXPLORER === this.browser;
  }

  isFirefox(): boolean {
    return Device.Browser.FIREFOX === this.browser;
  }

  isChrome(): boolean {
    return Device.Browser.CHROME === this.browser;
  }

  /**
   * Compared to isIos() this function uses {@link navigator.platform} instead of navigator.userAgent to check whether the app runs on iOS.
   * Most of the time isIos() is the way to go.
   * This function was mainly introduced to detect whether it is a real iOS or an emulated one (e.g. using chrome emulator).
   * @returns true if the platform is iOS, false if not (e.g. if chrome emulator is running)
   */
  isIosPlatform(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.platform);
  }

  isAndroid(): boolean {
    return Device.System.ANDROID === this.system;
  }

  /**
   * Checks if the device is running Windows 10 or later in "tablet mode". We assume that this is the case when the
   * _primary_ input mechanism consists of a pointing device of limited accuracy, such as a finger on a touchscreen.
   *
   * In Windows 11, the "tablet mode" cannot be explicitly set by the user. Instead, it is automatically turned on
   * when the keyboard is detached. When the device is docked, the touchscreen can still be used, but it is no longer
   * the primary input mechanism.
   */
  isWindowsTabletMode(): boolean {
    return Device.System.WINDOWS === this.system && this.systemVersion >= 10 && window.matchMedia('(pointer: coarse)').matches;
  }

  /**
   * @returns true if {@link navigator.standalone} is true which is the case for iOS home screen mode
   */
  isStandalone(): boolean {
    return !!window.navigator['standalone'];
  }

  /**
   * This method returns false for all browsers that are known to be unsupported, all others (e.g. unknown engines) are allowed by default.
   * The supported browser versions are mainly determined by the features needed by Scout (e.g. class syntax, Array.flatMap, IntersectionObserver, Custom CSS Properties, CSS flex-box, queueMicrotask).
   */
  isSupportedBrowser(browser?: DeviceBrowser, version?: number): boolean {
    browser = scout.nvl(browser, this.browser);
    version = scout.nvl(version, this.browserVersion);
    let browsers = Device.Browser;
    return (browser === browsers.CHROME && version >= 71)
      || (browser === browsers.FIREFOX && version >= 69)
      || (browser === browsers.SAFARI && version >= 13);
  }

  /**
   * Can not detect type until DOM is ready because we must create a DIV to measure the scrollbars.
   */
  protected _detectType(userAgent: string): DeviceType {
    if (Device.System.ANDROID === this.system) {
      if (userAgent.indexOf('Mobile') > -1) {
        return Device.Type.MOBILE;
      }
      return Device.Type.TABLET;
    } else if (Device.System.IOS === this.system) {
      if (userAgent.indexOf('iPad') > -1) {
        return Device.Type.TABLET;
      }
      return Device.Type.MOBILE;
    } else if (this.isWindowsTabletMode()) {
      return Device.Type.TABLET;
    }
    return Device.Type.DESKTOP;
  }

  protected _parseSystem() {
    let userAgent = this.userAgent;
    if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
      this.system = Device.System.IOS;
    } else if (userAgent.indexOf('Android') > -1) {
      this.system = Device.System.ANDROID;
    } else if (userAgent.indexOf('Windows') > -1) {
      this.system = Device.System.WINDOWS;
    }
  }

  /**
   * Currently only supports IOS
   */
  protected _parseSystemVersion() {
    let versionRegex,
      System = Device.System,
      userAgent = this.userAgent;

    if (this.system === System.IOS) {
      versionRegex = / OS ([0-9]+\.?[0-9]*)/;
      // replace all _ with .
      userAgent = userAgent.replace(/_/g, '.');
    } else if (this.system === System.WINDOWS) {
      versionRegex = /Windows NT ([0-9]+\.?[0-9]*)/;
    }

    if (versionRegex) {
      this.systemVersion = this._parseVersion(userAgent, versionRegex);
    }
  }

  protected _parseBrowser() {
    let userAgent = this.userAgent;

    if (userAgent.indexOf('Firefox') > -1) {
      this.browser = Device.Browser.FIREFOX;
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
      this.browser = Device.Browser.INTERNET_EXPLORER;
    } else if (userAgent.indexOf('Edge') > -1) {
      // must check for Edge before we do other checks, because the Edge user-agent string
      // also contains matches for Chrome and Webkit.
      this.browser = Device.Browser.EDGE;
    } else if (userAgent.indexOf('Chrome') > -1) {
      this.browser = Device.Browser.CHROME;
    } else if (userAgent.indexOf('Safari') > -1) {
      this.browser = Device.Browser.SAFARI;
    }
  }

  /**
   * Version regex only matches the first number pair
   * but not the revision-version. Example:
   * - 21     match: 21
   * - 21.1   match: 21.1
   * - 21.1.3 match: 21.1
   */
  protected _parseBrowserVersion() {
    let versionRegex,
      browsers = Device.Browser,
      userAgent = this.userAgent;

    if (this.browser === browsers.INTERNET_EXPLORER) {
      // with Internet Explorer 11 user agent string does not contain the 'MSIE' string anymore
      // additionally in new version the version-number after Trident/ is not the browser-version
      // but the engine-version.
      if (userAgent.indexOf('MSIE') > -1) {
        versionRegex = /MSIE ([0-9]+\.?[0-9]*)/;
      } else {
        versionRegex = /rv:([0-9]+\.?[0-9]*)/;
      }
    } else if (this.browser === browsers.EDGE) {
      versionRegex = /Edge\/([0-9]+\.?[0-9]*)/;
    } else if (this.browser === browsers.SAFARI) {
      if (this.isIos() && userAgent.indexOf('Version/') < 0) {
        this.browserVersion = this.systemVersion;
        return;
      }
      versionRegex = /Version\/([0-9]+\.?[0-9]*)/;
    } else if (this.browser === browsers.FIREFOX) {
      versionRegex = /Firefox\/([0-9]+\.?[0-9]*)/;
    } else if (this.browser === browsers.CHROME) {
      versionRegex = /Chrome\/([0-9]+\.?[0-9]*)/;
    }
    if (versionRegex) {
      this.browserVersion = this._parseVersion(userAgent, versionRegex);
    }
  }

  protected _parseVersion(userAgent: string, versionRegex: RegExp): number {
    let matches = versionRegex.exec(userAgent);
    if (Array.isArray(matches) && matches.length === 2) {
      return parseFloat(matches[1]);
    }
  }

  supportsFeature(property: string, checkFunc: Predicate<string>): boolean {
    if (this.features[property] === undefined) {
      this.features[property] = checkFunc(property);
    }
    return this.features[property];
  }

  /**
   * Currently this method should be used when you want to check if the device is "touch only" -
   * which means the user has no keyboard or mouse. Some hybrids like Surface tablets in desktop mode are
   * still touch devices, but support keyboard and mouse at the same time. In such cases this method will
   * return false, since the device is not touch only.
   *
   * Currently, this method returns the same as hasOnScreenKeyboard(). Maybe the implementation here will be
   * different in the future.
   */
  supportsOnlyTouch(): boolean {
    return this.supportsFeature('_onlyTouch', this.hasOnScreenKeyboard.bind(this));
  }

  /**
   * @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
   * @see https://codeburst.io/the-only-way-to-detect-touch-with-javascript-7791a3346685
   */
  supportsTouch(): boolean {
    return this.supportsFeature('_touch', property => {
      return (('ontouchstart' in window) || window.TouchEvent || window['DocumentTouch'] && document instanceof window['DocumentTouch']) as boolean;
    });
  }

  supportsFile(): boolean {
    return !!window.File;
  }

  /**
   * Some browsers support the file API but don't support the File constructor (new File()).
   */
  supportsFileConstructor(): boolean {
    return typeof File === 'function';
  }

  supportsCssAnimation(): boolean {
    return this.supportsCssProperty('animation');
  }

  /**
   * Used to determine if browser supports full history API.
   * Note that IE9 only partially supports the API, pushState and replaceState functions are missing.
   * @see: https://developer.mozilla.org/de/docs/Web/API/Window/history
   */
  supportsHistoryApi(): boolean {
    return !!(window.history && window.history.pushState);
  }

  supportsCssGradient(): boolean {
    let testValue = 'linear-gradient(to left, #000 0%, #000 50%, transparent 50%, transparent 100% )';
    return this.supportsFeature('gradient', this.checkCssValue.bind(this, 'backgroundImage', testValue, actualValue => {
      return (actualValue + '').indexOf('gradient') > 0;
    }));
  }

  supportsInternationalization(): boolean {
    return window.Intl && typeof window.Intl === 'object';
  }

  /**
   * Returns true if the device supports the download of resources in the same window as the single page app is running.
   * With "download" we mean: change <code>window.location.href</code> to the URL of the resource to download. Some browsers don't
   * support this behavior and require the resource to be opened in a new window with <code>window.open</code>.
   */
  supportsDownloadInSameWindow(): boolean {
    return Device.Browser.FIREFOX !== this.browser;
  }

  supportsWebcam(): boolean {
    return this.supportsFeature('_webcam', property => {
      let getUserMedia = objects.optProperty(navigator, 'mediaDevices', 'getUserMedia');
      return objects.isFunction(getUserMedia);
    });
  }

  supportsMicrotask(): boolean {
    return typeof queueMicrotask === 'function';
  }

  supportsIntersectionObserver(): boolean {
    return typeof IntersectionObserver === 'function';
  }

  hasPrettyScrollbars(): boolean {
    return this.supportsFeature('_prettyScrollbars', property => {
      return this.scrollbarWidth === 0;
    });
  }

  canHideScrollbars(): boolean {
    return this.supportsFeature('_canHideScrollbars', property => {
      // Check if scrollbar is vanished if class hybrid-scrollable is applied which hides the scrollbar, see also scrollbars.js and Scrollbar.less
      return this._detectScrollbarWidth('hybrid-scrollable') === 0;
    });
  }

  supportsCopyFromDisabledInputFields(): boolean {
    return Device.Browser.FIREFOX !== this.browser;
  }

  /**
   * If the mouse down on an element with a pseudo-element removes the pseudo-element (e.g. check box toggling),
   * the firefox cannot focus the element anymore and instead focuses the body. In that case manual focus handling is necessary.
   */
  loosesFocusIfPseudoElementIsRemoved(): boolean {
    return Device.Browser.FIREFOX === this.browser;
  }

  supportsCssProperty(property: string): boolean {
    return this.supportsFeature(property, property => {
      if (document.body.style[property] !== undefined) {
        return true;
      }

      property = property.charAt(0).toUpperCase() + property.slice(1);
      for (let i = 0; i < Device.VENDOR_PREFIXES.length; i++) {
        if (document.body.style[Device.VENDOR_PREFIXES[i] + property] !== undefined) {
          return true;
        }
      }
      return false;
    });
  }

  supportsGeolocation(): boolean {
    return !!navigator.geolocation;
  }

  /**
   * When we call .preventDefault() on a mousedown event Firefox doesn't apply the :active state.
   * Since W3C does not specify an expected behavior, we need this workaround for consistent behavior in
   * our UI. The issue has been reported to Mozilla, but it doesn't look like there will be a bugfix soon:
   *
   * https://bugzilla.mozilla.org/show_bug.cgi?id=771241#c7
   */
  requiresSyntheticActiveState(): boolean {
    return this.isFirefox();
  }

  supportsPassiveEventListener(): boolean {
    return this.supportsFeature('_passiveEventListener', property => {
      // Code from MDN https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
      let passiveSupported = false;
      try {
        let options = Object.defineProperty({}, 'passive', {
          get: () => {
            passiveSupported = true;
            return false;
          }
        });
        // @ts-expect-error
        window.addEventListener('test', options, options);
        // @ts-expect-error
        window.removeEventListener('test', options, options);
      } catch (err) {
        passiveSupported = false;
      }
      return passiveSupported;
    });
  }

  checkCssValue(property: string, value: string, checkFunc: Predicate<string>): boolean {
    // Check if property is supported at all, otherwise div.style[property] would just add it and checkFunc would always return true
    if (document.body.style[property] === undefined) {
      return false;
    }
    let div = document.createElement('div');
    div.style[property] = value;
    if (checkFunc(div.style[property])) {
      return true;
    }

    property = property.charAt(0).toUpperCase() + property.slice(1);
    for (let i = 0; i < Device.VENDOR_PREFIXES.length; i++) {
      let vendorProperty = Device.VENDOR_PREFIXES[i] + property;
      if (document.body.style[vendorProperty] !== undefined) {
        div.style[vendorProperty] = value;
        if (checkFunc(div.style[vendorProperty])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   *  https://bugs.chromium.org/p/chromium/issues/detail?id=740502
   */
  hasTableCellZoomBug(): boolean {
    return this.browser === Device.Browser.CHROME;
  }

  protected _detectScrollbarWidth(cssClass?: string): number {
    let $measure = $('body')
        .appendDiv(cssClass)
        .attr('id', 'MeasureScrollbar')
        .css('width', 50)
        .css('height', 50)
        .css('overflow-y', 'scroll'),
      measureElement = $measure[0];
    let scrollbarWidth = measureElement.offsetWidth - measureElement.clientWidth;
    $measure.remove();
    return scrollbarWidth;
  }

  toString(): string {
    return 'scout.Device[' +
      'system=' + this.system +
      ' browser=' + this.browser +
      ' browserVersion=' + this.browserVersion +
      ' type=' + this.type +
      ' scrollbarWidth=' + this.scrollbarWidth +
      ' features=' + JSON.stringify(this.features) + ']';
  }

  static get(): Device {
    return instance;
  }
}

App.addListener('prepare', () => {
  if (instance) {
    // if the device was created before the app itself, use it instead of creating a new one
    return;
  }
  instance = scout.create(Device, {
    userAgent: navigator.userAgent
  });
});
