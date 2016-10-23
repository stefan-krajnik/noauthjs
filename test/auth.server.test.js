'use strict';

const expect = require('chai').expect;
const Mongoose = require('mongoose');
const authServer = require('./../src/app.js');
const serverConfig = require('./auth.config');

const facebookAccessToken = 'facebook_token';
const googleIdToken = 'google_id_token';

Mongoose.connect('mongodb://localhost/noauthjs-test',function(){
    /* Drop the DB */
    Mongoose.connection.db.dropDatabase();
});

describe('AuthServer', function() {
    this.timeout(5000);
    let project = null;

    it('initServer(serverConfig)', () => {
        return authServer.initServer(serverConfig).then((result)=>{
            expect(result).to.exist;
            project = authServer.getProject('someProject'); // project_id
        });
    });



    it('project.createUser', () => {
        return project.createUser({
            login: 'someUser',
            password: 'somePassword'//,
            //scope_ids: ['loggedin']
        }).then((result)=>{
            expect(result).to.exist;
        });
    });

    it('project.getUserByUuid', () => {
        return project.getUserByUuid(1).then((user)=>{
            expect(user).to.exist;
            expect(user.login).to.equal('someUser');
        });
    });

    it('project.getUserByLoginAndPassword', () => {
        return project.getUserByLoginAndPassword('someUser', 'somePassword').then((user)=>{
            expect(user).to.exist;
            expect(user.login).to.equal('someUser');
        });
    });

    it('project.changeUserLogin', () => {
        return project.changeUserLogin(1, 'someUserEdit').then((user)=>{
            expect(user).to.exist;
            expect(user.login).to.equal('someUserEdit');

            return project.changeUserLogin(1, 'someUser').then(()=>{});

        });
    });

    it('project.changeUserPassword', () => {
        return project.getUserByUuid(1).then((usr)=>{
            let pwd = usr.password;

            return project.changeUserPassword(1, 'newPwd').then((user)=>{
                expect(user).to.exist;
                expect(user.password).to.not.equal(pwd);

                return project.changeUserPassword(1, 'somePassword').then(()=>{});

            });
        });

    });

    it('project.addUserScopes', () => {
        return project.getUserByUuid(1).then((usr)=>{
            let scopes = usr.scopes;

            return project.addUserScopes(1, [serverConfig.scopes.premiumScope.scope_id]).then((user)=>{
                expect(user).to.exist;
                expect(user.scopes).to.have.length.above(scopes.length);
            });
        });

    });

    it('project.removeUserScopes', () => {
        return project.getUserByUuid(1).then((usr)=>{
            let scopes = usr.scopes;

            return project.removeUserScopes(1, [serverConfig.scopes.premiumScope.scope_id]).then((user)=>{
                expect(user).to.exist;
                expect(user.scopes).to.have.length.below(scopes.length);
            });
        });

    });

    it('project.deleteUserByUuid', () => {
        return project.createUser({
            login: 'someUserNew',
            password: 'somePasswordNew'
        }).then((result)=>{

            return project.deleteUserByUuid(2).then((userDeleted) => {
                expect(userDeleted).to.equal(true);

                return project.deleteUserByUuid(3).then((anotherUserDeleted) => {
                    expect(anotherUserDeleted).to.equal(false);
                });
            });

        });
    });

    it('project.updateUserSocailFacebook', () => {
        return project.getUserByUuid(1).then((usr)=>{
            return project.updateUserSocailFacebook(1, facebookAccessToken).then((user)=>{
                expect(user).to.exist;
                expect(user.social.facebook).to.exist;
            });
        });
    });

    it('project.updateUserSocailGoogle', () => {
        return project.getUserByUuid(1).then((usr)=>{
            return project.updateUserSocailGoogle(1, googleIdToken).then((user)=>{
                expect(user).to.exist;
                expect(user.social.google).to.exist;
            });
        });
    });

    it('project.updateUserPasswordLogin', () => {
        return project.getUserByUuid(1).then((usr)=>{
            let pwd = usr.password;

            return project.updateUserPasswordLogin(1, 'someUserEdit', 'somePasswordEdit').then((user)=>{
                expect(user).to.exist;
                expect(user.login).to.equal('someUserEdit');
                expect(user.password).to.not.equal(pwd);

                return project.updateUserPasswordLogin(1, 'someUser', 'somePassword').then(()=>{
                    return project.getUserByLoginAndPassword('someUser', 'somePassword').then((user)=>{
                        expect(user).to.exist;
                        expect(user.login).to.equal('someUser');
                    });
                });
            });
        });
    });

    let request = {
        method: 'POST',
        body: {
            "grant_type": "client_credentials", // client_credentials | user_credentials | refresh_token
            "login": "someLogin", // only if grant_type == user_credentials
            "password": "somePassword", // only if grant_type == user_credentials
            "refresh_token": "someRefreshToken"
        },
        headers: {
            "Content-Type": "application/json",
            "Authorization": {
                // basic: {
                //     client_id: null,
                //     client_secret: null
                // },
                // bearer: null
            }
        }
    };

    let response = {};


    it('authServer.accessTokenHandler client_credentials 401', (done) => {
        let req = JSON.parse(JSON.stringify(request));
        let res = JSON.parse(JSON.stringify(response));
        req.body = {};
        req.body["grant_type"] = 'client_credentials';

        res.json = (json)=>{};

        res.status = (res) => {
            expect(res).to.equal(401);
            done();
            return {
                json: ()=>{}
            }
        };

        res.json = (json)=>{
            done(json);
        };

        authServer.accessTokenHandler(req, res);

    });

    it('authServer.accessTokenHandler client_credentials 200', () => {
        return authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'client_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            res.status = () => {
                return {
                    json: (json)=>{
                        expect(json.access_token).to.exist;
                    }
                }

            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;
            };

            authServer.accessTokenHandler(req, res);
        });


    });

    it('authServer.accessTokenHandler user_credentials 401', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePasswordWrong';
            res.status = (res) => {
                expect(res).to.equal(401);
                return {
                    json: (json)=>{
                        done();
                    }
                }

            };

            authServer.accessTokenHandler(req, res);
        });


    });

    it('authServer.accessTokenHandler user_credentials 200', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePassword';

            res.status = (status)=>{
                expect(status).to.not.exist;
                done();
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;
                done();
            };

            authServer.accessTokenHandler(req, res);
        });
    });

    it('authServer.accessTokenHandler facebook_token 200', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'facebook_token';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.access_token = facebookAccessToken;

            res.status = (status)=>{
                expect(status).to.not.exist;
                done();
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;
                done();
            };

            authServer.accessTokenHandler(req, res);
        });

    });

    it('authServer.accessTokenHandler google_token 200', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'google_token';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.id_token = googleIdToken;

            res.status = (status)=>{
                done(status);
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;
                done();
            };

            authServer.accessTokenHandler(req, res);
        });

    });

    it('authServer.accessTokenHandler refresh_token 200', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePassword';

            res.status = (status)=>{
                done(status);
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;
                expect(json.refresh_token).to.exist;

                let reqRefresh = JSON.parse(JSON.stringify(request));
                let resRefresh = JSON.parse(JSON.stringify(response));

                reqRefresh.body["grant_type"] = 'refresh_token';
                reqRefresh.headers.authorization = "Bearer "+json.access_token;
                reqRefresh.body.refresh_token = json.refresh_token;

                resRefresh.status = (status)=>{
                    done(status);
                    return {
                        json: ()=>{

                        }
                    }
                };

                resRefresh.json = (json)=>{
                    expect(json.access_token).to.exist;
                    expect(json.refresh_token).to.exist;

                    done();
                };

                authServer.accessTokenHandler(reqRefresh, resRefresh);
            };

            authServer.accessTokenHandler(req, res);
        });

    });

    it('authServer.accessTokenHandler tokenInfo and revoking token', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePassword';

            res.status = (status)=>{
                done(status);
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;

                let reqTokenInfo1 = JSON.parse(JSON.stringify(request));
                let resTokenInfo1 = JSON.parse(JSON.stringify(response));

                reqTokenInfo1.method = 'GET';
                reqTokenInfo1.headers.authorization = "Bearer "+json.access_token;

                resTokenInfo1.status = (status)=>{
                    done(status);
                    return {
                        json: ()=>{

                        }
                    }
                };

                resTokenInfo1.json = (json)=>{
                    expect(json.uuid).to.equal(1);

                    let reqTokenDel = JSON.parse(JSON.stringify(request));
                    let resTokenDel = JSON.parse(JSON.stringify(response));

                    reqTokenDel.method = 'DELETE';
                    reqTokenDel.headers.authorization = "Bearer "+json.access_token;

                    resTokenDel.status = (status)=>{
                        done(status);
                        return {
                            json: ()=>{

                            }
                        }
                    };

                    resTokenDel.json = (json)=> {
                        let reqTokenInfo2 = JSON.parse(JSON.stringify(request));
                        let resTokenInfo2 = JSON.parse(JSON.stringify(response));

                        reqTokenInfo2.method = 'GET';
                        reqTokenInfo2.headers.authorization = "Bearer "+json.access_token;

                        resTokenInfo2.status = (status)=>{
                            expect(status).to.equal(401);
                            done();
                            return {
                                json: ()=>{

                                }
                            }
                        };

                        resTokenInfo2.json = (json)=>{
                            done(json);
                        };

                        authServer.tokenInfo(reqTokenInfo2, resTokenInfo2);
                    };

                    authServer.accessTokenHandler(reqTokenDel, resTokenDel);

                };

                authServer.tokenInfo(reqTokenInfo1, resTokenInfo1);
            };

            authServer.accessTokenHandler(req, res);
        });
    });

    it('authServer.accessTokenHandler update session scopes', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePassword';

            res.status = (status)=>{
                done(status);
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;

                let reqTokenInfo1 = JSON.parse(JSON.stringify(request));
                let resTokenInfo1 = JSON.parse(JSON.stringify(response));

                reqTokenInfo1.method = 'GET';
                reqTokenInfo1.headers.authorization = "Bearer "+json.access_token;

                resTokenInfo1.status = (status)=>{
                    done(status);
                    return {
                        json: ()=>{

                        }
                    }
                };

                resTokenInfo1.json = (json)=>{
                    expect(json.scopes).to.have.lengthOf(2);

                    project.addUserScopes(1, [serverConfig.scopes.premiumScope.scope_id]).then((user)=>{

                        let reqTokenInfo2 = JSON.parse(JSON.stringify(request));
                        let resTokenInfo2 = JSON.parse(JSON.stringify(response));

                        reqTokenInfo2.method = 'GET';
                        reqTokenInfo2.headers.authorization = "Bearer "+json.access_token;

                        resTokenInfo2.status = (status)=>{
                            done(status);
                            return {
                                json: ()=>{

                                }
                            }
                        };

                        resTokenInfo2.json = (json)=>{
                            expect(json.scopes).to.have.lengthOf(3);

                            project.removeUserScopes(1, [serverConfig.scopes.premiumScope.scope_id]).then((user)=>{

                                let reqTokenInfo3 = JSON.parse(JSON.stringify(request));
                                let resTokenInfo3 = JSON.parse(JSON.stringify(response));

                                reqTokenInfo3.method = 'GET';
                                reqTokenInfo3.headers.authorization = "Bearer "+json.access_token;

                                resTokenInfo3.status = (status)=>{
                                    done(status);
                                    return {
                                        json: ()=>{

                                        }
                                    }
                                };

                                resTokenInfo3.json = (json)=>{
                                    expect(json.scopes).to.have.lengthOf(2);
                                    done();
                                };

                                authServer.tokenInfo(reqTokenInfo3, resTokenInfo3);

                            });

                        };

                        authServer.tokenInfo(reqTokenInfo2, resTokenInfo2);

                    });

                };

                authServer.tokenInfo(reqTokenInfo1, resTokenInfo1);

            };

            authServer.accessTokenHandler(req, res);
        });
    });

    it('authServer.accessTokenHandler update session scopes', (done) => {
        authServer.initServer(serverConfig).then((result)=>{
            let req = JSON.parse(JSON.stringify(request));
            let res = JSON.parse(JSON.stringify(response));

            req.body["grant_type"] = 'user_credentials';
            req.headers.authorization = "Basic c29tZUNsaWVudElkOnNvbWVDbGllbnRTZWNyZXQ=";
            req.body.login = 'someUser';
            req.body.password = 'somePassword';

            res.status = (status)=>{
                done(status);
                return {
                    json: ()=>{

                    }
                }
            };

            res.json = (json)=>{
                expect(json.access_token).to.exist;

                let req2 = JSON.parse(JSON.stringify(request));
                let res2 = JSON.parse(JSON.stringify(response));

                req2.body = {};
                req2.headers.authorization = "Bearer "+json.access_token;

                res2.status = (status)=>{
                    done(status);
                    return {
                        json: ()=>{

                        }
                    }
                };

                let next2 = () => {
                    expect(true).to.equal(true);

                    let req3 = JSON.parse(JSON.stringify(request));
                    let res3 = JSON.parse(JSON.stringify(response));

                    req3.body = {};
                    req3.headers.authorization = "Bearer "+json.access_token;

                    res3.status = (status)=>{
                        expect(status).to.equal(403);

                        let req3 = JSON.parse(JSON.stringify(request));
                        let res3 = JSON.parse(JSON.stringify(response));

                        req3.body = {};
                        req3.headers.authorization = "Bearer wrong_token";

                        res3.status = (status)=>{
                            expect(status).to.equal(401);
                            done();
                            return {
                                json: ()=>{

                                }
                            }
                        };

                        let next3 = () => {
                            done('next called, but shouldn\'t be');
                        };

                        authServer.authenticateScopes([
                            serverConfig.scopes.premiumScope.scope_id
                        ])(req3, res3, next3);

                        return {
                            json: ()=>{

                            }
                        }
                    };

                    let next3 = () => {
                        done('next called, but shouldn\'t be');
                    };

                    authServer.authenticateScopes([
                        serverConfig.scopes.premiumScope.scope_id
                    ])(req3, res3, next3);

                };

                authServer.authenticateScopes([
                    serverConfig.scopes.premiumScope.scope_id,
                    serverConfig.scopes.publicScope.scope_id
                ])(req2, res2, next2);

            };

            authServer.accessTokenHandler(req, res);
        });
    });

});
