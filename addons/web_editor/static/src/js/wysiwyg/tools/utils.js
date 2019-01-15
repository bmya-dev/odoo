odoo.define('wysiwyg.utils', function (require) {
'use strict';

return {
    /**
     * This dictionary contains oft-used regular expressions,
     * for performance and readability purposes. It can be
     * accessed and extended by the getRegex() method.
     *
     * @property {Object} {
     *      expressionName: {
     *          flagName|'noflag': expression (RegEx),
     *      }
     * }
     */
    regex: {
        char: {
            noflag: /\S|\u00A0|\uFEFF/,
        },
        emptyElemWithBR: {
            noflag: /^\s*<br\/?>\s*$/,
        },
        endInvisible: {
            noflag: /\uFEFF$/,
        },
        endNotChar: {
            noflag: /[^\S\u00A0\uFEFF]+$/,
        },
        endSingleSpace: {
            noflag: /[\S\u00A0\uFEFF]\s$/,
        },
        endSpace: {
            noflag: /\s+$/,
        },
        invisible: {
            noflag: /\uFEFF/,
        },
        notWhitespace: {
            noflag: /\S/,
        },
        onlyEmptySpace: {
            noflag: /^[\s\u00A0\uFEFF]*(<br>)?[\s\u00A0\uFEFF]*$/,
        },
        semicolon: {
            noflag: / ?; ?/,
        },
        space: {
            noflag: /\s+/,
            g: /\s+/g,
        },
        spaceOrNewline: {
            noflag: /[\s\n\r]+/,
            g: /[\s\n\r]+/g,
        },
        startAndEndInvisible: {
            noflag: /^\uFEFF|\uFEFF$/,
            g: /^\uFEFF|\uFEFF$/g,
        },
        startAndEndSpace: {
            noflag: /^\s+|\s+$/,
            g: /^\s+|\s+$/g,
        },
        startAndEndSemicolon: {
            noflag: /^ ?;? ?| ?;? ?$/,
        },
        startInvisible: {
            noflag: /^\uFEFF/,
        },
        startNotChar: {
            noflag: /^[^\S\u00A0\uFEFF]+/,
        },
        startSingleSpace: {
            noflag: /^\s[\S\u00A0\uFEFF]/,
        },
        startSpace: {
            noflag: /^\s+/,
        },
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Return a function that returns true if both functions
     * passed as parameters return true.
     *
     * @param {Function (any) => Boolean} fn1
     * @param {Function (any) => Bolean} fn2
     * @returns {Function (any) => Boolean}
     */
    and: function (fn1, fn2) {
        return function (arg) {
            return fn1(arg) && fn2(arg);
        };
    },
    /**
     * Get a unicode or HTML escaped String for a special character.
     *
     * Possible values for `name`:
     * - 'nbsp'         non-breakable space
     * - 'zeroWidth'    zero-width character
     *
     * @param {Object} name
     * @param {Boolean} isEscaped
     * @returns {String}
     */
    char: function (name, isEscaped) {
        var esc = {
            nbsp: '&nbsp;',
            zeroWidth: '&#65279;',
        };
        var unicode = {
            nbsp: '\u00A0',
            zeroWidth: '\uFEFF',
        };
        return isEscaped ? esc[name] : unicode[name];
    },
    /**
     * Fill in `object`'s `undefined` writable properties with the value of the
     * property with the same name in `defaults`, if any, then return `object`.
     *
     * @param {Object} object
     * @param {Object} defaults
     * @returns {Object}
     */
    defaults: function (object, defaults) {
        var propDesc;
        Object.keys(defaults).forEach(function (key) {
            propDesc = Object.getOwnPropertyDescriptor(object, key);
            if (object[key] === undefined && (!propDesc || propDesc.writable)) {
                object[key] = defaults[key];
            }
        });
        return object;
    },
    /**
     * Takes an object and converts it to an array of objects.
     * Eg: {firstKey: firstValue, secondKey: secondValue}
     * becomes [{key: firstKey, value: firstValue}, {key: secondKey, value: secondValue}].
     * It is possible to specify another default key name and value name.
     *
     * @param {Object} dict
     * @param {String} [keyName]
     * @param {String} [valueName]
     * @returns {Object []}
     */
    dictToArray: function (dict, keyName, valueName) {
        var array = [];
        Object.keys(dict).forEach(function (key) {
            var pair = {};
            pair[keyName || 'key'] = key;
            pair[valueName || 'value'] = dict[key];
            array.push(pair);
        });
        return array;
    },
    /**
     * Flattens a nested array (the nesting can be to any depth).
     *
     * @param {any []} array
     * @returns {any []}
     */
    flatten: function (array) {
        return array.reduce(function (a, b) {
            return a.concat(b);
        }, []);
    },
    /**
     * Returns (and creates if necessary) a regular expression.
     * If a regular expression with the given name exists, simply returns it.
     * Otherwise, creates a new one with the given name, exp and flag.
     *
     * @param {String} name
     * @param {String} [flag] optional
     * @param {String} [exp] optional
     * @returns {RegExp}
     */
    getRegex: function (name, flag, exp) {
        var flagName = flag || 'noflag';
        flag = flag || '';
        // If the regular expression exists, but not with this flag:
        // retrieve whichever version of it and apply the new flag to it,
        // then save that new version in the `regex` object.
        if (this.regex[name] && !this.regex[name][flagName]) {
            if (exp) {
                console.warn("A regular expression already exists with the name: " + name + ". The expression passed will be ignored.");
            }
            var firstVal = this.regex[name][Object.keys(this.regex[name])[0]];
            this.regex[name][flagName] = new RegExp(firstVal, flag);
        } else if (!this.regex[name]) {
            // If the regular expression does not exist:
            // save it into the `regex` object, with the name, expression
            // and flag passed as arguments (if any).
            if (!exp) {
                throw new Error("Cannot find a regular expression with the name " + name + ". Pass an expression to create it.");
            }
            this.regex[name] = {};
            this.regex[name][flagName] = new RegExp(exp, flag);
        }
        return this.regex[name][flagName];
    },
    /**
     * Returns (and creates if necessary) a regular expression
     * targetting a string made ONLY of some combination of the
     * characters enabled with options.
     * If a regular expression with the given options exists, simply returns it.
     * eg: getRegexBlank({space: true, nbsp: true}) => /^[\s\u00A0]*$/
     *
     * @param {Object} [options] optional
     * @param {Boolean} options.not ^ (not all that follows)
     * @param {Boolean} options.space \s (a whitespace)
     * @param {Boolean} options.notspace \S (not a whitespace)
     * @param {Boolean} options.nbsp \u00A0 (a non-breakable space)
     * @param {Boolean} options.invisible \uFEFF (a zero-width character)
     * @param {Boolean} options.newline \n|\r (a new line or a carriage return)
     * @param {Boolean} options.atLeastOne + (do not target blank strings)
     * @returns {RegExp}
     */
    getRegexBlank: function (options) {
        options = options || {};
        var charMap = {
            notspace: {
                name: 'NotSpace',
                exp: '\\S',
            },
            space: {
                name: 'Space',
                exp: '\\s',
            },
            nbsp: {
                name: 'Nbsp',
                exp: '\\u00A0',
            },
            invisible: {
                name: 'Invisible',
                exp: '\\uFEFF',
            },
            newline: {
                name: 'Newline', 
                exp: '\\n\\r',
            },
        };
        var name = 'only';
        var exp = '';
        var atLeastOne = options.atLeastOne;
        options.atLeastOne = false;

        // Build the expression and its name
        if (options.not) {
            name += 'Not';
            exp += '^';
            options.not = false;
        }
        _.each(options, function (value, key) {
            if (value && charMap[key]) {
                name += charMap[key].name;
                exp += charMap[key].exp;
            }
        });

        exp = '^[' + exp + ']' + (atLeastOne ? '+' : '*') + '$';
        name += atLeastOne ? 'One' : '';
        return this.getRegex(name, undefined, exp);
    },
    /**
     * Return a function that returns the opposite of the function in argument.
     *
     * @param {Function (any) => Boolean} fn
     */
    not: function (fn) {
        return function (arg) {
            return !fn(arg);
        };
    },
    /**
     * Return a function that returns true if either function
     * passed as parameters return true.
     *
     * @param {Function (any) => Boolean} fn1
     * @param {Function (any) => Bolean} fn2
     * @returns {Function (any) => Boolean}
     */
    or: function (fn1, fn2) {
        return function (arg) {
            return fn1(arg) || fn2(arg);
        };
    },
    /**
     * Produces a duplicate-free version of the array, using === to test object equality.
     * In particular only the first occurrence of each value is kept.
     *
     * @param {any []} array
     * @returns {any []}
     */
    uniq: function (array) {
        return array.filter(function (value, index, self) {
            return self.indexOf(value) === index;
        });
    },
};

});
