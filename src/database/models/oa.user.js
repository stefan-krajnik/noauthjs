'use strict';

let mongoose = require('mongoose');

let oaUser = new mongoose.Schema({
    uuid: {
        type: Number,
        unique: true,
        required: true
    },
    login: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'oaProject'
    },
    scopes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'oaScope'
    }]
});

let model = mongoose.model('oaUser', oaUser);

module.exports = model;