'use strict';

const AuthAbstract = require('./../auth.abstract');
const crypto = require('./../helpers/crypto');
const typeChecker = require('./../helpers/type.checker');
const helperMethods = require('./../helpers/helper.methods');
const AuthError = require('./../auth.error.js');
const AuthSession = require('./auth.session');
const AuthUser = require('./../auth.user/auth.user');

class AuthTokenHandler extends AuthAbstract {
    constructor(){
        super();


    }

    initVars(){
        super.initVars();
    }

    get accessTokenHandler(){
        return (req, res)=>{
            this._accessTokenHandler(req, res);
        };
    }

    get tokenInfo(){
        return (req, res)=>{
            this.getTokenInfo(req, res);
        };
    }

    authenticateScopes(scopes){
        return (req, res, next)=>{
            this._authenticateScopes(scopes, req, res, next);
        };
    }

    _authenticateScopes(scopes, req, res, next){
        let error = null;
        let sessionModel = this.dbConn.model('oaSession');
        let reqHeaders = this._getParsedRequestHeaders(req);
        let accessToken = reqHeaders.authorization.bearer;

        if(!typeChecker.isArray(scopes) && !typeChecker.isString(scopes)){
            error = new AuthError(500, 'Wrong scopes', 'input for "authenticateScopes(scopes)" has to be a array or a string');
        }
        else if(typeChecker.isString(scopes)){
            scopes = [scopes];
        }

        return sessionModel.findOne({access_token: accessToken, at_expiration_time: {$gt: new Date()}}).populate('scopes').then((session)=>{
            if(!session){
                error = new AuthError(401, 'Unauhtorized', 'Invalid access_token');
            }

            if(!error){
                let tokenScopes = [];

                for(let scope of session.scopes){
                    tokenScopes.push(scope.scope_id);
                }

                let tokenHasScope = false;

                for(let neededScope of scopes){
                    if(tokenScopes.indexOf(neededScope) > -1){
                        tokenHasScope = true;
                        break;
                    }
                }

                if(!tokenHasScope){
                    error = new AuthError(403, 'Forbidden', 'Required scope missing');
                }
            }

            if(error){
                res.status(error.getStatusCode()).json(error.getJsonObject());
            }
            else{
                next(error);
            }

        }).catch((sessionError)=>{
            if(!error){
                error = AuthError.internalServerError();
            }
            res.status(error.getStatusCode()).json(error.getJsonObject());
        });


    }

