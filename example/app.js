'use strict';

const express = require('express');
const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.json());

const authServer = require('noauthjs');
const serverConfig = require('./auth.config');

authServer.initServer(serverConfig).then((result)=>{
    let project = authServer.getProject('someProject'); // project_id

    project.createUser({
        login: 'someUser',
        password: 'somePassword',
        scope_ids: ['loggedin']
    }).then((result1)=>{
        // do whatever you want
    }).catch((error)=>{
        // handle unexpected errors
    });

    app.all('/access-token', authServer.accessTokenHandler);
    app.get('/token-info', authServer.tokenInfo);

    app.get('/protected-resource', authServer.authenticateScopes('loggedin'), (req, res)=>{
        res.json({protected: 'resource'});
    });

    app.listen(3000, function () {
        console.log('Example app listening on port 3000!');
    });

}).catch((error)=>{
    // handle authServer init error
});
