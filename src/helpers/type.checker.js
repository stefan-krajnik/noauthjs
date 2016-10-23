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

    static isModel(input){
        return !!(input && input.constructor && input.constructor.name && input.constructor.name.toLowerCase() === 'model');
    }

    static isObjectID(input){
        return !!(input && input.constructor && input.constructor.name && input.constructor.name.toLowerCase() === 'objectid');
    }
}

module.exports = TypeChecker;