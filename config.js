module.exports = {
    threads: 4,
    db: {
        MainDB: {url: process.env.API_POSTGRE || process.env.DATABASE_URL, type: 'PG'},
        MongoDB: {url: process.env.MONGOHQ_URL || "mongodb://localhost/wotcsapi", type: 'Mongo'}
    },
    server: {
        port: process.env.PORT || 3000,
        cookieSecret: process.env.WOTCS_SECRET,
        allowCrossDomain: true
    },
    ws: {
        execute: {
            permissions: {
                '*': ['admin']
            }
        }
    },
    workerManager: {
        version: 1,
        clientLimit: 12,
        configs: {
            local: {
            },
            server: {
            },
            client: {
            }
        }
    },
    assets: {
        compileInDev: false,
        include: [
            'jquery-1.10.2.min.js',
            'main.js'
        ]
    },
    caches: {
        Clan: {
            maxAge: 30*1000 //30 seconds
        },
        Player: {
            maxAge: 30*1000 //30 seconds
        }
    },
    queue: {
        taskTimeout: 50*1000, //50 seconds
        speedPeriod: 30*1000 //30 seconds
    },
    requestManager: {
        waitTime: 1500,
        concurrentRequests: 4,
        fields: {
            account_info: 'statistics.all,nickname',
            account_tanks: 'statistics.battles,statistics.wins,tank_id,mark_of_mastery'
        }
    },
    models: {
        playerStat: {
            maxAge: 6*60*60*1000 // 6 hours
        },
        playerTankCollection: {
            maxAge: 6*60*60*1000 // 6 hours
        }
    }
};