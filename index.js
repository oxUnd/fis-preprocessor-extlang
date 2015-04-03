/**
 * fis
 * http://fis.baidu.com
 */

'use strict'

var ldraw, rdraw, ld, rd;

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
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    var callback =  function(m, comment, url, last, filter){
        if(url){
            var key = isInline(fis.util.query(url)) ? 'embed' : 'uri';
            if(m.indexOf('@') === 0){
                if(key === 'embed'){
                    m = map.embed.ld + url + map.embed.rd + last.replace(/;$/, '');
                } else {
                    m = '@import url(' + map.uri.ld + url + map.uri.rd + ')' + last;
                }
            } else {
                m = 'url(' + map[key].ld + url + map[key].rd + ')' + last;
            }
        } else if(filter) {
            m = 'src=' + map.uri.ld + filter + map.uri.rd;
        } else if(comment) {
            m = analyseComment(comment, map);
        }
        return m;
    };
    return content.replace(reg, callback);
}

// html
//{%script ...%}...{%/script%} to analyse as js
function extHtml(content, map, conf){
    var reg = new RegExp('('+ld+'script(?:(?=\\s)[\\s\\S]*?["\'\\s\\w]'+rd+'|'+rd+'))([\\s\\S]*?)(?='+ld+'\\/script'+rd+'|$)|('+ld+'style(?:(?=\\s)[\\s\\S]*?["\'\\s\\w\\-]'+rd+'|'+rd+'))([\\s\\S]*?)(?='+ld+'\\/style\\s*'+rd+'|$)', 'ig');
    content = content.replace(reg, function(m, $1, $2, $3, $4){
        if ($1) {
            m = $1 + extJs($2, map);
        } else if($3){
            m = $3 + extCss($4, map);
        }
        return m;
    });

    return extSmarty(content, map, conf);
}

function extSmarty(content, map, conf) {
    var reg = new RegExp('(' + ld + '\\*[\\s\\S]*?(?:\\*' + rd + '|$))|(?:' + ld + '(extends|widget|require|uri|html)(.+?)' + rd + ')', 'ig');

    content = content.replace(reg, function(m, comments, directive, params) {
        if (!comments && params) {
            switch (directive) {
                case 'extends':
                    params = params.replace(/\sfile\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
                        return ' file=' + map.tpl.ld + quote + value + quote + map.tpl.rd;
                    });
                    break;

                case 'html':
                    params = params.replace(/\sframework\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
                        return ' framework=' + map.id.ld + quote + value + quote + map.id.rd;
                    });
                    break;

                default:
                    params = params.replace(/\sname\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
                        return ' name=' + map.id.ld + quote + value + quote + map.id.rd;
                    });
                    break;
            }

            m = ldraw + directive + params + rdraw;
        }


        return m;
    });

    return content;
}

module.exports = function (content, file, conf) {
    ldraw = conf.left_delimiter || fis.config.get('settings.smarty.left_delimiter') || fis.config.get('settings.template.left_delimiter') || '{%';
    rdraw = conf.right_delimiter || fis.config.get('settings.smarty.right_delimiter') || fis.config.get('settings.template.right_delimiter') || '%}';
    ld = pregQuote(ldraw);
    rd = pregQuote(rdraw);

    // 扩展两种语法
    var map = fis.compile.lang;
    if (!map['id'] || !map['tpl']) {
        var LD = '<<<', RD = '>>>';

        ['id', 'tpl'].forEach(function(key) {
            map[key] = {
                ld: LD + key + ':',
                rd: RD
            };
        });
    }

    if (file.isHtmlLike) {
        return extHtml(content, fis.compile.lang, conf)
            .replace(/\<\<\<(id|tpl)\:([\s\S]+?)\>\>\>/ig, function(_, key, value) {
                var info = fis.uri.getId(value, file.dirname);

                if (info.file) {
                    var value = info.id;

                    if (key === 'tpl') {
                        value = value.replace(':', '/');
                    }

                    return info.quote + value + info.quote;
                }

                return value;
            });
    }
};
