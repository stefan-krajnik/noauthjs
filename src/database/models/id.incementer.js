'use strict';

let mongoose = require('mongoose');

let idIncementer = new mongoose.Schema({
    id_name: {
        type: String,
        required: true,
        unique: true
    },
    max_id: {
        type: Number,
        required: true,
        unique: true
    }
});

let model = mongoose.model('idIncementer', idIncementer);

module.exports = model;