'use strict';

let mongoose = require('mongoose');

let oaSession = new mongoose.Schema({
    uuid: {
        type: Number,
        default: null
    },
    access_token: {
        type: String,
        required: true,
        unique: true
    },
    refresh_token: {
        type: String,
        unique: true,
        default: null
    },
    at_expiration_time: {
        type: Date,
        default: ()=>{ return new Date(+new Date() + 60 * 60 * 1000); }
    },
    rt_expiration_time: {
        type: Date,
        default: null
    },
    scopes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'oaScope'
    }],
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'oaClient',
        required: true
    },
    grant: {
        type: String,
        required: true
    }
});


let model = mongoose.model('oaSession', oaSession);

module.exports = model;