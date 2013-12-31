var App = require('wotcs-api-system').App;
var Queue = require('./queue');
var config = require('./config');

var app = new App(__dirname, config);
//app.setErrorHandler('Errors');

if (app.isMaster){
    var queue = new Queue();
    app.setupWorkers(4, 'worker', 'worker_client', queue);
}

app.once('models.ready', function() {
    app.Vehicles.load(function() {
        if(app.Vehicles.needsUpdate()){
            if(app.queue){
                app.queue.loadTankopedia();
            }
        }
    });
});