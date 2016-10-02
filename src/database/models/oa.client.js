'use strict';

let mongoose = require('mongoose');

let oaClient = new mongoose.Schema({
    client_id: {
        type: String,
        required: true,
        unique: true
    },
    client_secret: {
        type: String,
        required: true
    },
    client_secret_required: {
        type: Boolean,
        default: true
    },
    client_name: {
        type: String,
        default: null
    },
    client_description: {
        type: String,
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'oaProject',
        required: true
    },
    scopes: {
        client_credentials: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'oaScope'
        }],
        user_credentials: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'oaScope'
        }]
    },
    has_refreshing_token: {
        type: Boolean,
        default: true
    }
});


let model = mongoose.model('oaClient', oaClient);

module.exports = model;