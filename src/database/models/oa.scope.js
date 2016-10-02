'use strict';

let mongoose = require('mongoose');

let oaScope = new mongoose.Schema({
    scope_id: {
        type: String,
        required: true,
        unique: true
    },
    scope_name: {
        type: String,
        default: null
    },
    scope_description: {
        type: String,
        default: null
    }
});

let model = mongoose.model('oaScope', oaScope);
module.exports = model;
