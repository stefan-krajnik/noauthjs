'use strict';

const AuthUserControllerAbstract = require('./auth.user.controller.abstract');

class AuthProject extends AuthUserControllerAbstract {
    constructor(project_id){
        super();


    }

    initVars(){
        super.initVars();

        this.project = null;
        this.projectDbQuery = null;
    }

    ready(){
        return this.projectDbQuery.then(()=>{
            return this;
        });
    }


}

module.exports = AuthProject;