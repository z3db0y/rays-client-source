let mongoose = require('mongoose');
let config = require('../config');

mongoose.set('strictQuery', true);

mongoose.connect(
    `mongodb://${config.mongo.host}/`,
    {
        user: config.mongo.user,
        pass: config.mongo.pass,
        dbName: config.mongo.db
    },
    err => {
        console.log(err);
    }
);
const { connection: db } = mongoose;

db.on('connected', async () => {
    console.log('Database connected');
});

db.on('disconnected', () => {
    console.log('Database disconnected');
    setTimeout(() => {
        mongoose.connect(
            `mongodb://${config.mongo.host}/`,
            {
                user: config.mongo.user,
                pass: config.mongo.pass,
                dbName: config.mongo.db
            },
            err => {
                console.log(err);
            }
        );
    }, 5000);
});

db.on('error', err => {
    console.error(err);
});

module.exports = db;