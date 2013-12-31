var BaseController = require('wotcs-api-system').BaseController;
var ClanCache = require('./../clan_cache');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function(req, res) {
        var ID = this.getID(req, res);
        if(!ID){ return; }

        var fast = req.query.fast || false;
        var options = { players: {tanks: {level: 10}}, polling: { event: fast ? 'loaded' : 'done' }};

        var clanCache = this.getCache('clan.'+ID);
        if(!clanCache){
            clanCache = new ClanCache(ID, this.workerManager, this);
            this.setCache('clan.'+ID, clanCache);
        }
        if(clanCache.done || ( clanCache.loaded && fast )){
            res.json( clanCache.getData( options ) );
        }else{
            this.longPoleFromCache(clanCache, 'getData', options);
        }
    },

    getID: function(req, res) {
        var ID = parseInt(req.params.id,10);
        if(isNaN(ID)){
            res.json({status: 'error', error:"Bad ID"});
            return false;
        }
        return ID;
    }

});