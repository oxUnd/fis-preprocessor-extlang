'use strict';

var fis = require('../../../fis-kernel/fis-kernel.js'),
    _ = fis.util,
    file = fis.file,
    expect = require('chai').expect,
    fs = require("fs");
var root = __dirname + '/file';
var extlang = require("../../index.js");
describe('compile(path, debug)', function () {
      var  tempfiles = [];

    before(function(){
        fis.project.setProjectRoot(root);
        fis.project.setTempRoot(root+'/target/');
    });

    afterEach(function(){
        tempfiles.forEach(function(f){
            _.del(root+'/target/');
        });
    });

    /**
     *extlang中extHtml对标签{%script ...%}...{%/script%}的匹配验证
     * 以下三个例子
     * */
    it('{%script%}_TagMatching',function(){
        // {%script%}...{%/script%}
        var f = file(__dirname+'/file/embeded1.tpl');
        tempfiles.push(f);

        var content = f.getContent() ,
            conf_ = {};
        var c = extlang(content,f,conf_);

        expect(c).to.equal('{%script%}<[{embed(\"./e.js\")}]>{%/script%}');
    });

    it('{%script %}_TagMatching',function(){
        //{%script %}...{%/script%}
        var f = file(__dirname+'/file/embeded2.tpl');
        tempfiles.push(f);

        var content = f.getContent() ,
            conf_ = {};
        var c = extlang(content,f,conf_);

        expect(c).to.equal('{%script %}<[{embed(\"./e.js\")}]>{%/script%}');
    });

    it('{%script ...%}_TagMatching',function(){
        //{%script ...%}...{%/script%}
        var f = file(__dirname+'/file/embeded3.tpl');
        tempfiles.push(f);

        var content = f.getContent() ,
            conf_ = {};
        var c = extlang(content,f,conf_);

        expect(c).to.equal('{%script charset="UTF-8"%}<[{embed(\"./e.js\")}]>{%/script%}');
    });


});