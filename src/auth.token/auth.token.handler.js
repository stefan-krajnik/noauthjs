'use strict';

const AuthAbstract = require('./../auth.abstract');
const crypto = require('./../helpers/crypto');
const typeChecker = require('./../helpers/type.checker');
const helperMethods = require('./../helpers/helper.methods');
const AuthError = require('./../auth.error.js');
const AuthSession = require('./auth.session');
const AuthUser = require('./../auth.user/auth.user');
const request = require('request-promise');

const clientCredentialsGrant = 'client_credentials';
const userCredentialsGrant = 'user_credentials';
const facebookTokenGrant = 'facebook_token';
const googleTokenGrant = 'google_token';
const refreshTokenGrant = 'refresh_token';

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
            this._tokenInfoHandler(req, res);
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
                if(data.grant_type.toLowerCase() === clientCredentialsGrant){
                    this._getClientCredentialsTokenData(req).then((tokenObject)=>{
                        res.json(tokenObject);
                    }).catch((error)=>{
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === userCredentialsGrant){
                    this._getUserCredentialsToken(req).then((tokenObject)=>{
                        res.json(tokenObject);
                    }).catch((error)=>{
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === facebookTokenGrant){
                    this._getSocailTokenFacebook(req).then((tokenObject) => {
                        res.json(tokenObject);
                    }).catch((error) => {
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === googleTokenGrant){
                    this._getSocailTokenGoogle(req).then((tokenObject) => {
                        res.json(tokenObject);
                    }).catch((error) => {
                        if(!(error instanceof AuthError)){
                            error = AuthError.internalServerError()
                        }
                        res.status(error.getStatusCode()).json(error.getJsonObject());
                    });
                }
                else if(data.grant_type.toLowerCase() === refreshTokenGrant){
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
        // else if(req.method.toLocaleLowerCase() === 'get'){
        //
        // }
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
        else {
            res.sendStatus(405);
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
        requestHeaders.authorization = requestHeaders.authorization || requestHeaders["Authorization"];
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

        return clientModel.findOne({client_id: clientId, client_secret: clientSecret}).populate(['project']);
    }

    _getClientCredentialsTokenData(req){
        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            return this._saveSession(null, client, clientCredentialsGrant);
        });
    }

    _getUserCredentialsToken(req){
        let userModel = this.dbConn.model('oaUser');

        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            let projectId = client.project_id;
            let login = (req && req.body && req.body.login) || null;
            let unhashedPassword = (req && req.body && req.body.password) || null;
            let password = AuthUser.createPasswordHash(login, unhashedPassword);

            if(!login || !password) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid user credentials');
            }

            return userModel.findOne({login: login, password: password, project_id: projectId}).then((user)=>{
                if(!user) {
                    throw new AuthError(401, 'Unauhtorized', 'Invalid user credentials');
                }

                return this._saveSession(user, client, userCredentialsGrant);
            });
        });
    }

    _getSocailTokenFacebook(req){
        let userModel = this.dbConn.model('oaUser');

        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            let requestOptions = {
                uri: 'https://graph.facebook.com/me',
                qs: {
                    access_token: req && req.body && req.body.access_token || null,
                    fields: 'first_name,last_name,email,picture.width(9999),about,birthday,gender,languages,locale,link,middle_name,name,relationship_status,timezone,updated_time,work,website'
                },
                json: true
            };

            return request(requestOptions)
                .then((facebookResponse) => {
                    let createPromise = null;
                    return userModel.findOne({'social.facebook.id': facebookResponse && facebookResponse.id || null}).then((user)=> {
                        if (!user) {
                            let projectId = client.project.project_id;

                            createPromise = this.getProject(projectId).ready().then((project)=>{
                                return project.createUser({
                                    scopes: project.default_registration_scopes,
                                    social: {
                                        facebook: facebookResponse
                                    }
                                });
                            });
                        }

                        if(createPromise){
                            return createPromise.then((newUser) => {
                                newUser.scopes = newUser.scopeObjectIds;
                                return this._saveSession(newUser, client, facebookTokenGrant);
                            });
                        }

                        return this._saveSession(user, client, facebookTokenGrant);

                    });
                }).catch((error) => {
                    if(error && error.message && error.message.indexOf('400') > -1){
                        throw new AuthError(400, 'Bad request', 'Invalid access_token');
                    }

                    throw error;
                });


        });
    }

    _getSocailTokenGoogle(req){
        let userModel = this.dbConn.model('oaUser');

        return this._getClientFromRequest(req).then((client)=>{
            if(!client) {
                throw new AuthError(401, 'Unauhtorized', 'Invalid client credentials');
            }

            let requestOptions = {
                uri: 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=',
                qs: {
                    id_token: req && req.body && req.body.id_token || null
                },
                json: true
            };

            return request(requestOptions)
                .then((googleResponse) => {
                    let createPromise = null;
                    return userModel.findOne({'social.google.sub': googleResponse && googleResponse.sub || null}).then((user)=> {
                        if (!user) {
                            let projectId = client.project.project_id;

                            createPromise = this.getProject(projectId).ready().then((project)=>{
                                return project.createUser({
                                    scopes: project.default_registration_scopes,
                                    social: {
                                        google: googleResponse
                                    }
                                });
                            });
                        }

                        if(createPromise){
                            return createPromise.then((newUser) => {
                                newUser.scopes = newUser.scopeObjectIds;
                                return this._saveSession(newUser, client, googleTokenGrant);
                            });
                        }

                        return this._saveSession(user, client, googleTokenGrant);

                    });
                }).catch((error) => {
                    if(error && error.message && error.message.indexOf('400') > -1){
                        throw new AuthError(400, 'Bad request', 'Invalid id_token');
                    }

                    throw error;
                });


        });
    }

    getProject(projectId){}


    _saveSession(user, client, grant){
        let sessionModel = this.dbConn.model('oaSession');
        let sessionScopes = null;
        let issuedBy = null;

        if(user && client){
            sessionScopes = [];
            issuedBy = client.id;
            for(let userScope of user.scopes){
                for(let clientScope of client.scopes.user_credentials){
                    let sessionScopesIds = [];

                    for(let sessionScope of sessionScopes){
                        sessionScopesIds.push(sessionScope.toString());
                    }

                    if(userScope.toString() === clientScope.toString() && sessionScopesIds.indexOf(userScope.toString()) === -1){
                        sessionScopes.push(userScope);
                    }
                }
            }

            sessionScopes = helperMethods.arrayMergeUnique(client.scopes.client_credentials, sessionScopes);
        }
        else if(user && !client){
            sessionScopes = user.scopes;
            issuedBy = user.issuedBy;
        }
        else if(!user && client){
            issuedBy = client.id;
            sessionScopes = client.scopes.client_credentials;
        }

        let session = new sessionModel({
            uuid: user && user.uuid || null,
            access_token: crypto.generateToken(),
            refresh_token: crypto.generateToken(),
            // at_expiration_time: null,
            // rt_expiration_time: null,
            scopes: sessionScopes,
            issuedBy: issuedBy,
            grant: grant
        });

        return session.save().then((session)=>{
            let authSession = new AuthSession(session);
            return authSession.getBasicSessionDataForResponse();
        });
    }

    _getRefreshedToken(req){
        let sessionModel = this.dbConn.model('oaSession');

        let reqHeaders = this._getParsedRequestHeaders(req);
        let refreshToken = (req && req.body && req.body.refresh_token) || null;

        return sessionModel.findOneAndRemove({
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

            return this._saveSession(session, null, session.grant);
        });

    }

    _deleteSession(req){
        let sessionModel = this.dbConn.model('oaSession');

        let reqHeaders = this._getParsedRequestHeaders(req);
        let accessToken = reqHeaders.authorization.bearer;

        return sessionModel.remove({access_token: accessToken});
    }

    getTokenInfo(accessToken){
        let sessionModel = this.dbConn.model('oaSession');

        return sessionModel.findOne({access_token: accessToken, at_expiration_time: {$gt: new Date()}}).then((session)=>{
            if(!session){
                throw new AuthError(401, 'Unauhtorized', 'Invalid access_token');
            }

            let authSession = new AuthSession(session);
            return authSession.getFullSessionDataForResponse();

        });
    }

    _tokenInfoHandler(req, res){
        this._getTokenInfo(req).then((tokenObject)=>{
            res.json(tokenObject);
        }).catch((error)=>{
            if(!(error instanceof AuthError)){
                error = AuthError.internalServerError()
            }
            res.status(error.getStatusCode()).json(error.getJsonObject());
        });
    }

    _getTokenInfo(req){
        let reqHeaders = this._getParsedRequestHeaders(req);
        let accessToken = reqHeaders.authorization.bearer;

        return this.getTokenInfo(accessToken);
    }

}

module.exports = AuthTokenHandler;