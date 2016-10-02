'use strict';

const AuthAbstract = require('./../auth.abstract.js');
const AuthUser = require('./../auth.user/auth.user');
const crypto = require('./../helpers/crypto');
const typeChecker = require('./../helpers/type.checker');

class AuthUserControllerAbstract extends AuthAbstract{
    constructor(){
        super();

    }

    initVars(){
        super.initVars();

        this.dbConn = null;
    }

    createUser(userConfig){
        return this.projectDbQuery.then(()=>{

            let scopeModel = this.dbConn.model('oaScope');
            return scopeModel.find({scope_id: {$in: userConfig.scope_ids}}, '_id').then((scopeIdsResult)=>{
                let scopeIds = [];

                for(let scopeResult of scopeIdsResult){
                    scopeIds.push(scopeResult.id);
                }

                userConfig = userConfig || {};
                userConfig.project = this.project.id;
                userConfig.password = userConfig.password ? crypto.createSHA512(userConfig.password, (userConfig.login || null)) : null;
                userConfig.scopes = scopeIds;

                let user = new AuthUser(userConfig);
                user.dbConn = this.dbConn;

                return user.create();
            });
        });

    }

    getUserByUuid(uuid){
        return this.projectDbQuery.then(()=>{
            let userModel = this.dbConn.model('oaUser');
            return userModel.findOne({uuid: uuid, project: this.project.id}).populate(['scopes', 'project']).then((userResult)=>{
                let user = null;

                if(userResult){
                    let tokenScopes = [];

                    for(let scope of userResult.scopes){
                        tokenScopes.push(scope.scope_id);
                    }

                    userResult.scopes = tokenScopes;

                    user = new AuthUser(userResult);
                    user.dbConn = this.dbConn;
                }

                return user;
            });
        });
    }

    getUserByLoginAndPassword(login, password){
        return this.projectDbQuery.then(()=>{
            let pwdHash = AuthUser.createPasswordHash(login, password);

            let userModel = this.dbConn.model('oaUser');
            return userModel.findOne({login: login, password: pwdHash, project: this.project.id}).populate(['scopes', 'project']).then((userResult)=>{
                let user = null;

                if(userResult){
                    let tokenScopes = [];

                    for(let scope of userResult.scopes){
                        tokenScopes.push(scope.scope_id);
                    }

                    userResult.scopes = tokenScopes;

                    user = new AuthUser(userResult);
                    user.dbConn = this.dbConn;
                }

                return user;
            });
        });
    }

    changeUserLogin(uuid, newLogin){
        return this.projectDbQuery.then(()=>{
            let userModel = this.dbConn.model('oaUser');

            return userModel.findOneAndUpdate({uuid: uuid, project: this.project.id}, {login: newLogin}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                let user = null;

                if(userResult){
                    let tokenScopes = [];

                    for(let scope of userResult.scopes){
                        tokenScopes.push(scope.scope_id);
                    }

                    userResult.scopes = tokenScopes;

                    user = new AuthUser(userResult);
                    user.dbConn = this.dbConn;
                }

                return user;
            });
        });
    }

    changeUserPassword(uuid, newPassword){
        return this.projectDbQuery.then(()=>{
            return this.getUserByUuid(uuid).then((userResult)=>{
                if(!userResult){
                    return null;
                }

                let pwdHash = AuthUser.createPasswordHash(userResult.login, newPassword);
                let userModel = this.dbConn.model('oaUser');

                return userModel.findOneAndUpdate({uuid: uuid, project: this.project.id}, {password: pwdHash}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                    let user = null;

                    if(userResult){
                        let tokenScopes = [];

                        for(let scope of userResult.scopes){
                            tokenScopes.push(scope.scope_id);
                        }

                        userResult.scopes = tokenScopes;

                        user = new AuthUser(userResult);
                        user.dbConn = this.dbConn;
                    }

                    return user;
                });
            });
        });

    }

    addUserScopes(uuid, scope_ids){
        return this.projectDbQuery.then(()=>{
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

                return userModel.findOneAndUpdate({uuid: uuid, project: this.project.id}, {$addToSet: {scopes: { $each: scopeIds }}}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                    let user = null;

                    if(userResult){
                        let tokenScopes = [];

                        for(let scope of userResult.scopes){
                            tokenScopes.push(scope.scope_id);
                        }

                        userResult.scopes = tokenScopes;

                        user = new AuthUser(userResult);
                        user.dbConn = this.dbConn;
                    }

                    return user;
                });

            });
        });
    }

    removeUserScopes(uuid, scope_ids){
        return this.projectDbQuery.then(()=>{
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

                return userModel.findOneAndUpdate({uuid: uuid, project: this.project.id}, {$pull: {scopes: { $in: scopeIds }}}, {new: true}).populate(['scopes', 'project']).then((userResult)=>{
                    let user = null;

                    if(userResult){
                        let tokenScopes = [];

                        for(let scope of userResult.scopes){
                            tokenScopes.push(scope.scope_id);
                        }

                        userResult.scopes = tokenScopes;

                        user = new AuthUser(userResult);
                        user.dbConn = this.dbConn;
                    }

                    return user;
                });

            });
        });
    }

    deleteUserByUuid(uuid){
        return this.projectDbQuery.then(()=>{
            let userModel = this.dbConn.model('oaUser');
            return userModel.findOneAndRemove({uuid: uuid, project: this.project.id}).then((removedUser)=>{
                return !!removedUser;
            });
        });
    }

}

module.exports = AuthUserControllerAbstract;