(function(e){function t(t){for(var n,d,u=t[0],i=t[1],c=t[2],s=0,p=[];s<u.length;s++)d=u[s],Object.prototype.hasOwnProperty.call(o,d)&&o[d]&&p.push(o[d][0]),o[d]=0;for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(e[n]=i[n]);l&&l(t);while(p.length)p.shift()();return r.push.apply(r,c||[]),a()}function a(){for(var e,t=0;t<r.length;t++){for(var a=r[t],n=!0,d=1;d<a.length;d++){var i=a[d];0!==o[i]&&(n=!1)}n&&(r.splice(t--,1),e=u(u.s=a[0]))}return e}var n={},o={app:0},r=[];function d(e){return u.p+"js/"+({about:"about"}[e]||e)+"."+{about:"e001139a"}[e]+".js"}function u(t){if(n[t])return n[t].exports;var a=n[t]={i:t,l:!1,exports:{}};return e[t].call(a.exports,a,a.exports,u),a.l=!0,a.exports}u.e=function(e){var t=[],a=o[e];if(0!==a)if(a)t.push(a[2]);else{var n=new Promise((function(t,n){a=o[e]=[t,n]}));t.push(a[2]=n);var r,i=document.createElement("script");i.charset="utf-8",i.timeout=120,u.nc&&i.setAttribute("nonce",u.nc),i.src=d(e);var c=new Error;r=function(t){i.onerror=i.onload=null,clearTimeout(s);var a=o[e];if(0!==a){if(a){var n=t&&("load"===t.type?"missing":t.type),r=t&&t.target&&t.target.src;c.message="Loading chunk "+e+" failed.\n("+n+": "+r+")",c.name="ChunkLoadError",c.type=n,c.request=r,a[1](c)}o[e]=void 0}};var s=setTimeout((function(){r({type:"timeout",target:i})}),12e4);i.onerror=i.onload=r,document.head.appendChild(i)}return Promise.all(t)},u.m=e,u.c=n,u.d=function(e,t,a){u.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:a})},u.r=function(e){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},u.t=function(e,t){if(1&t&&(e=u(e)),8&t)return e;if(4&t&&"object"===typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(u.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)u.d(a,n,function(t){return e[t]}.bind(null,n));return a},u.n=function(e){var t=e&&e.__esModule?function(){return e["default"]}:function(){return e};return u.d(t,"a",t),t},u.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},u.p="/",u.oe=function(e){throw console.error(e),e};var i=window["webpackJsonp"]=window["webpackJsonp"]||[],c=i.push.bind(i);i.push=t,i=i.slice();for(var s=0;s<i.length;s++)t(i[s]);var l=c;r.push([0,"chunk-vendors"]),a()})({0:function(e,t,a){e.exports=a("56d7")},"034f":function(e,t,a){"use strict";var n=a("85ec"),o=a.n(n);o.a},"56d7":function(e,t,a){"use strict";a.r(t);a("e260"),a("e6cf"),a("cca6"),a("a79d");var n=a("2b0e"),o=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",{attrs:{id:"app"}},[a("div",{attrs:{id:"nav"}},[a("router-link",{attrs:{to:"/"}},[e._v("首页")]),e._v(" | "),a("router-link",{attrs:{to:"/about"}},[e._v("更多详情")])],1),a("router-view")],1)},r=[],d=(a("034f"),a("2877")),u={},i=Object(d["a"])(u,o,r,!1,null,null,null),c=i.exports,s=(a("d3b7"),a("8c4f")),l=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",{staticClass:"home"},[a("map_home")],1)},p=[],_=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",{staticClass:"map"},[a("div",{staticClass:"heders"},[a("b",[e._v("全国(含港澳台) "),a("code",[e._v(e._s(e.times)+"数据统计")])]),a("ul",[a("li",[a("p",[e._v("现存确诊")]),a("p",[e._v(e._s(e.econNum))]),a("p",[e._v("较昨日"),a("code",[e._v(" "+e._s(e.addecon_new))])])]),a("li",[a("p",[e._v("现存确诊重症")]),a("p",[e._v(e._s(e.heconNum))]),a("p",[e._v("较昨日 "),a("code",[e._v(" "+e._s(e.addhecon_new))])])]),a("li",[a("p",[e._v("现存疑似")]),a("p",[e._v(e._s(e.sustotal))]),a("p",[e._v("较昨日 "),a("code",[e._v(e._s(e.wjw_addsus_new))])])]),a("li",[a("p",[e._v("累计确诊")]),a("p",[e._v(e._s(e.ALLtoal))]),a("p",[e._v("较昨日 "),a("code",[e._v(e._s(e.addcon_new))])])]),a("li",[a("p",[e._v("累计死亡")]),a("p",[e._v(e._s(e.deathtotal))]),a("p",[e._v("较昨日 "),a("code",[e._v(e._s(e.adddeath_new))])])]),a("li",[a("p",[e._v("累计治愈")]),a("p",[e._v(e._s(e.curetotal))]),a("p",[e._v("较昨日 "),a("code",[e._v(e._s(e.addcure_new))])])])])]),a("div",{staticStyle:{width:"100%",height:"800px"},attrs:{id:"chart"}})])},m=[],f=(a("d81d"),a("b0c0"),a("313e")),v=a.n(f),h=(a("3139"),a("f2e8")),w=a.n(h),b=(a("5118"),{title:{text:"2020年新型冠状病毒肺炎疫情地图",x:"center",y:"top",textAlign:"left",textStyle:{color:"#9c0505"}},tooltip:{trigger:"item",formatter:"地区：{b}<br/>现有确诊：{c}<br/> "},series:[{name:"six",type:"map",mapType:"china",label:{show:!0,color:"black"},emphasis:{label:{fontSize:15},itemStyle:{}}}],visualMap:{type:"piecewise",show:!0,pieces:[{min:5e4},{min:1e4,max:5e4},{min:5e3,max:9999},{min:1e3,max:4999},{min:200,max:999},{min:1,max:199,label:"10 到 200（自定义label）"},{value:0}],inRange:{color:["#fff","#ffaa85","#660208"],symbolSize:[30,100]}}}),y={name:"Map_home",data:function(){return{myChart:"",times:"",econNum:"",addecon_new:"",heconNum:"",addhecon_new:"",sustotal:"",wjw_addsus_new:"",ALLtoal:"",addcon_new:"",deathtotal:"",adddeath_new:"",curetotal:"",addcure_new:""}},mounted:function(){this.getdata(),this.myChart=v.a.init(document.getElementById("chart"))},methods:{getdata:function(){var e=this;w()("https://interface.sina.cn/news/wap/fymap2020_data.d.json",(function(t,a){var n=a.data.list.map((function(e){return{name:e.name,value:e.value,econNum:e.econNum,cureNum:e.cureNum,deathNum:e.deathNum}}));console.log("数据：",a.data,a.data.gntotal),e.times=a.data.times,e.econNum=a.data.econNum,e.addecon_new=a.data.add_daily.addecon_new,e.heconNum=a.data.heconNum,e.addhecon_new=a.data.add_daily.addhecon_new,e.sustotal=a.data.sustotal,e.wjw_addsus_new=a.data.add_daily.wjw_addsus_new,e.ALLtoal=a.data.gntotal,e.addcon_new=a.data.add_daily.addcon_new,e.deathtotal=a.data.deathtotal,e.adddeath_new=a.data.add_daily.adddeath_new,e.curetotal=a.data.curetotal,e.addcure_new=a.data.add_daily.addcure_new,b.series[0].data=n,e.myChart.setOption(b)}))}},beforeDestroy:function(){}},g=y,x=(a("59ea"),Object(d["a"])(g,_,m,!1,null,"4e2b4468",null)),j=x.exports,O={name:"Home",components:{Map_home:j}},N=O,S=Object(d["a"])(N,l,p,!1,null,null,null),P=S.exports;n["a"].use(s["a"]);var k=[{path:"/",name:"Home",component:P},{path:"/about",name:"About",component:function(){return a.e("about").then(a.bind(null,"f820"))}}],C=new s["a"]({mode:"history",base:"/",routes:k}),L=C,E=a("2f62");n["a"].use(E["a"]);var M=new E["a"].Store({state:{},mutations:{},actions:{},modules:{}});n["a"].config.productionTip=!1,new n["a"]({router:L,store:M,render:function(e){return e(c)}}).$mount("#app")},"59ea":function(e,t,a){"use strict";var n=a("837c"),o=a.n(n);o.a},"837c":function(e,t,a){},"85ec":function(e,t,a){}});
//# sourceMappingURL=app.3917f810.js.map