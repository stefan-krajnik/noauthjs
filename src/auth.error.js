'use strict';

class AuthError {

    constructor(statusCode, message, description){
        this.initVars();

        this.statusCode = statusCode;
        this.message = message;
        this.description = description;
    }

    static internalServerError(){
        let error = new AuthError(500, 'Internal server error', 'Unhandled error.');

        return error;
    }

    initVars(){
        this.statusCode = null;
        this.message = null;
        this.description = null;
    }

    getStatusCode(){
        return this.statusCode;
    }

    getJsonObject(){
        return {message: this.message, description: this.description};
    }
}

module.exports = AuthError;