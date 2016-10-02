'use strict';

const AuthAbstract = require('./auth.abstract');
const typeChecker = require('./helpers/type.checker');
const Mongoose = require('mongoose');
const Bluebird = require('bluebird');

class AuthServerInitializer extends AuthAbstract {
    constructor(config){
        super(config);

        this._initServer(config);
    }

    initVars(){
        super.initVars();
        this.connection = null;

        this.projects = [];
        this.clients = [];
        this.scopes = [];

        this._serverInitPromise = null;
    }

    _initServer(config){
        let projects = (config && config.projects) || null;

        if(!projects){
            throw new Error('Missing config files!');
        }
        else if(!typeChecker.isArray(projects) && !typeChecker.isObject(projects)){
            throw new Error('Error in config! Invalid \'projects\' !');
        }
        else if(!config.connectionSettings || !typeChecker.isString(config.connectionSettings)){
            throw new Error('Error in config! Missing \'connectionSettings\' !');
        }
        else {
            this._initConnection(config.connectionSettings);
            this._serverInitPromise = this._initProjects(projects);
        }

    }

    _initConnection(connectionSettings){
        Mongoose.Promise = Bluebird;
        this.connection = Mongoose.createConnection(connectionSettings);

        // @todo return createConnection promise

        this.ProjectModel = this.connection.model('oaProject');
        this.ClientModel = this.connection.model('oaClient');
        this.ScopeModel = this.connection.model('oaScope');
    }

    _initProjects(projects){

        if(!typeChecker.isArray(projects)){
            projects = [projects];
        }

        for(let project of projects){
            let newProject = {
                project_id: project.project_id,
                project_name: project.project_name,
                project_description: project.project_description
            };

            this.projects.push(newProject);
        }

        return this._saveProjects().then((savedProjects)=>{
            let promises = [];
            for(let project of projects){
                let projectId = null;

                for(let savedProject of savedProjects){
                    if(savedProject.project_id === project.project_id){
                        projectId = savedProject.id;
                    }
                }

                let promise = this._initClients(project.clients, projectId);
                promises.push(promise);
            }

            return Bluebird.all(promises);
        });
        // return this._saveConfig();

    }

    _initClients(clients, projectId){
        if(!typeChecker.isArray(clients) && !typeChecker.isObject(clients)){
            throw new Error('Error in config! Invalid \'clients\' in project '+ projectId +'!');
        }

        if(!typeChecker.isArray(clients)){
            clients = [clients];
        }

        let scopePromises = [];

        for(let client of clients){
            let newClient = {
                client_id: client.client_id,
                client_secret: client.client_secret,
                client_secret_secret: !!client.client_secret,
                client_name: client.client_name,
                client_description: client.client_description,
                project: projectId,
                scopes: {
                    client_credentials: null,
                    user_credentials: null
                },
                has_refreshing_token: client.refresh_token
            };

            let scopes = {
                client_credentials: client.scopes ? client.scopes.client_credentials : null,
                user_credentials: client.scopes ? client.scopes.user_credentials : null
            };

            let scopePromise = this._initScopes(scopes, projectId).then((resultScopes)=>{
                let clientScopes = [];
                let userScopes = [];

                for(let resultScope of resultScopes){
                    for(let clientScope of scopes.client_credentials){
                        if(clientScope.scope_id === resultScope.scope_id){
                            clientScopes.push(resultScope.id);
                        }
                    }

                    for(let userScope of scopes.user_credentials){
                        if(userScope.scope_id === resultScope.scope_id){
                            userScopes.push(resultScope.id);
                        }
                    }

                }

                newClient.scopes = {
                    client_credentials: clientScopes,
                    user_credentials: userScopes
                };

                this.clients.push(newClient);
                return resultScopes;
            });

            scopePromises.push(scopePromise);
        }

        return Bluebird.all(scopePromises).then((result)=>{
            return this._saveClients();
        });
    }

