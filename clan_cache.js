var Eventer = require('wotcs-api-system').Eventer;
var PlayerCache = require('./player_cache');
var _ = require("underscore");

module.exports = Eventer.extend({

    init: function(ID, manager, controller) {
        this.ID = ID;
        this.controller = controller;
        this.manager = manager;
        this.done = false;
        this.loaded = false;
        this.lastAccessed = new Date();
        this.maxAge = 30*1000; //10 seconds

        this.IDs = [];
        this.caches = {};
        var self = this;
        this.controller.Players.inClan(ID, function(err, players) {
            _(players).each(function(player) {
                self.IDs.push(player.id);
                var playerCache = self.controller.getCache('player.'+player.id);
                if(!playerCache){
                    playerCache = new PlayerCache(player.id, self.manager);
                    self.controller.setCache('player.'+player.id, playerCache);
                }
                self.caches[player.id] = playerCache;
            });
            self.setCacheCallbacks();
        });

        this.interval = setInterval(function(){
            _(self.caches).each(function(cache) {
                cache.lastAccessed = new Date();
            });
        },1000);
    },

    onClose: function() {
        if(this.done){ clearInterval(this.interval); }
        return this.done;
    },

    setCacheCallbacks: function() {
        var self = this;
        _(this.caches).each(function(cache) {
            if(!cache.done){
                cache.once('done', function() {
                    if(self.getProgress() >= 100){ self.emit('done'); self.done = true; }
                });
            }
        });
        var counter = 0;
        _(this.caches).each(function(cache) {
            if(!cache.loaded){
                counter++;
                cache.once('loaded', function() {
                    if(--counter <= 0){ self.emit('loaded'); self.loaded = true; }
                });
            }
        });
    },

    getProgress: function() {
        var count = 0;
        var progress = 0;
        _(this.caches).each(function(cache) {
            count += 1;
            progress += cache.progress;
        });
        return progress/count;
    },

    getData: function(options) {
        this.lastAccessed = new Date();
        options = options || {};
        return {
            progress: this.getProgress(),
            players: _.object(_(this.caches).keys(), _(this.caches).map(function(cache) {
                return cache.getData(options.players);
            }))
        };
    }

});