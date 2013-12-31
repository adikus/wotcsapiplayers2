module.exports = {
    get:{
        '/': 'loaders#index',
        '/players/:id': 'players#index',
        '/clans/:id': 'clans#index'
    }
};