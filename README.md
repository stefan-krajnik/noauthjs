# noauth
Simple NodeJS oAuth library

# Features
- Client credentails authentication
- User credentails authentication
- Scope based authentiaction

# Requirements
- Express (npm version (npm version 4.14.0)
- body-parser (npm version 1.15.2+)

# Instalation
- Install using npm `npm install noauth --save`

# Usage

## Create a config file
See the example [config file](https://github.com/stefan-krajnik/noauth/blob/master/example/auth.config.js)

## In app usage
See the example [application file](https://github.com/stefan-krajnik/noauth/blob/master/example/app.js)  

### const authServer = require('./../src/app');
authServer is a singleton so don't try to create a new instance of it.  
If you need to require it multiple files, just do so. Since it is a singleton you will always get the same object (instance).


####Example
```javascript
const authServer = require('./../src/app');
const serverConfig = require('./auth.config');

authServer.initServer(serverConfig).then((result)=>{
    let project = authServer.getProject('someProject'); // project_id

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
```

# Public methods and variables

## authServer methods and variables

### \*_m_\* initServer(config)
Initilizes the oauth server.  
Creates or updates (if already exist in mongodb) projects, clients, scopes definded in config file.  
Creates a connection to mongodb using mongoose.  
**Returns a promise (_bluebird_)**  


### \*_m_\* getProject(project_id)
Creates an instance of AuthProject class, which provides methods and variables described below.
The object is filled with data from database, which is an asynchronous process. To be sure the object has accurate data and is ready to use, use the `ready()` function which is described below in **project methods**.  
**Returns an object (instace of AuthProject)**

### \*_v_\* accessTokenHandler
accessTokenHandler is a _getter_ which returns a _callback_ function for **_express_** router, which takes `req, res` as parameters.
##### e.g. `app.all('/access-token', authServer.accessTokenHandler);`
#### Request 
```javascript
{
	url: "http://your.domain/access-token" // or any other address you specify in the router
	method: "POST",
	headers: {
    "Content-Type": "application/json"
		"Authorization": "Basic btoa('client_id:client_secret')" // btoa is javascript function encodes a string to base64, btoa is just an example, use wahatever you want, just provide valid base64
	},
	body: {
		"grant_type": "client_credentials", // client_credentials | user_credentials | refresh_token
		"login": "someLogin", // only if grant_type == user_credentials
		"password": "somePassword", // only if grant_type == user_credentials
		"refresh_token": "someRefreshToken" // only if grant_type == refresh_token
	}

}
```
#### Success response
```json
{
  "access_token": "5d7112256d68ddbbaa9a11f57bf2a6c229ba3d838b5e210a4448f2cbbe7df756",
  "refresh_token": "bba9271f7977f8a99e3f4ee4ea215388e7a792289fc96d5e80c6c717b24045ed",
  "expires_in": 3599,
  "token_type": "bearer"
}
```

#### Error response
If a client provides wrong **client_id** or **cleint_secret** error response is generated as shown below, with statuc code **401**
```json
{
  "message": "Unauhtorized",
  "description": "Invalid client credentials"
}
```
If you get any other error one of us messed something up

#### Request for revoking/deleting access token (log out)
```javascript
{
	url: "http://your.domain/access-token" // or any other address you specify in the router
	method: "POST",
	headers: {
    "Content-Type": "application/json"
		"Authorization": "Bearer someAccessTokenYouWantToRevoke"
	}
}
```

### \*_v_\* tokenInfo
tokenInfo is a _getter_ which returns a _callback_ function for **_express_** router, which takes `req, res` as parameters.
##### e.g. `app.get('/token-info', authServer.tokenInfo);`
#### Request
```javascript
{
	url: "http://your.domain/token-info" // or any other address you specify in the router
	method: "GET",
	headers: {
    "Content-Type": "application/json"
		"Authorization": "Bearer someAccessToken"
	}
}
```
#### Success response
```json
{
  "uuid": null,
  "access_token": "11bbe68648de8598a3b00e9ee709458fe0919e176609ea813b5e0c4a1837e87d",
  "refresh_token": "e9db3cbe000630c04c9cbbbfcca8a44399ccbc6e0c7d8a671d5a325930bc06bf",
  "expires_in": 3575,
  "token_type": "bearer",
  "scopes": [
    "public"
  ]
}
```
` "uuid": null, // null if access is granted by client_credentials, Number if access granted by user_credentials`
#### Error response
If a client provides wrong **client_id** or **cleint_secret** error response is generated as shown below, with statuc code **401**
```json
{
  "message": "Unauhtorized",
  "description": "Invalid access_token"
}
```
If you get any other error one of us messed something up

### \*_m_\* authenticateScopes(scopes)
is a function which takes array of `project_id` as paramerer and returns a _callback_ function for middleware of **_express_** router, which takes `req, res, next` as parameters.

#### e.g. 
```javascript
app.get('/protected-resource', authServer.authenticateScopes('loggedin'), (req, res)=>{
    res.json({protected: 'resource'});
});
```

When a resource which is protected with `authenticateScopes(scopes)` _middleware_ is requested, _bearer access token_ is checked from request headers.

#### Request
```javascript
{
	url: "http://your.domain/protected-resource" // or any other address you specify in the router
	method: "GET", // or any other method
	headers: {
		"Authorization": "Authorization accessToken"
	}
}
```
#### Success response
```json
{
  "protected": "resource"
}
```

#### Error response
If _access token_ provided is invalid (wrong token, expired token, ...) or user doesn't have required scopes for a resource 
response with status code **401** is returned

#### example of error response
```json
{
  "message": "Forbidden",
  "description": "Required scope missing"
}
```

## Project methods

### \*_m_\* createUser(userConfig)
Creates (registers) a user with login information and scopes provided in **_userConfig_**
#### userConfig example
```javascript
{
  login: 'stevik', 
  password: 'heslo',
  scopes: ['loggedin', 'anotherScope']
}
```

**Returns a promise which resolves with an instance of `AuthUser`** class

### \*_m_\* getUserByUuid(uuid)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* getUserByLoginAndPassword(login, password)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* changeUserLogin(uuid, newLogin)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* changeUserPassword(uuid, newPassword)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* addUserScopes(uuid, scope_ids)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* removeUserScopes(uuid, scope_ids)
**Returns a promise which resolves with an instance of `AuthUser`** class or **null** if there is no such user

### \*_m_\* deleteUserByUuid(uuid)
**Returns a promise which resolves with a _bool_ values, _true_ if successfuly deleted, _false_ if user you tried to delete was not found in database**

## AuthUser public methods and variable

### \*_v_\* uuid
### \*_v_\* login
### \*_v_\* password
### \*_v_\* project
### \*_v_\* scopes










# Explanation of terms (with examples)

## Client
An app (web, phone, ...) which accesses and provides server resources to a resource owner (user).

## Project
Servers as a wrapper for clients and users, so you don't have to register a user in each client separatly.

## Scope
Scopes let's you divide resources into multiple groups. After the authentication via **_client credentials_** or **_user credentials_** certain scopes are granted to a user.

## Grant types
Grant types lets you specify different authentication methods.  

**Currently supported grantypes are:**
- client_credentials _(uses client_id and client_secret for the authentication)_
- user_credentials _(uses login and password for the authentication)_
- refresh_token _(uses refresh_token for genereting new access_token and refresh_token)_

## Tokens

### Access token
Each request to oauth protected resource has to contain a _Bearer_ _access token_  
`e.g. "Authorization": "Bearer some_token"`  
Validity of a access token is currently set to 3600 seconds.

### Refresh token
If a client permits to refresh token, the token can be used to generate new _access_token_ and _refresh_token_


# Contact
- Found a bug? [Create an issue](https://github.com/stefan-krajnik/noauth/issues)
- For anything elese, drop me an email stefan@stefankrajnik.com