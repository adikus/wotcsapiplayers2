var BaseModel = require('wotcs-api-system').BaseModel('Mongo');
var _ = require('underscore');
var Config = require('../config');

module.exports = BaseModel.extend({

    timestamps: true,
    shortKeys: true,

    getData: function() {
        return {
            updated_at: new Date(this.u),
            //total_battles: this.total_battles,
            //serialized: this.t,
            tanks: this.getTanks()
        };
    },

    update: function(tanks, callback) {
        this.t = this.getTanksSerialized(tanks);
        this.save(['t','p'],function(err){
            if(err){console.log(err);}
        });
        if(callback){ callback(); }
    },

    getTanks: function(tanks){
        if(this.tanks && this.tanks.length > 0){ return this.tanks; }
        if(!tanks){
            tanks = this.getTanksDeserialized();
        }
        else { tanks = this.prepareTanksFromWG(tanks);   }
        var self = this;
        var sum = 0;
        var count = 0;
        this.base_score = 0;
        var infos = {};
        _(tanks).each(function(tank) {
            if(tank.tank_id){
                this.app.Vehicles.find(tank.tank_id, function(tankInfo) {
                    infos[tank.tank_id] = tankInfo;
                });
            }else{
                this.app.Vehicles.findByName(tank.tank_name, function(tankInfo) {
                    tank.tank_id = tankInfo.tank_id;
                    infos[tank.tank_id] = tankInfo;
                });
            }
        }, this);

        this.tanks = _(tanks).map(function(tank) {
            var info = infos[tank.tank_id];
            if(!info){
                console.log(tank);
                return;
            }
            sum += info.level*tank.battles;
            count += tank.battles;
            tank.level = info.level;
            tank.type = info.type;
            tank.name_local = info.name_i18n;
            tank.name = info.name;
            var score = self.calcScore(tank);
            if(isNaN(score)){
                score = 0;
            }
            self.base_score += score;
            delete tank.tank_name;
            return tank;
        });
        this.average_tier = count > 0 ? sum/count : 0;
        this.total_battles = count;
        return this.tanks;
    },

    getAverageTier: function() {
        if(this.average_tier){
            if(isNaN(this.average_tier) || this.average_tier == 0){
                this.average_tier = 0;
            }
            return this.average_tier;
        }
        this.getTanks();
        return this.average_tier;
    },

    getTotalBattles: function() {
        if(this.total_battles){
            return this.total_battles;
        }
        this.getTanks();
        return this.total_battles;
    },

    prepareTanksFromWG: function(tanks) {
        return _(tanks).map(function(tank) {
            return {
                tank_id: tank.tank_id,
                tank_name: tank.tank_name,
                battles: tank.statistics.battles,
                wins   : tank.statistics.wins,
                mark_of_mastery: tank.mark_of_mastery
            };
        });
    },

    getTanksDeserialized: function() {
        if(!this.t){ return []; }
        return _(this.t.split(';')).map(function(t){
            return _.object(['tank_id','battles','wins','mark_of_mastery'],
                _(t.split(',')).map(function(v) { return parseInt(v, 10); }));
        });
    },

    getTanksSerialized: function(tanks) {
        tanks = this.getTanks(tanks);
        return _(tanks).chain().map(function(t) {
            return t && t.tank_id ? t.tank_id+','+ t.battles+','+ t.wins+','+ t.mark_of_mastery : null;
        }).value().join(';');
    },

    calcScore: function(tank){
        var percentage = tank.wins/tank.battles*100;
        var factor = (percentage-35)/15*Math.min(tank.battles,75)/75;
        if(	tank.level == 10 && tank.type == 'mediumTank' ){
            return 1000*factor;
        }else if( tank.level == 10 && tank.type == 'heavyTank'){
            return 1000*factor;
        }else if( tank.level == 10 && tank.type == 'AT-SPG' ){
            return 900*factor;
        }else if( tank.level == 10 && tank.type == 'SPG' ){
            return 900*factor;
        }else return 0;
    },

    getExpectedValues: function() {
        if(this.expected_values){ return this.expected_values; }
        var tanks = this.getTanks();
        var values = {
            frags: 0,
            damage: 0,
            spotted: 0,
            defence: 0,
            capture: 0,
            wins: 0
        };
        _(tanks).each(function(tank) {
            if(!tank || !tank.name){ return; }
            var name = tank.name.split(':')[1];
            var expected = this.app.Vehicles.findExpected(name);
            if(expected){
                values.frags += tank.battles*expected.frag;
                values.damage += tank.battles*expected.dmg;
                values.spotted += tank.battles*expected.spot;
                values.defence += tank.battles*expected.def;
                values.capture += tank.battles*expected.cap;
                values.wins += tank.battles*expected.win/100;
            }
        }, this);
        this.expected_values = values;
        return values;
    },

    needsUpdate: function() {
        return !this.u || (new Date(this.u)).getTime() < (new Date()).getTime() - Config.models.playerTankCollection.maxAge;
        //return true;
    }

});