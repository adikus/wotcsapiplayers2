var Eventer = require('wotcs-api-system').Eventer;
var Regions = require('./shared/regions');
var _ = require('underscore');

module.exports = Eventer.extend({

    init: function(app) {
        this.app = app;

        this.tasks = {};
        this.pendingTasks = {};
        this.waitingWorkers = {};
        this.taskID = 0;
        this.recentTasks = [];
        this.finishedTasks = 0;
        this.failedTasks = 0;
        this.speed = 0;
        this.vehiclesReady = false;

        var self = this;
        this.starter = setInterval(function(){
            if(self.Vehicles && self.Vehicles.ready){
                clearInterval(self.starter);
                console.log('Vehicle data ready');
                self.vehiclesReady = true;
            }
        }, 50);
        setInterval(function(){ self.step(); },5);
    },

    setModels: function(models){
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    fillQueue: function() {
        /*var self = this;
        this.Players.inRegion(1, {limit: [0,10000]}, function(err, players) {
            _(players).each(function (player) {
                self.loadPlayer(player.id);
            });
        }); */
    },

    loadPlayer: function(ID) {
        var region = Regions.getRegion(ID);
        this.addTask(region, 'account', 'load', ID);
    },

    loadTankopedia: function() {
        this.addTask(-1, 'encyclopedia', 'tanks', 500000001);
    },

    addTask: function(region, subject, method, ID) {
        var key = region+'.'+subject+'.'+method;
        if(!this.tasks[key]){ this.tasks[key] = []; }
        else {
            var taskIndex = this.findTask(key, ID);
            if(taskIndex > -1){
                return;
            }
            taskIndex = this.findPendingTask(key, ID);
            if(taskIndex > -1){
                return;
            }
        }
        var task = {
            taskID: this.taskID++,
            ID: ID,
            added: new Date()
        };
        this.tasks[key].push(task);
    },

    findTask: function(key, ID) {
        for(var i in this.tasks[key]){
            if(this.tasks[key][i].ID == ID){ return i; }
        }
        return -1;
    },

    addToPending: function(task) {
        var region = task.region;
        var subject = task.subject;
        var method = task.method;
        var key = region+'.'+subject+'.'+method;
        if(!this.pendingTasks[key]){ this.pendingTasks[key] = {}; }
        this.pendingTasks[key][task.taskID] = task;

        var self = this;
        setTimeout(function(){
            if(self.findPendingTask(key, task.taskID) > -1){
                console.log('Task timeout:', task.taskID);
                self.reportFail(task);
            }
        },60000);
    },

    removeFromPending: function(task){
        var region = task.region;
        var subject = task.subject;
        var method = task.method;
        var key = region+'.'+subject+'.'+method;
        delete this.pendingTasks[key][task.taskID];
    },

    findPendingTask: function(key, ID) {
        for(var i in this.pendingTasks[key]){
            if(this.pendingTasks[key][i].ID == ID){ return i; }
        }
        return -1;
    },

    hasTasks: function() {
        return this.tasksCount() > 0;
    },

    tasksCount: function() {
        var sum = 0;
        _(this.tasks).each(function(tasks) {
            sum += tasks.length;
        });
        return sum;
    },

    pendingTasksCount: function() {
        var sum = 0;
        _(this.pendingTasks).each(function(tasks) {
            sum += _(tasks).size();
        });
        return sum;
    },

    getTaskKey: function() {
        var winningTask = {score: -1};
        _(this.tasks).each(function(tasks, key) {
            if(tasks.length == 0){ return; }
            var score = ((new Date()).getTime() - tasks[0].added.getTime())*tasks.length;
            if((score > winningTask.score && this.vehiclesReady) || key.indexOf('encyclopedia') > -1){
                winningTask = {
                    score: score,
                    key: key
                };
            }
        }, this);
        return winningTask.key;
    },

    getTask: function(key) {
        var split = key.split('.');
        var task = this.tasks[key].shift();
        return {
            taskID: task.taskID++,
            region: split[0],
            subject: split[1],
            method: split[2],
            ID: task.ID
        };
    },

    getFromQueue: function(callback, workerID, options) {
        this.waitingWorkers[workerID] = {
            callback: callback, options: options
        };
    },

    getLeastBusyWorkerID: function() {
        var ID = -1;
        var pending = 10e9;
        _(this.waitingWorkers).each(function(worker, key){
            if(worker.options.pending < pending){
                pending = worker.options.pending;
                ID = key;
            }
        });
        return ID;
    },

    setTaskToWaitingWorker: function(key) {
        if(!key){ return; }
        var workerID = this.getLeastBusyWorkerID();
        var counter = this.waitingWorkers[workerID].options.howManyTasks;
        while( counter > 0 && this.tasks[key].length > 0 ){
            var task = this.getTask(key);
            this.addToPending(task);
            this.waitingWorkers[workerID].callback(task);
            this.setTaskTimer(task);
            counter--;
        }
        delete this.waitingWorkers[workerID];
    },

    setTaskTimer: function(task) {
        var region = task.region;
        var subject = task.subject;
        var method = task.method;
        var key = region+'.'+subject+'.'+method;
        var self = this;
        setTimeout(function() {
            if(self.pendingTasks[key][task.taskID]){
                self.reportFail(task);
                console.log('Task timeout', task);
            }
        },50*1000);
    },

    step: function() {
        while(_(this.waitingWorkers).size() > 0 && this.hasTasks()){
            this.setTaskToWaitingWorker(this.getTaskKey());
        }
    },

    confirmSuccess: function(task) {
        this.removeFromPending(task);
        this.calcSpeed(true);
        this.finishedTasks++;
        this.emit('update', this.getCurrentStatus(), true);
    },

    reportFail: function(task) {
        this.removeFromPending(task);
        this.addTask(task.region, task.subject, task.method, task.ID);
        this.calcSpeed();
        this.failedTasks++;
        this.emit('update', this.getCurrentStatus(), true);
    },

    calcSpeed: function(succeess) {
        if(succeess){
            this.recentTasks.push({
                time: new Date()
            });
        }
        while(this.recentTasks.length > 0 && (new Date()).getTime() - this.recentTasks[0].time.getTime() > 30*1000 ){
            this.recentTasks.shift();
        }
        if(this.recentTasks.length > 1){
            var duration = _(this.recentTasks).last().time.getTime() - _(this.recentTasks).first().time.getTime();
            this.speed = Math.round(this.recentTasks.length/duration*1000*100)/100;
        }
    },

    getCurrentStatus: function() {
        return {
            pending: this.pendingTasksCount(),
            total: this.pendingTasksCount()+this.tasksCount(),
            finished: this.finishedTasks,
            failed: this.failedTasks,
            speed: this.speed
        }
    }

});