var Regions = {
    RU: 0,
    EU: 1,
    NA: 2,
    SEA: 3,
    VN: 4,
    KR: 5,

    supportedRegions: [
        0,1,2,3,5
    ],

    bounds: {
        0: {min: 0, max: 500000000},
        1: {min: 500000000, max: 1000000000},
        2: {min: 1000000000, max: 2000000000},
        3: {min: 2000000000, max: 2500000000},
        4: {min: 2500000000, max: 3000000000},
        5: {min: 3000000000, max: 4000000000}
    },

    TranslatedRegion: ['RU','EU','NA','SEA','VN','KR'],

    getRegion: function (id) {
        if(id > 3000000000){return this.KR;}
        if(id > 2500000000){return this.VN;}
        if(id > 2000000000){return this.SEA;}
        if(id > 1000000000){return this.NA;}
        if(id > 500000000){return this.EU;}
        return this.RU;
    }
};

$(function(){

    if(window.APIData){
        APIData.requests = {};
        APIData.pause = false;

        setInterval(function(){
            for(var i in APIData.requests){
                if(!APIData.requests[i].duration){
                    var req = APIData.requests[i];
                    var duration = (new Date()).getTime() - (new Date(req.added)).getTime() + ' ms';
                    $('#queue_task_'+i+' .badge').html(duration);
                }
            }
        },100);

        window.system = new WOTcsSystem(['workers.*', 'queue.*', 'router.stats']);

        system.on('closed',function(){
            APIData.requests = {};
            APIData.workers = {local:[], server:[], client:[]};
            renderWorkerCounts();
            $('[id$="task_list"]').find('.list-group-item').remove();
        });
        system.on('router.stats', function(event, routes) {
            $('#router_stats').html(getTemplate('router_stats_template',{routes: routes}));
        });
        system.on('workers.*.req-manager.start-request', function(event, data){
            if(!APIData.pause){
                var worker = event.split('.')[1];
                var ID = worker+'-'+data.reqID;
                APIData.requests[ID] = data;
                APIData.requests[ID].added = new Date();
                APIData.requests[ID].workerID = worker;
                var $requestList = $('#queue_task_list');
                $requestList.prepend(getTemplate('request_template',{
                    req: APIData.requests[ID], ID: ID,
                    region: Regions.TranslatedRegion[APIData.requests[ID].region]}));
                $requestList.find('.list-group-item').slice(100).remove();
            }
        });
        system.on('workers.*.req-manager.finish-request', function(event, data){
            var worker = event.split('.')[1];
            var ID = worker+'-'+data.reqID;
            if(APIData.requests[ID]){
                APIData.requests[ID].duration = data.duration;
                APIData.requests[ID].error = data.error;
                var $req = $('#queue_task_'+ID);
                $req.removeClass('active').addClass('finished')
                    .find('.badge').html(data.duration+' ms');
                if(data.error){
                    $req.addClass('list-group-item-danger')
                        .find('i').html(' - '+data.error);
                }
            }
        });
        system.on('queue.update', function(event, data){
            $('#queue_total').html(data.total);
            $('#queue_pending').html(data.pending);
            $('#queue_speed').html(data.speed+' players/s');

            $('#queue_finished').html(data.finished);
            $('#queue_failed').html(data.failed);
        });
        system.on('workers.add-worker', function(event, data) {
            APIData.workers = data.workers;
            renderWorkerCounts();
        });
        system.on('workers.remove-worker', function(event, data) {
            APIData.workers = data.workers;
            renderWorkerCounts();
        });
    }
    $('#pause_tasks').click(function(){
        APIData.pause = !APIData.pause;
        $(this).html(APIData.pause?'Start':'Pause');
    });

});

function renderWorkerCounts(){
    _.each(APIData.workers, function(worker, type) {
        $('#'+type+'_worker').html(worker.length);
    });
}

function getTemplate(template, data){
    return jade.templates[template](data);
}
