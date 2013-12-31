var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");
var Request = require("./shared/request");

module.exports = Eventer.extend({

    init: function(task, worker) {
        this.worker = worker;
        this.task = task;
        this.ID = task.ID;
        this.updating = {};
        this.started = false;

        var self = this;
        this.done = _.after(3,function() {
            self.emit('loaded.all', {updating: self.updating});
            if(_(self.updating).size() > 0){
                self.updated = _.after(_(self.updating).size(), function() {
                    self.calculateRatings();
                });
            }
        });
    },

    startLoading: function() {
        this.started = true;
        this.getPlayerInfo();
        this.getPlayerStats();
        this.getPlayerTanks();
    },

    setPlayerInfo: function(player) {
        if(!player){
            player = this.worker.Players.new({id: this.ID});
        }
        this.player = player;
        this.emit('loaded.info', player.getData());
        this.done();
    },

    getPlayerInfo: function() {
        var self = this;
        this.worker.Players.find(this.ID, function(err, player){
            self.setPlayerInfo(player);
        });
    },

    setPlayerStats: function(stats) {
        var self = this;
        if(!stats){
            stats = this.worker.PlayerStats.new({player_id: this.ID});
        }
        this.stats = stats;
        if(stats.needsUpdate()){
            this.updating.stats = true;
            this.updating.info = true;
            this.emit('update.info', function(event, data) {
                self.updateStats(data);
            });
        }
        this.emit('loaded.stats', stats.getData());
        this.done();
    },

    getPlayerStats: function() {
        var self = this;
        this.worker.PlayerStats.findByPlayerID(this.ID, function(err, stats){
             self.setPlayerStats(stats);
        });
    },

    setPlayerTanks: function(tanks) {
        var self = this;
        if(!tanks){
            tanks = this.worker.PlayerTankCollections.new({p: this.ID});
        }
        this.tanks = tanks;
        if(tanks.needsUpdate()){
            this.updating.tanks = true;
            this.emit('update.tanks', function(event, data) {
                self.updateTanks(data);
            });
        }
        this.emit('loaded.tanks', tanks.getData());
        this.done();
    },

    getPlayerTanks: function() {
        var self = this;
        this.worker.PlayerTankCollections.findByPlayerID(this.ID, function(err, tanks){
            self.setPlayerTanks(tanks);
        });
    },

    updateTanks: function(data) {
        var self = this;
        this.tanks.update(data, function() {
            self.emit('updated.tanks', self.tanks.getData());
            self.updated();
        });
    },

    updateStats: function(data) {
        var self = this;
        this.player.update(data, function() {
            self.emit('updated.info', self.player.getData());
            self.updated();
        });
        this.stats.update(data.statistics, function() {
            self.emit('updated.stats', self.stats.getData());
            self.updated();
        });
    },

    calculateRatings: function() {
        var self = this;
        this.stats.average_tier = this.tanks.getAverageTier();
        this.stats.expected_values = this.tanks.getExpectedValues();
        this.stats.calcWN7();
        this.stats.calcEFR();
        this.stats.calcWN8();
        this.stats.sc3 = this.stats.wn7/1500*this.tanks.base_score;
        this.stats.saveAll(function() {
            self.emit('updated.ratings', self.stats.getData());
            self.emit('updated.all');
        });
    }

});