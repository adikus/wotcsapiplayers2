var Eventer = require('wotcs-api-system').Eventer;
var PlayerLoader = require('./player_loader');
var RequestManager = require('./request_manager');
var _ = require("underscore");

module.exports = Eventer.extend({

    init: function() {
        this.config = {};
        this.options = { howManyTasks: 15 };

        this.requestManager = new RequestManager();
        this.propagateFrom(this.requestManager, 'req-manager');

        this.tasks = [];

        this.waitingForTask = true;
        this.start();
        this.playerLoaders = {};
    },

    start: function() {
        var self = this;
        this.paused = false;
        console.log('Worker started.');
        this.emit('start', true);
        this.interval = setInterval(function() {self.step(); }, 5);
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
        var ret = this.options;
        ret.pending = _(this.playerLoaders).size() + this.tasks.length;
        return ret;
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
        while(this.tasks.length > 0){
            this.doTask(this.tasks.shift());
        }
        if(this.tasks.length == 0){
            if(!this.waitingForTask && this.requestManager.needTask()){
                this.waitingForTask = true;
                this.emit('ready', this.getQueueOptions(), false);
            }
        }
    },

    doTask: function(task) {
        if(task.subject == 'account' && task.method == 'load'){
            this.accountLoad(task);
        }else if(task.subject == 'encyclopedia' && task.method == 'tanks'){
            this.loadTankopedia(task);
        }
    },

    createPlayereLoader: function(task) {
        var self = this;
        var playerLoader = new PlayerLoader(task, this);
        this.propagateFrom(playerLoader, 'players.'+task.ID);
        playerLoader.on('update.*', function(event, callback) {
            var method = event.split('.')[1];
            self.requestManager.addTask(task.region, 'account', method, task.ID);
            self.requestManager.once('account.'+method+'.'+task.ID, callback);
            self.requestManager.once('fail.account.'+method+'.'+task.ID, function(){
                self.emit('fail-task', task);
                if(self.playerLoaders[task.ID]){ delete self.playerLoaders[task.ID]; }
            });
        });
        playerLoader.once('loaded.all', function(event, data) {
            if(_(data.updating).size() == 0){
                self.emit('finish-task', task);
                if(self.playerLoaders[task.ID]){ delete self.playerLoaders[task.ID]; }
            }else{
                playerLoader.once('updated.all', function() {
                    self.emit('finish-task', task);
                    if(self.playerLoaders[task.ID]){ delete self.playerLoaders[task.ID]; }
                });
            }
        });
        return playerLoader;
    },

    hasAccountLoadTasks: function() {
        return _.some(this.tasks, function(task) {
            return task.subject == 'account' && task.method == 'load';
        });
    },

    getUnstartedPlayerLoaderIDs: function() {
        return _(this.playerLoaders).chain().where({started: false}).map(function(loader){
            loader.started = true;
            return parseInt(loader.ID, 10);
        }).value();
    },

    accountLoad: function(task) {
        var self = this;
        this.playerLoaders[task.ID] = this.createPlayereLoader(task);
        if(!this.hasAccountLoadTasks()){
            var IDs = this.getUnstartedPlayerLoaderIDs();
            this.Players.where(['id IN ?', IDs], function(err, players) {
                var playerMap = _.object(_(players).pluck('id'), players);
                _(IDs).each(function(ID){
                    if(self.playerLoaders[ID]){
                        self.playerLoaders[ID].setPlayerInfo(playerMap[ID]);
                    }
                });
            });
            this.PlayerStats.where(['player_id IN ?', IDs], function(err, stats) {
                var statMap = _.object(_(stats).pluck('player_id'), stats);
                _(IDs).each(function(ID){
                    if(self.playerLoaders[ID]){
                        self.playerLoaders[ID].setPlayerStats(statMap[ID]);
                    }
                });
            });
            this.PlayerTankCollections.where({p: { $in: IDs }}, function(err, tankCollections) {
                var tankMap = _.object(_(tankCollections).pluck('p'), tankCollections);
                _(IDs).each(function(ID){
                    if(self.playerLoaders[ID]){
                        self.playerLoaders[ID].setPlayerTanks(tankMap[ID]);
                    }
                });
            });
        }
    },

    loadTankopedia: function(task) {
        var self = this;
        this.requestManager.addTask(task.region, task.subject, task.method, task.ID);
        this.requestManager.once('encyclopedia.tanks', function(event, data) {
            self.Vehicles.setData(data);
        });
    }

});