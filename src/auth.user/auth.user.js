'use strict';

const AuthAbstract = require('./../auth.abstract.js');
const crypto = require('./../helpers/crypto');
const Bluebird = require('bluebird');
const typeChecker = require('./../helpers/type.checker');
const mongoose = require('mongoose');

class AuthUser {
    constructor(user){
        this._initUser(user);
    }

    initVars(){
        this.dbConn = null;
        this.uuid = null;
        this.login = null;
        this.password = null;
        this.project = null;
        this._projectMongoId = null;
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
        let userModel = this.dbConn.model('oaUser');
        return userModel.findOneAndRemove({uuid: this.uuid, project: this._projectMongoId}).then((removedUser)=>{
            return !!removedUser;
        });
    }

    changeLogin(newLogin){
        let userModel = this.dbConn.model('oaUser');

        return userModel.findOneAndUpdate({uuid: this.uuid, project: this._projectMongoId}, {login: newLogin}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
            if(userResult){
                let tokenScopes = [];

                for(let scope of userResult.scopes){
                    tokenScopes.push(scope.scope_id);
                }

                userResult.scopes = tokenScopes;

                this._initUser(userResult);
                return this;
            }

            return null;
        });
    }

    changePassword(newPassword){
        let pwdHash = AuthUser.createPasswordHash(this.login, newPassword);
        let userModel = this.dbConn.model('oaUser');

        return userModel.findOneAndUpdate({uuid: this.uuid, project: this._projectMongoId}, {password: pwdHash}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
            if(userResult){
                let tokenScopes = [];

                for(let scope of userResult.scopes){
                    tokenScopes.push(scope.scope_id);
                }

                userResult.scopes = tokenScopes;

                this._initUser(userResult);

                return this;
            }

            return null;
        });
    }

    addScopes(scope_ids){
        if(!typeChecker.isArray(scope_ids)){
            scope_ids = [scope_ids];
        }

        let userModel = this.dbConn.model('oaUser');
        let scopeModel = this.dbConn.model('oaScope');

        return scopeModel.find({scope_id: {$in: scope_ids}}, '_id').then((scopeIdsResult)=>{
            let scopeIds = [];

            for(let scopeResult of scopeIdsResult){
                scopeIds.push(scopeResult.id);
            }

            return userModel.findOneAndUpdate({uuid: this.uuid, project: this._projectMongoId}, {$addToSet: {scopes: { $each: scopeIds }}}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                if(userResult){
                    let tokenScopes = [];

                    for(let scope of userResult.scopes){
                        tokenScopes.push(scope.scope_id);
                    }

                    userResult.scopes = tokenScopes;

                    this._initUser(userResult);
                    return this;
                }

                return null;
            });

        });
    }

    removeScopes(scope_ids){
        if(!typeChecker.isArray(scope_ids)){
            scope_ids = [scope_ids];
        }

        let userModel = this.dbConn.model('oaUser');
        let scopeModel = this.dbConn.model('oaScope');

        return scopeModel.find({scope_id: {$in: scope_ids}}, '_id').then((scopeIdsResult)=>{
            let scopeIds = [];

            for(let scopeResult of scopeIdsResult){
                scopeIds.push(scopeResult.id);
            }

            return userModel.findOneAndUpdate({uuid: this.uuid, project: this._projectMongoId}, {$pull: {scopes: { $in: scopeIds }}}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                if(userResult){
                    let tokenScopes = [];

                    for(let scope of userResult.scopes){
                        tokenScopes.push(scope.scope_id);
                    }

                    userResult.scopes = tokenScopes;

                    this._initUser(userResult);
                    return this;
                }

                return null;
            });

        });
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

    _getScopeIds(scopes = []){
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
            this._projectMongoId = project.id;
            return project.project_id;
        }

        return null;
    }

    static createPasswordHash(login, password){
        return crypto.createSHA512(password, login);
    }

}

module.exports = AuthUser;