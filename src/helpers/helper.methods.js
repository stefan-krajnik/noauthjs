'use strict';

const typeChecker = require('./type.checker');

class HelperMethods {
    constructor(){

    }

    static arrayMergeUnique(arr1, arr2){
        let newArr = [];

        if(typeChecker.isArray(arr1) && typeChecker.isArray(arr2)){
            newArr = arr1;

            if((arr1 && (!arr1.length || (arr1.length && typeChecker.isObjectID(arr1[0]))))
                &&
                (arr2 && (!arr2.length || (arr2.length && typeChecker.isObjectID(arr2[0]))))){
                return HelperMethods.objectIDArrayMergeUnique(arr1, arr2);
            }

            for(let el of arr2){
                if(newArr.indexOf(el) === -1){
                    newArr.push(el);
                }
            }
        }

        return newArr;

    }

    static objectIDArrayMergeUnique(arr1, arr2){
        let newArr = [];
        let newArrIdStrings = [];

        if(typeChecker.isArray(arr1) && typeChecker.isArray(arr2)){
            newArr = arr1;

            for(let newArrEl of newArr){
                newArrIdStrings.push(newArrEl.toString());
            }

            for(let el of arr2){
                if(newArrIdStrings.indexOf(el.toString()) === -1){
                    newArr.push(el);
                }
            }
        }

        return newArr;
    }

}

module.exports = HelperMethods;
