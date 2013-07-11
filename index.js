/**
 * fis
 * http://fis.baidu.com
 */

'use strict'

var ld, rd;

function pregQuote (str, delimiter) {
    // http://kevin.vanzonneveld.net
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

//"abc?__inline" return true
//"abc?__inlinee" return false
//"abc?a=1&__inline"" return true
function isInline(info){
    return /[?&]__inline(?:[=&'"]|$)/.test(info.query);
}

//analyse [@require id] syntax in comment
function analyseComment(comment, map){
    var reg = /(@require\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
    return comment.replace(reg, function(m, prefix, value){
        return prefix + map.require.ld + value + map.require.rd;
    });
}

//expand javascript
//[@require id] in comment to require resource
//__inline(path) to embedd resource content or base64 encodings
//__uri(path) to locate resource
//require(path) to require resource
function extJs(content, map){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))|\b(__inline|__uri|require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    return content.replace(reg, function(m, comment, type, value){
        if(type){
            switch (type){
                case '__inline':
                    m = map.embed.ld + value + map.embed.rd;
                    break;
                case '__uri':
                    m = map.uri.ld + value + map.uri.rd;
                    break;
                case 'require':
                    m = 'require(' + map.require.ld + value + map.require.rd + ')';
                    break;
            }
        } else if(comment){
            m = analyseComment(comment, map);
        }
        return m;
    });
}

// html
//{%script ...%}...{%/script%} to analyse as js
function extHtml(content, map, conf){
    var reg = new RegExp('('+ld+'script(?:(?=\\s)[\\s\\S]*?["\'\\s\\w]'+rd+'|'+rd+'))([\\s\\S]*?)(?='+ld+'\\/script'+rd+'|$)', 'ig');
    return content.replace(reg, function(m, $1, $2, $3, $4){
        if ($1) {
            m = $1 + extJs($2, map);
        }
        return m;
    });
}

module.exports = function (content, file, conf) {
    ld = conf.left_delimiter || fis.config.get('settings.smarty.left_delimiter') || '{%';
    rd = conf.right_delimiter || fis.config.get('settings.smarty.right_delimiter') || '%}';
    ld = pregQuote(ld);
    rd = pregQuote(rd);
    if (file.rExt === '.tpl') {
        return extHtml(content, fis.compile.lang, conf);
    }
};
