var originalLoadImage = Phaser.Loader.prototype.image;
        var originalLoadAudio = Phaser.Loader.prototype.audio;
        var originalLoadSpritesheet = Phaser.Loader.prototype.spritesheet;
        var originalLoadBitmapFont = Phaser.Loader.prototype.bitmapFont;
        var originalLoadAtlasJSONHash = Phaser.Loader.prototype.atlasJSONHash;
        var originalLoadAtlasJSONArray = Phaser.Loader.prototype.atlasJSONArray;
        var originalLoadAtlas = Phaser.Loader.prototype.atlas;
        var originalLoadJSON = Phaser.Loader.prototype.json;
        var originalLoadXML = Phaser.Loader.prototype.xml;
        var originalLoadText = Phaser.Loader.prototype.text;

        var CDN = "https://cdn.jsdelivr.net/gh/thirstygithub/shiny-disco@main/";

        function rewrite(url) {
            if (typeof url === 'string' && url.startsWith('assets/')) {
                return CDN + url.replace('assets/', '');
            }
            return url;
        }

        Phaser.Loader.prototype.image = function(key, url) {
            return originalLoadImage.call(this, key, rewrite(url));
        };
        Phaser.Loader.prototype.audio = function(key, urls) {
            if (Array.isArray(urls)) urls = urls.map(rewrite);
            else urls = rewrite(urls);
            return originalLoadAudio.call(this, key, urls);
        };
        Phaser.Loader.prototype.spritesheet = function(key, url, w, h, f, m, s) {
            return originalLoadSpritesheet.call(this, key, rewrite(url), w, h, f, m, s);
        };
        Phaser.Loader.prototype.bitmapFont = function(key, textureURL, atlasURL, atlasData, xSpacing, ySpacing) {
            return originalLoadBitmapFont.call(this, key, rewrite(textureURL), rewrite(atlasURL), atlasData, xSpacing, ySpacing);
        };
        Phaser.Loader.prototype.atlasJSONHash = function(key, textureURL, atlasURL, atlasData) {
            return originalLoadAtlasJSONHash.call(this, key, rewrite(textureURL), rewrite(atlasURL), atlasData);
        };
        if (originalLoadAtlasJSONArray) {
            Phaser.Loader.prototype.atlasJSONArray = function(key, textureURL, atlasURL, atlasData) {
                return originalLoadAtlasJSONArray.call(this, key, rewrite(textureURL), rewrite(atlasURL), atlasData);
            };
        }
        if (originalLoadAtlas) {
            Phaser.Loader.prototype.atlas = function(key, textureURL, atlasURL, atlasData, format) {
                return originalLoadAtlas.call(this, key, rewrite(textureURL), rewrite(atlasURL), atlasData, format);
            };
        }
        if (originalLoadJSON) {
            Phaser.Loader.prototype.json = function(key, url, overwrite) {
                return originalLoadJSON.call(this, key, rewrite(url), overwrite);
            };
        }
        if (originalLoadXML) {
            Phaser.Loader.prototype.xml = function(key, url, overwrite) {
                return originalLoadXML.call(this, key, rewrite(url), overwrite);
            };
        }
        if (originalLoadText) {
            Phaser.Loader.prototype.text = function(key, url, overwrite) {
                return originalLoadText.call(this, key, rewrite(url), overwrite);
            };
        }
