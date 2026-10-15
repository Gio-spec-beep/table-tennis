window.famobi_analytics = new Proxy({}, {
           get: function() { return function() { return Promise.resolve(); }; }
       });
       var famobiBase = {
           getVolume: function() { return 1; },
           getOrientation: function() { return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'; },
           getBrandingButtonImage: function() { return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; },
           moreGamesLink: function() { return ""; },
           onOrientationChange: function(cb) { window.addEventListener("resize", cb); },
           localStorage: window.localStorage || {},
           log: function() {},
           config: { features: {}, aid: "offline" },
           hasFeature: function(f) { return true; },
           __ : function(str) { return str; },
           menuConfig: {}
       };
       window.famobi = new Proxy(famobiBase, {
           get: function(target, prop) {
               if (prop in target) return target[prop];
               return function(callback) {
                   if (typeof callback === 'function') setTimeout(callback, 100);
                   return Promise.resolve();
               };
           }
       });
       window.fenster = window;
       window.fenster.subscribeToOffsetUpdates = function() {};
