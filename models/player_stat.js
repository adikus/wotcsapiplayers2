var BaseModel = require('wotcs-api-system').BaseModel('PG');
var _ = require('underscore');
var Config = require('../config');

module.exports = BaseModel.extend({

    timestamps: true,

    statFields: ['spotted', 'wins', 'defeats', 'accuracy', 'capture', 'battles', 'damage', 'frags', 'survived', 'defence', 'experience', 'wn7', 'wn8','efficiency', 'sc3', 'average_tier'],

    getData: function() {
        var ret = {};
        _(this.statFields).each(function(key) {
            ret[key] = this[key];
        },this);
        ret.updated_at = new Date(this.updated_at);
        return ret;
    },

    needsUpdate: function() {
        return !this.updated_at || (new Date(this.updated_at)).getTime() < (new Date()).getTime() - Config.models.playerStat.maxAge;
        //return true;
    },

    update: function(stats, callback) {
        this.spotted = stats.all.spotted;
        this.wins = stats.all.wins;
        this.defeats = stats.all.losses;
        this.accuracy = stats.all.shots > 0 ? stats.all.hits / stats.all.shots : 0;
        this.capture = stats.all.capture_points;
        this.battles = stats.all.battles;
        this.damage = stats.all.damage_dealt;
        //this.damage_r = stats.all.damage_received;
        this.frags = stats.all.frags;
        this.survived = stats.all.survived_battles;
        this.defence = stats.all.dropped_capture_points;
        this.experience = stats.all.xp;
        this.stat_type = 0;
        callback();
    },

    saveAll: function(callback) {
        var fields = _(this.statFields).clone();
        fields.push('stat_type', 'player_id');
        this.save(fields, function(err) {
            if(err){console.log(err);}
        });
        if(callback){ callback(); }
    },

    calcWN7: function(){
        var wn7 = (1240-1040/Math.pow(Math.min(this.average_tier,6),0.164))*this.frags/this.battles;
        wn7 += this.damage/this.battles*530/(184*Math.pow(Math.E,0.24*this.average_tier)+130);
        wn7 += this.spotted/this.battles*125*Math.min(this.average_tier, 3)/3;
        wn7 += Math.min(this.defence/this.battles,2.2)*100;
        wn7 += ((185/(0.17+Math.pow(Math.E,((this.wins/this.battles*100-35)*-0.134))))-500)*0.45;
        wn7 += (5 - Math.min(this.average_tier,5))*-125 / (1 + Math.pow(Math.E,( ( this.average_tier - Math.pow((this.battles/220),(3/this.average_tier)) )*1.5 )));
        if( isNaN(wn7) || !isFinite(wn7))wn7 = 0;
        this.wn7 = wn7;
        return wn7;
    },

    calcEFR: function(){
        if(this.average_tier > 0)var f2 = 10/(this.average_tier+2)*(0.23+2*this.average_tier/100);
        else var f2=0;
        if(this.battles > 0)
            var efr=this.frags/this.battles*250 +
                this.damage/this.battles*f2 +
                this.spotted/this.battles*150 +
                Math.log(this.capture/this.battles+1)/Math.log(1.732)*150 +
                this.defence/this.battles*150;
        else var efr = 0;
        if( isNaN(efr)){ efr = 0;}
        this.efficiency = efr;
        return efr;
    },

    calcWN8: function() {
        var rDAMAGE = (this.damage/this.battles)  / (this.expected_values.damage/this.battles);
        var rSPOT   = (this.spotted/this.battles) / (this.expected_values.spotted/this.battles);
        var rFRAG   = (this.frags/this.battles)   / (this.expected_values.frags/this.battles);
        var rDEF    = (this.defence/this.battles) / (this.expected_values.defence/this.battles);
        var rWIN    = (this.wins/this.battles)    / (this.expected_values.wins/this.battles);
        var rWINc   = Math.max(0,                     (rWIN    - 0.71) / (1 - 0.71) );
        var rDAMAGEc= Math.max(0,                     (rDAMAGE - 0.22) / (1 - 0.22) );
        var rFRAGc  = Math.max(0, Math.min(rDAMAGEc + 0.2, (rFRAG   - 0.12) / (1 - 0.12)));
        var rSPOTc  = Math.max(0, Math.min(rDAMAGEc + 0.1, (rSPOT   - 0.38) / (1 - 0.38)));
        var rDEFc   = Math.max(0, Math.min(rDAMAGEc + 0.1, (rDEF    - 0.10) / (1 - 0.10)));
        var WN8 = 980*rDAMAGEc + 210*rDAMAGEc*rFRAGc + 155*rFRAGc*rSPOTc + 75*rDEFc*rFRAGc + 145*Math.min(1.8,rWINc);
        if( isNaN(WN8)){ WN8 = 0;}
        this.wn8 = WN8;
        return WN8;
    }

});