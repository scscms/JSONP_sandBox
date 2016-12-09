# jsonp-sandbox安全沙箱<sup>shine</sup>

## 什么是jsonp-sandbox

> ajax中常常提到一个JSONP请求，其实JSONP与普通ajax还是有区别的。JSONP是一个广为使用的跨域获取数据的解决方案，它的原理是加载动态生产的 `script` 内容而实现跨域。由于实现机制，JSONP 很容产生安全问题，例如脚本被黑客或者运营商劫持等。

## 前提

|浏览器|H5 sandbox|srcdoc|execScript|
|:-----|:-----:|:-----:|:-----:|
|IE8以下|不支持|支持|
|IE9|不支持|不支持|支持|
|IE10|支持|不支持|支持|
|IE11|支持|不支持|不支持|
|chrome|支持|支持|不支持|
|firefox|支持|支持|不支持|

## 处理

所有请求先在本页面创建一个iframe隔离请求，重点防范top,parent访问。

处理分三种情况：
- 1.IE9及以下
    借助`execScript`使用同名函数覆盖top,parent对象。
    ie9因不能覆盖Document及HTMLDocument，所以使用破坏原型上的getter,setter属性。
- 2.IE10及以上
    虽然支持sandbox但并不友好。同样使用同名函数方法覆盖alert、confirm等。
- 3.chrome、firefox等现代浏览器
    使用H5 sandbox沙箱完美隔离。

IE9及以下使用预留的`parent`通信，其他通过`postMessage`通信。

## 使用

直接引入：

``` html
<script src="./jsonp-sandbox.js"></script>
```
**JSONP.get(url,options)**

**url** 必填

**options** 可选
* `url` 如果填写将覆盖第一个参数
* `key` JSONP 指定 KEY，默认是 `callback`
* `callback` JSONP 指定回调函数名
    1.随机自动生成
    2.如果指定值，将覆盖前面的值
    3.以key的值在url中截取，如果存在将覆盖前面的值
* `success` 成功回调函数
* `error` 失败回调函数
* `data` URL 附加的请求数据
* `cache` 是否要禁止缓存，为真是将在请求里添加一个随机数
* `timeout` 超时(毫秒)必须不能小于100

## API

**JSONP.get(url, success, error)**

``` javascript
JSONP.get('http://api.com/user', function (data) {
    console.log(data);
});
```



例如：

``` javascript
JSONP.get('http://api.com/users/35', {
    value: 'jsonp_001',
    key: 'callback'
})
```

最终请求出去的 URL 类似：

```
http://api.com/users/35?callback=jsonp_001
```

## 演示

```javascript
document.cookie = 'hello world';

JSONP.get({
    url: 'https://rawgit.com/aui/jsonp-sandbox/master/test/xss.js',
    value: 'jsonp_callback',
    success: function (data) {
        console.log(data);
    },
    error: function(errors) {
        console.error(errors);
    }
});
```
## 环境测试

IE5+、Edge、Chrome、Firefox、Safari
