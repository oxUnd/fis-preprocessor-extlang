/**
 * fis
 * http://fis.baidu.com
 */

'use strict'

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

//expand css
//[@require id] in comment to require resource
//[@import url(path?__inline)] to embed resource content
//url(path) to locate resource
//url(path?__inline) to embed resource content or base64 encodings
//src=path to locate resource
function extCss(content, map){
    var reg = /(\/\*[\s\S]+?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}]+)\s*\)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    return content.replace(reg, function(m, comment, url, filter){
        if(url){
            var key = isInline(fis.util.query(url)) ? 'embed' : 'uri';
            if(m.indexOf('@') === 0){
                if(key === 'embed'){
                    m = map.embed.ld + url + map.embed.rd;
                } else {
                    m = '@import url(' + map.uri.ld + url + map.uri.rd + ')';
                }
            } else {
                m = 'url(' + map[key].ld + url + map[key].rd + ')';
            }
        } else if(filter) {
            m = 'src=' + map.uri.ld + filter + map.uri.rd;
        } else if(comment) {
            m = analyseComment(comment, map);
        }
        return m;
    });
}

// html
//{%script|style ...%}...{%/script|style%} to analyse as js|css
function extHtml(content, map, conf){
    var reg = new RegExp('('+conf.ld+'script(?:\\s+[\\s\\S]+?["\'\\s\\w\\/]'+conf.rd+'|'+conf.rd+'))([\\s\\S]*?)(?='+conf.ld+'\\/script'+conf.rd+'|$)|('+conf.ld+'style(?:\\s+[\\s\\S]+?["\'\\s\\w\\/]'+conf.rd+'|'+conf.rd+'))([\\s\\S]*?)(?='+conf.ld+'\\/style'+conf.rd+'|$)', 'ig');
    return content.replace(reg, function(m, $1, $2, $3, $4){
        if ($1) {
            m = $1 + extJs($2, map);
        }
        return m;
    });
}

module.exports = function (content, file, conf) {
    conf.ld = conf.ld ? conf.ld : '{%';
    conf.rd = conf.rd ? conf.rd : '%}';
    conf.ld = pregQuote(conf.ld);
    conf.rd = pregQuote(conf.rd);
    if (file.rExt === '.tpl') {
        return extHtml(content, fis.compile.lang, conf);
    }
};