'use strict';

const AuthAbstract = require('./../auth.abstract.js');
const crypto = require('./../helpers/crypto');
const Bluebird = require('bluebird');
const typeChecker = require('./../helpers/type.checker');
const mongoose = require('mongoose');

class AuthUser extends AuthAbstract{
    constructor(user){
        super();

        this._initUser(user);
    }

    initVars(){
        super.initVars();

        this.dbConn = null;
        this.uuid = null;
        this.login = null;
        this.password = null;
        this.project = null;
        this.scopes = null;
    }

    _initUser(user){
        this.uuid = user.uuid || null;
        this.login = user.login || null;
        this.password = user.password || null;
        this.project = this._getProjectId(user.project);
        this.scopes = this._getScopeIds(user.scopes);
    }

    create(){
        let userObj = {
            login: this.login,
            password: this.password,
            project: this.project,
            scopes: this.scopes
        };

        let userModel = this.dbConn.model('oaUser');
        let user = new userModel(userObj);

        return this._incrementUuid().then((result)=>{
            user.uuid = result.max_id;
            return user.save().then((createdUser)=>{
                let populate = Bluebird.promisify(user.populate);

                let populatePromise = populate.call(user, ['scopes', 'project']);

                return populatePromise.then((populated)=>{
                    createdUser.scopes = populated.scopes;
                    this._initUser(createdUser);
                    return this;
                });
            });
        });
    }

    updateUser(){

    }

    deleteUser(){

    }

    changeUserLogin(){

    }

    changeUserPassword(){

    }

    addUserScopes(){

    }

    removeUserScopes(){

    }

    _getLastUuid(){
        let autoIncrementModel = this.dbConn.model('idIncementer');
        return autoIncrementModel.findOne().then((result)=>{
            return result;
        });
    }

    _incrementUuid(){
        let autoIncrementModel = this.dbConn.model('idIncementer');
        return autoIncrementModel.findOneAndUpdate(
            {id_name: 'user'},
            {
                $set: {id_name: 'user'},
                $inc: {max_id: 1}
            },
            {new: true, upsert: true}
        ).then((result)=>{
            return result;
        });
    }

    _getScopeIds(scopes){
        let newScopes = [];
        for(let scope of scopes){
            if(typeChecker.isString(scope)){
                newScopes.push(scope);
            }
            else if(scope instanceof mongoose.Model){
                newScopes.push(scope.scope_id);
            }
        }
        return newScopes.length ? newScopes : null;
    }

    _getProjectId(project){
        if(typeChecker.isString(project)){
            return project;
        }
        else if(project instanceof mongoose.Model){
            return project.project_id;
        }

        return null;
    }

    static createPasswordHash(login, password){
        return crypto.createSHA512(password, login);
    }

}

module.exports = AuthUser;