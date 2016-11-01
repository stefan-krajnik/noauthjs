'use strict';

const crypto = require('./../helpers/crypto');
const Bluebird = require('bluebird');
const typeChecker = require('./../helpers/type.checker');
const helperMethods = require('./../helpers/helper.methods');
const mongoose = require('mongoose');
const request = require('request-promise');
const AuthError = require('./../auth.error.js');

class AuthUser {
    constructor(user){
        this.initVars();

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
        this.social = null;

        this.scopeObjectIds = [];
        this.projectObjectId = null;
    }

    _initUser(user){
        this.uuid = user.uuid || null;
        this.login = user.login || null;
        this.password = user.password || null;
        this.project = this._getProjectId(user.project);
        this.scopes = this._getScopeIds(user.scopes);
        this.social = user.social || null;
    }

    create() {
        let userObj = {
            login: this.login,
            password: this.password,
            project: this.project,
            scopes: this.scopes,
            social: this.social
        };

        let userModel = this.dbConn.model('oaUser');
        let user = new userModel(userObj);

        return userModel.findOne({login: this.login}).then((userResult) => {
            if(!userResult || !this.login){
                return this._incrementUuid().then((result)=>{
                    user.uuid = result.max_id;
                    return user.save().then((createdUser)=>{
                        let populate = Bluebird.promisify(user.populate);

                        let populatePromise = populate.call(user, ['scopes', 'project']);

                        return populatePromise.then((populated)=>{

                            for(let scopeObjectId of populated.scopes){
                                this.scopeObjectIds.push(scopeObjectId._id);
                            }

                            this.projectObjectId = populated.project._id;

                            createdUser.scopes = populated.scopes;
                            this._initUser(createdUser);
                            return this;
                        });
                    });
                });
            }

            throw new AuthError(409, 'Login already exists');
        });

    }

    _updateUser(updateObj){
        let userModel = this.dbConn.model('oaUser');

        return userModel.findOneAndUpdate({uuid: this.uuid, project: this._projectMongoId}, updateObj, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
            if(userResult){
                let tokenScopes = [];

                for(let scope of userResult.scopes){
                    tokenScopes.push(scope.scope_id);
                }

                for(let scopeObjectId of userResult.scopes){
                    this.scopeObjectIds.push(scopeObjectId._id);
                }

                this.projectObjectId = userResult.project._id;

                userResult.scopes = tokenScopes;

                this._initUser(userResult);
                return this;
            }

            return null;
        });
    }

    deleteUser(){
        let userModel = this.dbConn.model('oaUser');
        return userModel.findOneAndRemove({uuid: this.uuid, project: this._projectMongoId}).then((removedUser)=>{
            return !!removedUser;
        });
    }

    changeLogin(newLogin){
        return this._updateUser({login: newLogin});
    }

    changePassword(newPassword){
        let pwdHash = AuthUser.createPasswordHash(this.login, newPassword);

        return this._updateUser({password: pwdHash});
    }

    addScopes(scope_ids, updateCurrentSessions = true){
        if(!typeChecker.isArray(scope_ids)){
            scope_ids = [scope_ids];
        }

        let scopeModel = this.dbConn.model('oaScope');

        return scopeModel.find({scope_id: {$in: scope_ids}}, '_id').then((scopeIdsResult)=>{
            let scopeIds = [];

            for(let scopeResult of scopeIdsResult){
                scopeIds.push(scopeResult.id);
            }

            return this._updateUser({$addToSet: {scopes: { $each: scopeIds }}}).then((updatedUser) => {
                if(updatedUser){
                    return this._updateCurrentTokenSessions(updatedUser.scopeObjectIds).then((updatedSessions) => {
                        return updatedUser;
                    });
                }

                return updatedUser;
            });
        });
    }

    removeScopes(scope_ids){
        if(!typeChecker.isArray(scope_ids)){
            scope_ids = [scope_ids];
        }

        let scopeModel = this.dbConn.model('oaScope');

        return scopeModel.find({scope_id: {$in: scope_ids}}, '_id').then((scopeIdsResult)=>{
            let scopeIds = [];

            for(let scopeResult of scopeIdsResult){
                scopeIds.push(scopeResult.id);
            }

            return this._updateUser({$pull: {scopes: { $in: scopeIds }}}).then((updatedUser) => {
                if(updatedUser){
                    return this._updateCurrentTokenSessions(updatedUser.scopeObjectIds).then((updatedSessions) => {
                        return updatedUser;
                    });
                }

                return updatedUser;
            });
        });
    }

    _updateCurrentTokenSessions(scopes){
        let sessionModel = this.dbConn.model('oaSession');

        return sessionModel.find({uuid: this.uuid}).populate(['issuedBy']).then((sessions) => {
            let updatePromises = [];

            for(let session of sessions){
                let sessionScopes = helperMethods.arrayMergeUnique(session.issuedBy.scopes.client_credentials, scopes);

                let updateSession = session.update({
                    scopes: sessionScopes
                }, {new: true}).then((sessionUpdateResult) => { return sessionUpdateResult });

                updatePromises.push(updateSession);
            }

            if(updatePromises.length){
                return Bluebird.all(updatePromises).then((allResults) => { return allResults; })
            }

            return sessions;
        });

    }

    updateSocialFacebook(facebook_access_token){
        let requestOptions = {
            uri: 'https://graph.facebook.com/me',
            qs: {
                access_token: facebook_access_token,
                fields: 'first_name,last_name,email,picture.width(9999),about,birthday,gender,languages,locale,link,middle_name,name,relationship_status,timezone,updated_time,work,website'
            },
            json: true
        };

        return request(requestOptions)
            .then((facebookResponse) => {
                let userModel = this.dbConn.model('oaUser');

                return userModel.findOne({'social.facebook.id': facebookResponse.id}).then((userResult) => {
                    if(userResult){
                        throw new AuthError(409, 'Facebook account is already registered with different user');
                    }

                    return this._updateUser({ 'social.facebook': facebookResponse });
                });

            }).catch((error) => {
                if(error && error.message && error.message.indexOf('400') > -1){
                    throw new AuthError(400, 'Bad request', 'Invalid access_token');
                }

                throw new AuthError(error.status || 500, error.message, error);
            });
    }

    updateSocialGoogle(google_id_token){
        let requestOptions = {
            uri: 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=',
            qs: {
                id_token: google_id_token
            },
            json: true
        };

        return request(requestOptions)
            .then((googleResponse) => {
                let userModel = this.dbConn.model('oaUser');

                return userModel.findOne({'social.google.sub': googleResponse.sub}).then((userResult) => {

                    if(userResult){
                        throw new AuthError(409, 'Google account is already registered with different user');
                    }

                    return this._updateUser({ 'social.google': googleResponse });
                });
            }).catch((error) => {
                if(error && error.message && error.message.indexOf('400') > -1){
                    throw new AuthError(400, 'Bad request', 'Invalid id_token');
                }

                throw new AuthError(error.status || 500, error.message, error);
            });
    }

    updatePasswordLogin(newLogin, newPassword){
        let pwdHash = AuthUser.createPasswordHash(newLogin, newPassword);

        return userModel.findOne({login: newLogin}).then((userResult) => {
            if(userResult){
                throw new AuthError(409, 'Login already exists');
            }

            return this._updateUser({login: newLogin, password: pwdHash});
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

    _getScopeIds(scopes){
        scopes = scopes || [];
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
