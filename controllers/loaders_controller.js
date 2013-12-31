var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function (req, res) {
        if(req.headers['sec-websocket-version']){
            // Heroku sends wensocket request as normal requests as well, just send something
            res.json({status:'ok'});
        }
        var ret = {
            title: 'Player loader',
            workers: this.workerManager.getWorkersByType(),
            queue: this.workerManager.queue.getCurrentStatus()
        };

        this.render('index', ret);
    }

});