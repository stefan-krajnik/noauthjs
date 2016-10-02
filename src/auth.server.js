'use strict';

const AuthTokenHandler = require('./auth.token/auth.token.handler');
const AuthServerInitializer = require('./auth.server.initializer');
const AuthProject = require('./auth.project/auth.project');
const AuthError = require('./auth.error');

let singleton = Symbol();
let singletonEnforcer = Symbol();

class AuthServer extends AuthTokenHandler {
    constructor(enforcer){
        super();

        if(enforcer != singletonEnforcer) throw "Cannot construct singleton";
    }

    static get sharedInstance(){
        if(!this[singleton]) {
            this[singleton] = new AuthServer(singletonEnforcer);
        }
        return this[singleton];
    }

    initVars(){
        super.initVars();

        this.dbConn = null;
        this.projects = [];
    }

    initServer(config){
        let serverInitializer = new AuthServerInitializer(config);
        this.dbConn = serverInitializer.getConnection();

        return serverInitializer.serverInitialization();
    }

    getProject(project_id){
        for(let project in this.projects){
            if(project.project_id === project_id){
                return project;
            }
        }

        let newProject = new AuthProject();
        newProject.dbConn = this.dbConn;
        newProject.projectDbQuery = this.dbConn.model('oaProject').findOne({project_id: project_id}).then((project)=>{
            if(!project){
                throw new AuthError(404, 'Project not found', 'Project with project_id '+ project_id +' was not found')
            }

            newProject.project = project;
            return project;
        });

        this.projects.push(newProject);

        return newProject;

    }

}

module.exports = AuthServer.sharedInstance;