// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    "use strict";

    function forEach(arr, f) {
        for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
    }

    function arrayContains(arr, item) {
        if (!Array.prototype.indexOf) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === item) {
                    return true;
                }
            }
            return false;
        }
        return arr.indexOf(item) != -1;
    }


    var pythonKeywordsStr = "and del from not while as elif global or with assert else if pass yield" + "break except import print class exec in raise continue finally is return def for lambda try";
    pythonKeywordsStr = pythonKeywordsStr.split(" ");
    var pythonKeywords = [];
    pythonKeywordsStr.forEach(function(entry) {
        pythonKeywords.push(
            {
                text: entry,
                displayText: entry + '<span> :keyword</span>',
                className: 'hint-keyword'
            }
        );
    });
    //  var pythonKeywords = _.map(pythonKeywordsStr.split(" "), function(item) {
    //    return {
    //      text: item,
    //      displayText: item + '<span> :keyword</span>',
    //      className: 'hint-keyword'
    //    };
    //  });
    var pythonBuiltinsStr = "abs divmod input open staticmethod all enumerate int ord str " + "any eval isinstance pow sum basestring execfile issubclass print super" + "bin file iter property tuple bool filter len range type" + "bytearray float list raw_input unichr callable format locals reduce unicode" + "chr frozenset long reload vars classmethod getattr map repr xrange" + "cmp globals max reversed zip compile hasattr memoryview round __import__" + "complex hash min set apply delattr help next setattr buffer" + "dict hex object slice coerce dir id oct sorted intern ";
    var pythonBuiltins = [];
    pythonBuiltinsStr = pythonBuiltinsStr.split(" ");
    pythonBuiltinsStr.forEach(function(entry) {
        pythonBuiltins.push(
            {
                text: entry,
                displayText: entry + '() <span> :function</span>',
                className: 'hint-function'
            }
        );
    });
    
//    var pythonBuiltins = _.map(pythonBuiltinsStr.split(" "), function (item) {
//        return {
//            text: item,
//            displayText: item + '() <span> :function</span>',
//            className: 'hint-function'
//        };
//    });

    //find completions
    function getCompletions(token, context, options) {

        console.log('plonPython Hint');
        console.log('token context', token, context, options);
        var found = [],
            start = token.string;

        var kernelVariables = [];
        var kernelVars = [];

        var loadHints = options && options.loadHints;
        if (loadHints && typeof (loadHints) === 'function') {
            kernelVars = loadHints(token, context, options);
        }

        kernelVariables = _.map(kernelVars, function (item) {
            var hint_cls = 'hint-variable';

            var hint_display = item.name + ' <span> :' + item.type + '</span>';

            switch (item.type.toLowerCase()) {
            case 'module':
                hint_cls = 'hint-module';
                break;
            case 'function':
                hint_cls = 'hint-function';
                hint_display = item.name + '() <span> :' + item.type + '</span>'
                break;
            case 'figure':
                hint_cls = 'hint-figure';
                break;
            default:
                hint_cls = 'hint-variable';
            }

            var completion = {
                text: item.name,
                displayText: hint_display,
                className: hint_cls
            };

            return completion;
        });



        //check if simillar
        function maybeAdd(candidate) {

            var str = '';
            //if it is a simple string
            if (typeof candidate == "string") {
                str = candidate;
            } else {
                //or if it is a objects {text:'t',displayText:'t',...}
                str = candidate.text;
            }

            //var t1 = str.lastIndexOf(start, 0) == 0;
            var t1 = str.indexOf(start) > -1;



            var t2 = !arrayContains(found, str);
            if (t1 && t2) {
                //add candidate to list
                found.push(candidate);
            }
        }

        function combineCompletions(_obj) {
            forEach(pythonBuiltins, maybeAdd);
            forEach(pythonKeywords, maybeAdd);
            forEach(kernelVariables, maybeAdd);
        }


        if (context) {
            // If this is a property, see if it belongs to some object we can
            // find in the current environment.
            var obj = context.pop(),
                base;

            console.log('obj', obj);

            if (obj.type == "variable")
                base = obj.string;
            else if (obj.type == "variable-3")
                base = ":" + obj.string;

            while (base != null && context.length)
                base = base[context.pop().string];
            if (base != null)
                combineCompletions(base);
        }



        return found;
    }



    //editor - codemirror isinstance
    //_keywords - initial keywords
    //getToken - function which grab the token
    //options - options passed to hint function
    function scriptHint(editor, _keywords, getToken, options) {

        console.log('plonPython scriptHint');
        // Find the token at the cursor
        var cur = editor.getCursor(),
            token = getToken(editor, cur),
            tprop = token;
        // If it's not a 'word-style' token, ignore the token.

        if (!/^[\w$_]*$/.test(token.string)) {
            token = tprop = {
                start: cur.ch,
                end: cur.ch,
                string: "",
                state: token.state,
                className: token.string == ":" ? "python-type" : null
            };
        }

        if (!context) var context = [];
        context.push(tprop);

        var completionList = getCompletions(token, context, options);
        completionList = completionList.sort();

        return {
            list: completionList,
            from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)
        };
    }


    function plonPythonHint(editor, options) {
        return scriptHint(editor, pythonKeywords,
            function (e, cur) {
                return e.getTokenAt(cur);
            },
            options);
    }

    //register hint helper
    CodeMirror.registerHelper("hint", "plonPython", plonPythonHint);

});