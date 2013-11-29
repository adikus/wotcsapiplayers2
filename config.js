module.exports = {
    db: {
        MainDB: {url: process.env.API_POSTGRE || process.env.DATABASE_URL, type: 'PG'}
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
    }
};