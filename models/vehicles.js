var BaseCollection = require('wotcs-api-system').BaseCollection('Mongo');
var csv = require('csv').parse;
var _ = require('underscore');
var fs = require('fs');

module.exports = BaseCollection.extend({

    dbName: 'MongoDB',
    isLoaded: false,

    vehicles: null,
    vehiclesByName: {},
    expectedValues: {},
    readyVehicless: false,
    readyExpected: false,
    ready: false,

    load: function(callback) {
        var self = this;
        this.collection.findOne(function(err, vehs) {
            if(vehs) {
                self.vehicles = vehs.data;
                self.buildDataByName();
                self.updated_at = vehs.updated_at;
            }
            if(!self.needsUpdate()){
                self.readyVehicless = true;
                self.ready = self.readyVehicless && self.readyExpected;
            }
            callback(err);
        });
        this.getExpectedValues();
    },

    buildDataByName: function() {
        _(this.vehicles).each(function (veh) {
            this.vehiclesByName[veh.name.split(':')[1]] = veh;
            if(veh.name != veh.new_name){
                this.vehiclesByName[veh.new_name.split(':')[1]] = veh;
            }
        }, this);
    },

    getExpectedValues: function() {
        var keys = [];
        var self = this;


        var parser = csv({delimiter: ';'}, function(err, data){
            _(data).each(function(row,index){
                if(index == 0){
                    _(row).each(function(key) {
                        keys.push(key);
                    });
                }else{
                    self.expectedValues[row[0]] = _.object(keys,row);
                }
            });
            self.readyExpected = true;
            self.ready = self.readyVehicless && self.readyExpected;
        });

        fs.createReadStream(__dirname+'/../wn8/expected14.csv').pipe(parser);
    },

    findExpected: function(name){
        return this.expectedValues[name];
    },

    needsUpdate: function() {
        return !this.updated_at || (new Date(this.updated_at)).getTime() < (new Date()).getTime() - 6*60*60*1000;
    },

    setData: function(data) {
        var self = this;
        _(data).each(function(tank) {
            tank.new_name = tank.name;
            if(tank.name.indexOf('AMX_50_68t') > -1){ tank.name = '#france_vehicles:F10_AMX_50B'; }
            if(tank.name.indexOf('_Hotchkiss_H35') > -1){ tank.name = '#france_vehicles:Hotchkiss_H35'; }
            if(tank.name.indexOf('Bat_Chatillon155') > -1){ tank.name = '#france_vehicles:Bat_Chatillon155_58'; }
            if(tank.name.indexOf('_M44') > -1){ tank.name = '#usa_vehicles:M44'; }
            if(tank.name.indexOf('IS-6') > -1){ tank.name = '#ussr_vehicles:Object252'; }
        });
        var document = {updated_at: new Date(), data: data};
        this.vehicles = data;
        this.buildDataByName();
        this.collection.remove(function() {
            self.collection.save(document, function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log('Tankopedia updated.');
                    self.readyVehicless = true;
                    self.ready = self.readyVehicless && self.readyExpected;
                }
            });
        });
    },

    find: function(id, callback) {
        callback(new this.constructor(this.vehicles[id]));
    },

    findByName: function(name, callback) {
        callback(new this.constructor(this.vehiclesByName[name]));
    }

});