'use strict';

class TypeChecker {
    constructor(){

    }

    static isArray(input) {
        return (!!input) && (input.constructor === Array);
    };

    static isObject(input){
        return (!!input) && (input.constructor === Object);
    }

    static isString(input){
        return (!!input || input === '') && ((typeof input).toLowerCase() === 'string')
    }

    static isOfTypeObject(input){
        return (!!input) && (typeof input === 'object');
    }
}

module.exports = TypeChecker;