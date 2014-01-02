var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");
var Request = require("./shared/request");
var ScrapeRequest = require("./shared/scrape_request");
var Regions = require('./shared/regions');
var cheerio = require('cheerio');
var Config = require('./config');

module.exports = Eventer.extend({

    init: function() {
        this.currentRequests = {};
        this.currentRequestsScrape = {};
        this.tasks = {};
        this.lastStart = new Date();
        this.lastStartScrape = new Date();
        this.reqID = 0;

        var self = this;
        setInterval(function(){self.step();},250);
    },

    addTask: function(region, subject, method, ID) {
        var key = region+'.'+subject+'.'+method;
        if(!this.tasks[key]){ this.tasks[key] = []; }
        var task = {
            ID: ID,
            added: new Date()
        };
        this.tasks[key].push(task);
    },

    findTask: function(region, subject, method, ID) {
        var key = region+'.'+subject+'.'+method;
        for(var i in this.tasks[rkey]){
            if(this.tasks[key][i].ID == ID){ return i; }
        }
        return -1;
    },

    taskCount: function(scrape) {
        var sum = 0;
        _(this.tasks).each(function(tasks, key) {
            var split = key.split('.');
            sum += !scrape || (split[1] == 'account' && split[2] == 'tanks') ? tasks.length : 0;
        });
        return sum;
    },

    getTask: function(scrape) {
        var winningTask = {score: -1};
        _(this.tasks).each(function(tasks, key) {
            if(tasks.length == 0){ return; }
            var score = ((new Date()).getTime() - tasks[0].added.getTime())*tasks.length;
            var split = key.split('.');
            if(score > winningTask.score && (!scrape || (split[1] == 'account' && split[2] == 'tanks'))){
                winningTask = {
                    score: score,
                    key: key
                };
            }
        });

        var IDs = [];
        var split = winningTask.key.split('.');
        var limit = 15;
        if(scrape){ limit = 1; }
        while(IDs.length < limit && this.tasks[winningTask.key].length > 0){
            var task = this.tasks[winningTask.key].shift();
            IDs.push(task.ID);
        }
        return {
            region: split[0],
            subject: split[1],
            method: split[2],
            IDs: IDs,
            reqID: this.reqID++
        };
    },

    needTask: function() {
        return this.taskCount() < 60;
    },

    step: function(){
        var durationScrape = (new Date()).getTime() - this.lastStartScrape.getTime();
        if(this.taskCount(true) > 0 && _(this.currentRequestsScrape).size() < Config.requestManager.concurrentRequests && durationScrape > Config.requestManager.waitTime){
            var task = this.getTask(true);
            this.doScrapeTask(task);
        }

        var duration = (new Date()).getTime() - this.lastStart.getTime();
        if(this.taskCount() > 0 && _(this.currentRequests).size() < Config.requestManager.concurrentRequests && duration > Config.requestManager.waitTime){
            var task = this.getTask();
            this.doApiTask(task);
        }
    },

    parseData: function(data){
        try{
            return JSON.parse(data);
        }catch(e){
            return false;
        }
    },

    parseScrapeData: function(task, data) {
        var ret = [];
        if(task.subject == 'account' && task.method == 'tanks'){
            var $ = cheerio.load(data);
            $('tr.t-profile_tankstype__item').each(function(){
                var battles = $(this).find('td.t-profile_right').text();
                var wins = parseInt($(this).find('td.t-profile_center').first().text(),10)/100*battles;
                var MoM = $(this).find('td.t-ico-class img').data('badgeCode') || 0;
                var name = $(this).find('img.png').attr('alt');
                ret.push({
                    statistics: { wins:wins, battles:battles },
                    mark_of_mastery: MoM, tank_name: name
                });
            });
            return ret;
        }
    },

    doApiTask: function(task) {
        this.lastStart = new Date();
        var subject = task.subject;
        var method = task.method;
        var fields = null;
        if(subject == 'account' && method == 'info'){ fields = Config.requestManager.fields.account_info;}
        if(subject == 'account' && method == 'tanks'){ fields = Config.requestManager.fields.account_tanks; }

        var req = new Request(subject, method, task.IDs, fields);
        this.currentRequests[task.reqID] = req;
        var self = this;
        //console.log('#'+task.reqID, task.subject, task.method, task.IDs.length);
        this.emit('start-request',task,true);
        req.onSuccess(function(data) {
            //console.log('#'+task.reqID, task.subject, task.method, 'done');
            var parsed = self.parseData(data);
            var error = false;
            if(parsed.data){
                _(task.IDs).each(function(ID) {
                    self.emit(subject+'.'+method+'.'+ID, parsed.data[ID] ? parsed.data[ID] : parsed.data);
                });
            }else{
                error = data;
                _(task.IDs).each(function(ID) {
                    self.emit('fail'+'.'+subject+'.'+method+'.'+ID, error);
                });
            }
            self.emit('finish-request',{reqID: task.reqID, error: error, duration: req.getDuration()},true);
            delete self.currentRequests[task.reqID];
        });

        req.onError(function(error){
            console.log('#'+task.reqID, task.subject, task.method, 'fail');
            _(task.IDs).each(function(ID) {
                self.emit('fail'+'.'+subject+'.'+method+'.'+ID, error);
            });
            self.emit('finish-request',{reqID: task.reqID, error: error, duration: req.getDuration()},true);
            delete self.currentRequests[task.reqID];
        });
    },

    doScrapeTask: function(task) {
        this.lastStartScrape = new Date();
        var ID = task.IDs[0];

        var req = new ScrapeRequest(ID);
        this.currentRequestsScrape[task.reqID] = req;
        var self = this;
        //console.log('#'+task.reqID, task.subject, task.method, ID);
        task.scrape = true;
        this.emit('start-request',task,true);
        req.onSuccess(function(data) {
            //console.log('#'+task.reqID, task.subject, task.method, 'done');
            var parsed = self.parseScrapeData(task, data);
            self.emit(task.subject+'.'+task.method+'.'+ID, parsed);
            self.emit('finish-request',{reqID: task.reqID, error: false, duration: req.getDuration()},true);
            delete self.currentRequestsScrape[task.reqID];
        });

        req.onError(function(error){
            console.log('#'+task.reqID, task.subject, task.method, 'fail');
            self.emit('fail'+'.'+task.subject+'.'+task.method+'.'+ID, error);
            self.emit('finish-request',{reqID: task.reqID, error: error, duration: req.getDuration()},true);
            delete self.currentRequestsScrape[task.reqID];
        });
    }

});