    _accessTokenHandler(req, res){
        if(req.method.toLocaleLowerCase() === 'post'){
            let data = req.body;

            if(data.grant_type){
                if(data.grant_type.toLowerCase() === 'client_credentials'){
                    this._getClientCredentialsTokenData(req).then((tokenObject)=>{
                        res.json(tokenObject);
                    }).catch((error)=>{
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === 'user_credentials'){
                    this._getUserCredentialsToken(req).then((tokenObject)=>{
                        res.json(tokenObject);
                    }).catch((error)=>{
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === 'refresh_token'){
                    this._getRefreshedToken(req).then((tokenObject)=>{
                        res.json(tokenObject);
                    }).catch((error)=>{
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
            }

        }
        else if(req.method.toLocaleLowerCase() === 'get'){

        }
        else if(req.method.toLocaleLowerCase() === 'delete'){
            this._deleteSession(req).then(()=>{
                res.json({});
            }).catch((error)=>{
                if(!(error instanceof AuthError)){
                    error = AuthError.internalServerError()
                }
                res.status(error.getStatusCode()).json(error.getJsonObject());
            });
        }

    }

    _getParsedRequestHeaders(req){
        let headers = {
            authorization: {
                basic: {
                    client_id: null,
                    client_secret: null
                },
                bearer: null
            }
        };

        let requestHeaders = req && typeChecker.isOfTypeObject(req) ? req.headers : null;
        let authorization = (requestHeaders && requestHeaders.authorization && typeChecker.isString(requestHeaders.authorization)) ? requestHeaders.authorization : null;
        let authParts = authorization && authorization.toLowerCase().indexOf(' ') ? authorization.split(' ') : null;
        let authType = (authParts && authParts[0] && typeChecker.isString(authParts[0]) && authParts[0].toLowerCase()) || null;
        let authToken = (authParts && authParts[1] && typeChecker.isString(authParts[1])) ? authParts[1] : null;

        if(authType === 'basic'){
            let basicAuthorization = authToken || null;
            let basicAuthorizationDecodedBuffer = basicAuthorization ? Buffer.from(basicAuthorization, 'base64') : null;
            let basicAuthorizationDecodedString = basicAuthorization ? basicAuthorizationDecodedBuffer.toString() : null;
            let authParts = basicAuthorizationDecodedString ? basicAuthorizationDecodedString.split(':') : null;
            let clientId = authParts.length ? authParts[0] : null;
            let clientSecret = authParts.length ? authParts[1] : null;

            headers.authorization.basic.client_id = clientId;
            headers.authorization.basic.client_secret = clientSecret;

        }
        else if(authType === 'bearer') {
            let bearerToken = authToken || null;
            headers.authorization.bearer = bearerToken;
        }

        return headers;
    }

    _getClientFromRequest(req){
        let clientModel = this.dbConn.model('oaClient');
        let clientId = this._getParsedRequestHeaders(req).authorization.basic.client_id;
        let clientSecret = this._getParsedRequestHeaders(req).authorization.basic.client_secret;

        return clientModel.findOne({client_id: clientId, client_secret: clientSecret})
    }

    _getClientCredentialsTokenData(req){
        let sessionModel = this.dbConn.model('oaSession');

        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            let session = new sessionModel({
                // uuid: null,
                access_token: crypto.generateToken(),
                refresh_token: crypto.generateToken(),
                // at_expiration_time: null,
                // rt_expiration_time: null,
                scopes: client.scopes.client_credentials
            });

            return session.save().then((session)=>{
                let authSession = new AuthSession(session);
                return authSession.getBasicSessionDataForResponse();
            });
        });
    }

    _getUserCredentialsToken(req){
        let sessionModel = this.dbConn.model('oaSession');
        let userModel = this.dbConn.model('oaUser');

        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            let projectId = client.project_id;
            let login = (req && req.body && req.body.login) || null;
            let unhashedPassword = (req && req.body && req.body.password) || null;
            let password = AuthUser.createPasswordHash(login, unhashedPassword);

            return userModel.findOne({login: login, password: password, project_id: projectId}).then((user)=>{
                if(!user) {
                    throw new AuthError(401, 'Unauhtorized', 'Invalid user credentials');
                }

                let session = new sessionModel({
                    uuid: user.uuid,
                    access_token: crypto.generateToken(),
                    refresh_token: crypto.generateToken(),
                    // at_expiration_time: null,
                    // rt_expiration_time: null,
                    scopes: helperMethods.arrayMergeUnique(client.scopes.client_credentials, user.scopes)
                });

                return session.save().then((session)=>{
                    let authSession = new AuthSession(session);
                    return authSession.getBasicSessionDataForResponse();
                });
            });
        });
    }

    _getRefreshedToken(req){
        let sessionModel = this.dbConn.model('oaSession');

        let reqHeaders = this._getParsedRequestHeaders(req);
        let refreshToken = (req && req.body && req.body.refresh_token) || null;
        let accessToken = reqHeaders.authorization.bearer;

        return sessionModel.findOneAndRemove({
            access_token: accessToken,
            refresh_token: refreshToken,
            $or: [
                {at_expiration_time: {$gt: new Date()}},
                {at_expiration_time: null}
            ]
        }).then((session)=>{
            if(!session){
                sessionModel.remove({access_token: accessToken}, ()=>{});
                sessionModel.remove({refresh_token: refreshToken}, ()=>{});

                throw new AuthError(401, 'Unauhtorized', 'Invalid tokens');
            }

            let newSession = new sessionModel({
                uuid: session.uuid,
                access_token: crypto.generateToken(),
                refresh_token: crypto.generateToken(),
                // at_expiration_time: null,
                // rt_expiration_time: null,
                scopes: session.scopes
            });

            return newSession.save().then((savedSession)=>{
                let authSession = new AuthSession(savedSession);
                return authSession.getBasicSessionDataForResponse();
            });
        });

    }

    _deleteSession(req){
        let sessionModel = this.dbConn.model('oaSession');

        let reqHeaders = this._getParsedRequestHeaders(req);
        let accessToken = reqHeaders.authorization.bearer;

        return sessionModel.remove({access_token: accessToken});
    }


    getTokenInfo(req, res){
        this._getTokenInfo(req, res).then((tokenObject)=>{
            res.json(tokenObject);
        }).catch((error)=>{
            if(!(error instanceof AuthError)){
                error = AuthError.internalServerError()
            }
            res.status(error.getStatusCode()).json(error.getJsonObject());
        });
    }

    _getTokenInfo(req, res){
        let sessionModel = this.dbConn.model('oaSession');

        let reqHeaders = this._getParsedRequestHeaders(req);
        let accessToken = reqHeaders.authorization.bearer;

        return sessionModel.findOne({access_token: accessToken, at_expiration_time: {$gt: new Date()}}).then((session)=>{
            if(!session){
                throw new AuthError(401, 'Unauhtorized', 'Invalid access_token');
            }

            let authSession = new AuthSession(session);
            return authSession.getFullSessionDataForResponse();

        });
    }

}

module.exports = AuthTokenHandler;