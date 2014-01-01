var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");

module.exports = Eventer.extend({

    init: function(ID, manager) {
        this.ID = ID;
        this.manager = manager;
        this.queue = manager.queue;
        this.done = false;
        this.loaded = false;
        this.lastAccessed = new Date();
        this.maxAge = 30*1000; //30 seconds

        this.info  = {};
        this.stats = {};
        this.tanks = {};

        this.progress = 0;

        this.queue.loadPlayer(ID);
        var self = this;
        this.manager.on('workers.*.players.'+ID+'.loaded.*', function(event, data) {
            event = _(event.split('.')).last();
            if(event == 'info') { self.info  = data; self.progress += 5; }
            if(event == 'tanks'){ self.tanks = data; self.progress += 5; }
            if(event == 'stats'){ self.stats = data; self.progress += 5; }
            if(event == 'all')  {
                if(!data.updating.stats){ self.progress += 40; }else{ self.stats.in_queue = true; }
                if(!data.updating.tanks){ self.progress += 40; }else{ self.tanks.in_queue = true; }
                if(_(data.updating).size() == 0){
                    self.progress += 5;
                    self.emit('done');
                    self.done = true;
                }
                //if(_(self.tanks).size() == 0){ console.log(self.ID); }
                self.emit('loaded');
                self.loaded = true;
            }
        });
        this.manager.on('workers.*.players.'+ID+'.updated.*', function(event, data) {
            event = _(event.split('.')).last();
            if(event == 'info')   { self.info  = data; }
            if(event == 'tanks')  { self.tanks = data; self.progress += 40; }
            if(event == 'stats')  { self.stats = data; self.progress += 40; }
            if(event == 'ratings'){ self.stats = data; self.progress += 5;  }
            if(event == 'all')  {
                self.emit('done');
                self.done = true;
            }
        });
    },

    onClose: function() {
        return this.done;
    },

    getData: function(options) {
        this.lastAccessed = new Date();
        options = options || {};
        return {
            progress: this.progress,
            info:  this.info,
            stats: this.stats,
            tanks: this.getTanks(options.tanks)
        };
    },

    getTanks: function(options) {
        options = options || {};

        return _(options).size() > 0 ? _.object(_(this.tanks).keys(), _(this.tanks).map(function(value, key){
          if(key == 'tanks'){
              return  _(value).where(options);
          }else{
              return value;
          }
        })) : this.tanks;
    }

});