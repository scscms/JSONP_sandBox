(function(window, H5sandbox) {
    "use strict";
    //参考：https://github.com/aui/jsonp-sandbox
    //IE10及以上存在"sandbox" in HTMLIFrameElement.prototype
    if (H5sandbox) {
        window.addEventListener('message', function(event){
            JSONP.callBack(event.data);
        }, false);
    }
    window.JSONP = {
        control:{},//请求记录缓存
        getType:function(obj,str){
            return Object.prototype.toString.call(obj) === "[object "+ str +"]";
        },
        callBack:function(data){
            if(JSONP.getType(data,"Object")){
                var obj,fun,back;
                if(obj = JSONP.control[data.id]){
                    if (data.error) {
                        obj.error.call(obj,data.error);
                    } else {
                        back = obj.success.call(obj,data.response);
                        obj.response = data.response;
                        fun = window[obj.callback];
                        back !== false && JSONP.getType(fun,"Function") && fun.call(obj,data.response);
                    }
                    obj.setTime && clearTimeout(obj.setTime);//清除定时器
                    if(obj.iframe){
                        obj.iframe.parentNode.removeChild(obj.iframe);
                        obj.iframe = null;//删除iframe节点，以防超时后数据又回来
                    }
                }
            }
        },
        srcDoc : function(url,callback){
            var script = function (par,win,callback,H5sandbox,url) {
                //共用调用函数
                function func(key,value){
                    if(key == "response"||key == "error"){
                        var data = {id:url};
                        data[key] = value;
                        H5sandbox ? par.postMessage(data, '*') : par.JSONP.callBack(data);//ie9及以下
                    }else{
                        console.log("kill");
                        location.replace("about:blank");
                    }
                }
                var script = document.createElement("script");
                script.type = "text/javascript";
                if("onload" in script){
                    script.onerror = function() {
                        func("error","urlError");//链接出错
                    };
                    script.onload = function() {
                        setTimeout(function(){
                            func("error","noAnswer");//文件虽然载完，但未必触发。
                        },50);
                    };
                }else{
                    //IE8及以下
                    script.onreadystatechange = function() {
                        if ("loaded" == script.readyState) {
                            //文件虽然载完，但未必触发。而且就算是链接出错仍会正常触发此函数（即不能知道是链接出错）
                            setTimeout(function(){
                                func("error","noAnswer");
                            },50);
                        }
                    }
                }
                script.src = url;//先绑事件再赋值src
                (document.body || document.documentElement).appendChild(script);
                if(H5sandbox){
                    ["eval","alert","prompt","confirm","Image","XMLHttpRequest"].forEach(function(v){
                        win[v] = function(){};//在ie10及以上有用。chrome,firefox会自动禁用这些函数
                    });
                }else{
                    //ie9及以下分支 (ie10及以下都支持execScript)
                    var whiteList = {
                        setTimeout: 1,//要使用
                        clearTimeout: 1,//要使用
                        func: 1,//共用调用函数
                        onerror: 1,
                        onunload: 1,//用于IE禁止跳转页面
                        addEventListener: 1,
                        attachEvent: 1,
                        postMessage: 1,
                        console: 1,
                        location: 1//不能覆盖，否则不能正常打开网页地址
                    };
                    var code = [
                        "function eval(){}",
                        "function alert(){}",
                        "function prompt(){}",
                        "function confirm(){}",
                        "function Image(){}",
                        "function ActiveXObject(){}",
                        "function XMLHttpRequest(){}"
                    ];
                    for (var key in win){
                        var type = typeof win[key];
                        if(!whiteList[key] && (type == "object"||type == "function")){
                            try{
                                win[key] = function(){};//把window下所有内置对象给定义成新函数来覆盖
                            }catch(e){}
                            code.push("function "+key+"(){}");
                        }
                    }
                    execScript(code.join(";"));
                    //处理IE9下document之类的无法覆盖问题
                    //IE5-7[""]；IE8["HTMLDocument"]；IE9["Node","Document"]；
                    var list = ["Node","Document","HTMLDocument"];
                    for(var i = list.length;i--;){
                        if(win[list[i]]){
                            var proto = win[list[i]].prototype;
                            for (var k in proto) {
                                try {
                                    k != "close" && delete proto[k];
                                } catch (e) {}
                            }
                        }
                    }
                }
                //以防iframe被跳转而改变环境
                if (win.addEventListener) {
                    //addEventListener("beforeunload", func,false);//ie10,ie11 没有用！！！
                    addEventListener("unload", func,false);//ie9
                } else {
                    win.attachEvent("onunload", func);
                }
                //回调函数设置成全局变量
                win[callback] = function(data){func("response",data)};
            };
            return ['<html><head><\/head><body><script type="text/javascript">',
                '('+script.toString()+')(parent,window,"'+callback+'",'+H5sandbox+',"'+url+'")',
                '<\/script><\/body><\/html>'].join("");
        },
        get:function (url,option){
            var obj = {
                iframe:null,//iframe框架(记录起来到时删除)
                key:"callback",//指定函数名的参数名
                url:url,//请求jsonp的web链接地址
                callback:"_" + Math.random().toString(16).slice(-10),
                success:function(){},//成功后函数回调
                error:function(){},//失败后函数回调（主要是超时，和链接错误？）
                data:{},//请求参数
                cache:false,//是否要禁止缓存，为真是将在请求里添加一个随机数
                timeout:0,//设置超时(毫秒)
                response:"",//保存成功的数据
                setTime:null//缓存的定时器对象
            };
            //合并选项
            if(JSONP.getType(option,"Object")){
                for(var k in option){
                    if (option.hasOwnProperty(k)) {
                        obj[k] = option[k];
                    }
                }
            }
            //处理key
            var params = [],reg = new RegExp("[?&]" + obj.key + "=([^&#]+)","i");
            var match = obj.url.match(reg);//匹配url是否存在相应的参数
            if(match){
                obj.callback = match[1];
            }else{
                params.push(obj.key + "=" + obj.callback);
            }
            //处理参数
            for(var key in obj.data){
                if (obj.data.hasOwnProperty(key)) {
                    params.push(key + "=" + encodeURIComponent(obj.data[key]));
                }
            }
            if (obj.cache) {
                params.push("_=" + +new Date());//禁止缓存
            }
            if (params.length) {
                obj.url = obj.url + (/\?/.test(obj.url) ? "&" : "?") + params.join("&");
            }
            //判断是否存在缓存(优化相同请求)
            var _obj = JSONP.control[obj.url];
            if(_obj){
                if (_obj.response) {
                    var back = _obj.success.call(_obj,_obj.response);
                    var fun = window[_obj.callback];
                    return back !== false && JSONP.getType(fun,"Function") && fun.call(_obj,_obj.response);
                }
            }else{
                JSONP.control[obj.url] = obj;
            }
            //处理超时请求
            if(JSONP.getType(obj.timeout,"Number") && obj.timeout >= 100){
                obj.setTime = setTimeout(function(){
                    JSONP.callBack({id:obj.url,error:"timeOut"});
                },obj.timeout)
            }
            //生成iframe
            var sandbox = document.createElement('iframe');
            //sandbox.style.display = 'none';
            sandbox.style.border = '1px solid red';
            (document.body || document.documentElement).appendChild(sandbox);
            if (H5sandbox) {
                sandbox.sandbox = 'allow-scripts';
            }
            obj.iframe = sandbox;
            var _srcDoc = JSONP.srcDoc(obj.url,obj.callback);
            if ('srcdoc' in sandbox) {
                // chrome、firefox、safari 的 sandbox='allow-scripts' 特性只能使用 srcdoc
                sandbox.srcdoc = _srcDoc;
            } else {
                // IE6-IE11
                var contentDocument = sandbox.contentWindow.document;
                contentDocument.open();
                contentDocument.write(_srcDoc);
                contentDocument.close();
            }
        }
    }
}(window, window.HTMLIFrameElement && "sandbox" in HTMLIFrameElement.prototype));