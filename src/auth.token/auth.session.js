'use strict';

const Bluebird = require('bluebird');

class AuthSession {
    constructor(oaSession){
        this.initVars();
        this.sessionObjectPromise = this.setSessionObject(oaSession);
    }

    initVars(){
        this.id = null;
        this.uuid = null;
        this.access_token = null;
        this.refresh_token = null;
        this.at_expiration_time = null;
        this.rt_expiration_time = null;
        this.issuedBy = null;
        this.scopes = null;
        this.scope_ids = null;


        this.sessionObjectPromise = null;
    }

    setSessionObject(oaSession){
        this.id = oaSession.id;
        this.uuid = oaSession.uuid;
        this.access_token = oaSession.access_token;
        this.refresh_token = oaSession.refresh_token;
        this.at_expiration_time = oaSession.at_expiration_time;
        this.rt_expiration_time = oaSession.rt_expiration_time;
        this.issuedBy = oaSession.issuedBy;

        let oaSessionPopulate = oaSession.populate;
        let populate = Bluebird.promisify(oaSessionPopulate);

        let populatePromise = populate.call(oaSession, 'scopes');

        return populatePromise.then((result)=>{
            this.scopes = result.scopes;
            return this;
        });
    }

    getSession(){
        return this.sessionObjectPromise;
    }

    getBasicSessionDataForResponse(){
        let sessionProps = ['access_token', 'refresh_token', 'expires_in', 'token_type'];
        return this._getSessionForResponse(sessionProps);
    }

    getFullSessionDataForResponse(){
        let sessionProps = ['uuid', 'access_token', 'refresh_token', 'expires_in', 'token_type', 'scopes'];
        return this._getSessionForResponse(sessionProps);
    }

    _getSessionForResponse(props){
        return this.getSession().then((session)=>{
            let scopes = [];

            for(let scope of session.scopes){
                scopes.push(scope.scope_id);
            }
            let sessionObject = {
                uuid: props.indexOf('uuid') > -1 ? session.uuid : undefined,
                access_token: props.indexOf('access_token') > -1 ? session.access_token : undefined,
                refresh_token: props.indexOf('refresh_token') > -1 ? session.refresh_token : undefined,
                expires_in: props.indexOf('expires_in') > -1 ? this._expiresInSeconds(session.at_expiration_time) : undefined,
                token_type: props.indexOf('token_type') > - 1 ? 'bearer' : undefined,
                scopes: props.indexOf('scopes') > - 1 ? scopes : undefined
            };

            return sessionObject;
        });
    }

    _expiresInSeconds(date){
        let now = new Date();
        let nowInMiliSeconds = now.getTime();
        let expirationTime = date.getTime();

        return parseInt((expirationTime - nowInMiliSeconds) / 1000);
    }
}

module.exports = AuthSession;