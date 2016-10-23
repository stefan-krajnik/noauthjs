'use strict';

let mongoose = require('mongoose');

let oaProject = new mongoose.Schema({
    project_id: {
        type: String,
        required: true,
        unique: true
    },
    project_name: {
        type: String,
        default: null
    },
    project_description: {
        type: String,
        default: null
    },
    default_registration_scopes: {
        type: [String],
        default: null
    }
});

let model = mongoose.model('oaProject', oaProject);

module.exports = model;