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
        default: null

    },
    password: {
        type: String,
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'oaProject'
    },
    scopes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'oaScope'
    }],
    social: {
        facebook: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        google: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    }
});

let model = mongoose.model('oaUser', oaUser);

module.exports = model;