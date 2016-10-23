'use strict';

const AuthAbstract = require('./../auth.abstract.js');
const AuthUser = require('./../auth.user/auth.user');
const crypto = require('./../helpers/crypto');

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
            let findScopes = userConfig.scope_ids || this.project.default_registration_scopes;
            return scopeModel.find({scope_id: {$in: findScopes}}, '_id').then((scopeIdsResult)=>{
                let scopeIds = [];

                for(let scopeResult of scopeIdsResult){
                    scopeIds.push(scopeResult.id);
                }

                userConfig = userConfig || {};
                userConfig.project = this.project.id;
                userConfig.password = userConfig.password ? crypto.createSHA512(userConfig.password, (userConfig.login || null)) : null;
                userConfig.scopes = scopeIds;
                userConfig.social = userConfig.social;

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
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.changeLogin(newLogin);
        });
    }

    changeUserPassword(uuid, newPassword){
        return this.projectDbQuery.then(()=>{
            return this.getUserByUuid(uuid).then((userResult)=>{
                if(!userResult){
                    return null;
                }
                return userResult.changePassword(newPassword);
            });
        });

    }

    addUserScopes(uuid, scope_ids){
        return this.projectDbQuery.then(()=>{
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.addScopes(scope_ids);
        });
    }

    removeUserScopes(uuid, scope_ids){
        return this.projectDbQuery.then(()=>{
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.removeScopes(scope_ids);
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

    updateUserSocailFacebook(uuid, facebook_access_token){
        return this.projectDbQuery.then(()=>{
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.updateSocialFacebook(facebook_access_token);
        });
    }

    updateUserSocailGoogle(uuid, google_id_token){
        return this.projectDbQuery.then(()=>{
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.updateSocialGoogle(google_id_token);
        });
    }

    updateUserPasswordLogin(uuid, newLogin, newPassword){
        return this.projectDbQuery.then(()=>{
            let user = new AuthUser({uuid: uuid, project: this.project});
            user.dbConn = this.dbConn;
            return user.updatePasswordLogin(newLogin, newPassword);
        });
    }

}

module.exports = AuthUserControllerAbstract;