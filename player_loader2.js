var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");
var Request = require("./shared/request");
var Regions = require('./shared/regions');

module.exports = Eventer.extend({

    init: function() {
        this.config = {};
        this.options = {};

        this.currentRequests = {};
        this.tasks = [];

        this.start();
        this.waitingForTask = true;

        this.lastStart = new Date();
    },

    start: function() {
        var self = this;
        this.paused = false;
        console.log('Worker started.');
        this.emit('start', true);
        this.interval = setInterval(function() {self.step(); }, 10);
    },

    pause: function(pause){
        if(pause != this.paused){
            this.paused = pause;
            if(pause){
                clearInterval(this.interval);
                console.log('Worker paused.');
                this.emit('pause', true);
            }else{
                this.start();
            }
        }
        return pause;
    },

    setModels: function(models) {
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    getQueueOptions: function() {
        return this.options;
    },

    getConfig: function() {
        return this.config;
    },

    setConfig: function(config) {
        _.each(config, function(value, name){
            if(name != 'paused'){
                this.config[name] = value;
            }else{
                this.pause(value)
            }
        },this);
        return this.getConfig();
    },

    setTask: function(task) {
        this.waitingForTask = false;
        this.tasks.push(task);
    },

    step: function() {
        var duration = (new Date()).getTime() - this.lastStart.getTime();
        if(_(this.currentRequests).size() < 4 && duration > 1500){
            if(this.tasks.length > 0){
                this.doTask(this.tasks.shift());
            }else{
                if(!this.waitingForTask){
                    this.waitingForTask = true;
                    this.emit('ready', this.getQueueOptions(), false);
                }
            }
        }
    },

    doTask: function(task) {
        var subject = task.subject;
        var method = task.method;
        var fields = null;
        if(subject == 'player'){ subject = 'account'; }
        if(subject == 'account' && method == 'stats'){ method = 'info'; fields = 'statistics.all,clan.clan_id,nickname';}
        if(subject == 'account' && method == 'tanks'){ fields = 'statistics.battles,statistics.wins,tank_id,mark_of_mastery'; }

        console.log(task.subject, task.method, task.IDs.length);
        var req = new Request(subject, method, task.IDs, fields);
        this.currentRequests[task.ID] = req;
        var self = this;
        req.onSuccess(function(data) {
            self.processData(task, data);
            delete self.currentRequests[task.ID];
        });

        req.onError(function(error){
            self.emit('fail-task', task);
            delete self.currentRequests[task.ID];
        });
    },

    parseData: function(data){
        try{
            return JSON.parse(data);
        }catch(e){
            return false;
        }
    },

    processData: function(task, data) {
        if(task.subject == 'player' && task.method == 'stats'){
            this.processDataStats(task, data);
        }else if(task.subject == 'player' && task.method == 'tanks'){
            this.processDataTanks(task, data);
        }else if(task.subject == 'encyclopedia' && task.method == 'tanks'){
            this.processDataEncyclopedia(task, data);
        }
    },

    processDataStats: function(task, data){
        var self = this;
        var finish = _.after(task.IDs.length, function() {
            self.emit('finish-task', task);
        });
        var parsed = this.parseData(data);
        _(parsed.data).each(function(playerData, playerID) {
            self.PlayerStats.findByPlayerID(playerID, function(err, stat){
                if(!stat){
                    stat = self.PlayerStats.new({player_id: playerID});
                }
                stat.update(playerData.statistics);
                stat.once('updated', function(event, data) {
                    self.emit('stats.'+playerID+'.updated', data);
                    finish();
                });
            });
        });
    },

    processDataTanks: function(task, data){
        var self = this;
        var finish = _.after(task.IDs.length, function() {
            console.log('Tanks done');
            self.emit('finish-task', task);
        });
        var parsed = this.parseData(data);
        _(parsed.data).each(function(tanks, playerID) {
            playerID = parseInt( playerID, 10 );
            self.PlayerTankCollections.findByPlayerID(playerID, function(err, tankCollection){
                if(!tankCollection){
                    tankCollection = self.PlayerTankCollections.new({p: playerID});
                }
                tankCollection.update(tanks);
                tankCollection.once('updated', function(event, data) {
                    self.emit('tanks.'+playerID+'.updated', data);
                    finish();
                });
            });
        });
    },

    processDataEncyclopedia: function(task, data){
        var self = this;
        var parsed = this.parseData(data);
        this.Vehicles.setData(parsed.data);
    }

});