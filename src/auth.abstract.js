'use strict';

const mongoose = require('mongoose');
const oaProject = require('./database/models/oa.project');
const oaClient = require('./database/models/oa.client');
const oaScope = require('./database/models/oa.scope');
const oaUser = require('./database/models/oa.user');
const oaSession = require('./database/models/oa.session');
const idIncrementer = require('./database/models/id.incementer');

class AuthAbstract {
    constructor(){

        this.initVars();
        this.initDbModels();
    }

    initVars(){
        this.ProjectModel = null;
        this.ClientModel = null;
        this.ScopeModel = null;
    }

    initDbModels(){
        // this.UserModel = require('./database/models/oa_user');
        // this.SessionModel = require('./database/models/oa_session');
    }
}

module.exports = AuthAbstract;