    _initScopes(scopes, projectId){
        if(!typeChecker.isObject(scopes) && !typeChecker.isArray(scopes)){
            throw new Error('Error in config! Invalid \'scopes\' in project '+ projectId +'!');
        }

        let clientScopes = scopes.client_credentials || [];
        let userScopes = scopes.user_credentials;
        let allScopes = [];

        if(scopes.client_credentials && !typeChecker.isArray(scopes.client_credentials)){
            clientScopes = [scopes.client_credentials];
        }

        if(scopes.user_credentials && !typeChecker.isArray(scopes.user_credentials)){
            userScopes = [scopes.user_credentials];
        }

        for(let uniqueScope of clientScopes.concat(userScopes)){

            let uniqueScopeId = null;

            if(typeChecker.isString(uniqueScope)){
                uniqueScopeId = uniqueScope;
            }
            else if(typeChecker.isObject(uniqueScope)){
                uniqueScopeId = uniqueScope.scope_id;
            }

            let scopeAlreadyInArray = false;
            for(let scope of allScopes){
                let scopeId = null;
                if(typeChecker.isString(scope)){
                    scopeId = scope;
                }
                else if(typeChecker.isObject(scope)){
                    scopeId = scope.scope_id;
                }

                if(scopeId === uniqueScopeId){
                    scopeAlreadyInArray = true;
                }
            }

            if(!scopeAlreadyInArray){
                allScopes.push(uniqueScope);
            }

        }

        let scopesToSave = [];
        for(let scope of allScopes){
            let newScope = {
                scope_id: scope.scope_id,
                scope_name: scope.scope_name,
                scope_description: scope.scope_description,
                project: projectId
            };

            let scopeFound = false;

            for(let scope of this.scopes){
                if(newScope.scope_id === scope.scope_id){
                    scopeFound = true;
                }
            }

            if(!scopeFound){
                scopesToSave.push(newScope);
                this.scopes.push(newScope);
            }

        }

        return this._saveScopes(scopesToSave);
    }

    _getScopeIds(scopes){
        let scopeIds = [];
        if(scopes){
            if(typeChecker.isString(scopes)){
                scopeIds.push(scopes);
            }
            else if(typeChecker.isObject(scopes)){
                if(scopes.scope_id){
                    scopeIds.push(scopes.scope_id);
                }
            }
            else if(typeChecker.isArray(scopes)){
                for(let scope of scopes){
                    if(typeChecker.isString(scope)){
                        scopeIds.push(scope);
                    }
                    else if(typeChecker.isObject(scope)){
                        if(scope.scope_id){
                            scopeIds.push(scope.scope_id);
                        }
                    }
                }
            }
        }

        return scopeIds.length ? scopeIds : null;
    }

    getConnection(){
        return this.connection;
    }

    _saveConfig(){
        return Bluebird.all([
            this._saveProjects(),
            this._saveClients(),
            this._saveScopes()
        ]);
    }

    _saveProjects(){
        let promises = [];
        for(let project of this.projects){
            let promise = this.ProjectModel.findOneAndUpdate({project_id: project.project_id}, project, {new: true, upsert: true, setDefaultsOnInsert: true});
            promises.push(promise);
        }

        return Bluebird.all(promises);
    }

    _saveClients(){
        let promises = [];
        for(let client of this.clients){
            let promise = this.ClientModel.findOneAndUpdate({client_id: client.client_id}, client, {new: true, upsert: true, setDefaultsOnInsert: true});
            promises.push(promise);
        }

        return Bluebird.all(promises);
    }

    _saveScopes(scopes){
        let scopesToSave = scopes || this.scopes;
        let promises = [];
        for(let scope of scopesToSave){
            let promise = this.ScopeModel.findOneAndUpdate({scope_id: scope.scope_id}, scope, {new: true, upsert: true, setDefaultsOnInsert: true});
            promises.push(promise);
        }

        return Bluebird.all(promises);
    }

    serverInitialization(){
        return this._serverInitPromise;
    }
}

module.exports = AuthServerInitializer;