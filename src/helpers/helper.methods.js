'use strict';

const typeChecker = require('./type.checker');

class HelperMethods {
    constructor(){

    }

    static arrayMergeUnique(arr1, arr2){
        let newArr = [];

        if(typeChecker.isArray(arr1) && typeChecker.isArray(arr2)){
            newArr = arr1;

            for(let el of arr2){
                if(newArr.indexOf(el) === -1){
                    newArr.push(el);
                }
            }
        }

        return newArr;

    }

}

module.exports = HelperMethods;
