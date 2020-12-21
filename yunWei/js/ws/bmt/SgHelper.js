define(
  [
    "bmt/BmtStruct",
    "logger",
  ],
  function (_, Logger) {
    // 标识符的命名，以"_"为后缀的方法或变量仅供Sg库内部使用，否则是内外部都可使用。

    //给String增加一个扩展方法,format
    //方式1
    //var result = '我的{0}是{1}'.format('id','城市之光');
    //方式2
    //var test = '我的{name1}是{name2}';
    //var result = test.format({name1:'id',name2:'城市之光'});
    if (typeof (String.prototype.format) == "undefined") {
      String.prototype.format = function () {
        if (arguments.length == 0)
          return this;
        for (var s = this, i = 0; i < arguments.length; i++)
          s = s.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
        return s;
      };
    }

    Logger.useDefaults({
      defaultLevel: Logger.TRACE,
      formatter: function (messages, context) {
        messages.unshift(context.name);
        messages.unshift(new Date().toJSON());
      }
    });
    var logger = Logger.get('SgHelper');

    var Sg = {};
    Sg.AssertBreak = false;
    //在调试时，可以将其设置为true，这样，Sg.Assert或Sg.AssertN的条件不满足时，除了会在日志中打印出错位置，还会中断，以进行立即调试。

    Sg.Assert = function () {
      console.assert.apply(null, arguments);
      if (arguments[0]) //断言正常
        return; //返回
      //打印出断言的位置

      var stack = (new Error).stack.toString();
      var n = stack.indexOf("\n", 1);
      var n2 = stack.indexOf("\n", n + 1);
      logger.info("assert position:" + stack.substring(n + 1, n2));
      if (Sg.AssertBreak)
        debugger;
    }

    // Assert并且打印出调用栈（目前是4层）
    Sg.AssertN = function () {
      console.assert.apply(null, arguments);
      if (arguments[0]) //断言正常
        return; //返回
      //打印出断言的调用栈
      var stack = (new Error).stack.toString();
      var i = 0,
        n = 4;
      var p = 0;
      logger.info("assert call stack ({0} level):".format(n));
      p = stack.indexOf("\n", p + 1);
      for (; i < n && p > 0; i++) {
        var p2 = stack.indexOf("\n", p + 1);
        logger.info(stack.substring(p + 1, p2));
        p = p2;
      }
      if (Sg.AssertBreak)
        debugger;
    }

    // Sg头
    var stuSgHeader_ = BmtStruct.createStruct(
      BmtStruct._INT32("totalLength"), //总长度，包含头
      BmtStruct._string("sig", 'ansi', 4), //固定字符串"SMSG"
      BmtStruct._INT16("version"), //协议版本号，二字节，高位主版本号，低位次版本号。当前为1.0
      BmtStruct._INT16("category"), //分类，1.应用消息，11.应用节点标识，12.获取活动节点等其它类别
      BmtStruct._INT32("md5code"), //md5码，上述内容（从totalLength到category）的MD5值
    );
    // Sg地址，由域标识和应用节点标识组成
    Sg.stuSgAddr = BmtStruct.createStruct(
      BmtStruct._string("domainId", 'ansi', 32), //域标识
      BmtStruct._string("appNodeId", 'ansi', 32), //应用节点标识
    );

    // 初始化应答
    var stuInitAck_ = BmtStruct.createStruct(
      BmtStruct._string("err", 'unicode'),
      BmtStruct._string("localDomainId", 'unicode'),
      BmtStruct._array("nodeAddrs", Sg.stuSgAddr),
    );
    // 节点变化
    var stuNodeChanged_ = BmtStruct.createStruct(
      BmtStruct._struct("nodeAddr", Sg.stuSgAddr),
      BmtStruct._bool("appear"),
    );
    //应用类型
    Sg.APP_TYPE = {
      APP_REQUEST: 1, //请求
      APP_EVENT: 2, //事件
      APP_ACK: 3, //请求对应的应答
    };
    //应用数据的格式
    Sg.DATA_FORMAT = {
      DATA_BINARY: 1, //二进制
      DATA_XML: 2, //xml
      DATA_JSON: 3, //json
      DATA_XML_ANSI: 4, //xml(ansi)
      DATA_JSON_ANSI: 5, //json(ansi)
    };
    //可能接收到的Sg帧类型
    Sg.FRAME_CATEGORY_ = {
      SG_FRAME_INIT_ACK: 12, //初始应答
      SG_FRAME_ACTIVE_NODE_CHANGED: 16, //活动节点发生变化
      SG_FRAME_APP: 1, //应用报文
    };
    //应用头
    Sg.stuAppHeader = BmtStruct.createStruct(
      BmtStruct._INT8("appType"), //低7位：见Sg.APP_TYPE。最高位，如果为1表示由于目标地址无效，而被退回的帧。
      BmtStruct._INT32("sequenceNo"), //发送序号，应答消息需要返回一样的sequenceNo
      BmtStruct._INT16("totalPacketCount"), //总包数
      BmtStruct._INT16("currentPacketNo"), //当前包号
      BmtStruct._struct("srcAddr", Sg.stuSgAddr), //源地址
      BmtStruct._struct("destAddr", Sg.stuSgAddr), //目标地址
      BmtStruct._string("reqName", 'ansi', 32), //请求的名称，填写应用请求号的说明，可为空
      BmtStruct._INT32("reqNo"), //应用请求号，决定了reqName
      BmtStruct._INT32("result"), //响应结果，对于appType为3时有意义 
      BmtStruct._INT8("dataFormat"), //应用数据格式，见Sg.DATA_FORMAT
      BmtStruct._INT16("additionalDestCount"), //目标个数，为零时表示无附加目标列表
      BmtStruct._string("chReversed", 'ansi', 128), //保留
    );
    Sg.psetting = {
      littleEndian: true, //小端机
      code: 'unicoe', //unicode方式
    };

    const SG_HEADER_SIZE_ = stuSgHeader_.size(Sg.psetting, null);
    const SG_ADDR_SIZE_ = Sg.stuSgAddr.size(Sg.psetting, null);
    const APP_HEADER_SIZE_ = Sg.stuAppHeader.size(Sg.psetting, null);

    // 线路，代表和一个路由服务的ws连接
    Sg.Line = function (endPoint, client) {
      this.endPoint = endPoint;
      this.client = client;
      this.isConnectedToWS = false; //是否与WS建立连接
      this.peerAddrSet = new Set();
      this.ws = null;
    }
    Sg.Line.prototype = {
      constructor: Sg.Line,
      // 开启ws连接
      TryConnect_: function () {
        var thisClient = this.client;

        if (this.ws)
          this.ws.close();
        this.ws = new WebSocket('ws://{0}/{1}/{2}/'.format(this.endPoint, thisClient.appNodeId, thisClient.appNodeIdMain));

        var thisLine = this;
        this.ws.onopen = function () {
          clearTimeout(thisLine.wsTimerId);
        }
        this.ws.onclose = function (event) {
          if (thisClient.isOpened)
            thisLine.wsTimerId = setTimeout(() => thisLine.TryConnect_(), thisClient.reconnectWaitTime);
          thisLine.OnWebservice_(false);
        }
        this.ws.onerror = function (event) {
          logger.error("({0}:{1})ws onerror({2})".format(thisLine.endPoint, thisClient.appNodeId, JSON.stringify(event)));
        }
        this.ws.onmessage = function (evt) {
          var reader = new FileReader();
          reader.readAsArrayBuffer(evt.data);
          reader.onload = function (e) {
            var ctx = new BmtStruct.Context(reader.result);
            thisLine.eatup = false;
            var sgHeader = thisLine.GetSgHeader_(ctx);
            if (!sgHeader) //SG头出错
              return; //不进行后续处理
            if (Sg.FRAME_CATEGORY_.SG_FRAME_APP == sgHeader.category)
              thisLine.OnApp_(ctx);
            else if (Sg.FRAME_CATEGORY_.SG_FRAME_INIT_ACK == sgHeader.category)
              thisLine.OnInitAck_(ctx);
            else if (Sg.FRAME_CATEGORY_.SG_FRAME_ACTIVE_NODE_CHANGED == sgHeader.category)
              thisLine.OnNodeChanged_(ctx);
            else
              logger.error("接收到帧，帧类型为" + sgHeader.category + ",该类型的帧不支持");

            if (thisLine.eatup)
              Sg.Assert(0 == ctx.Left(), "必须用完所有接收的数据，而实际剩余" + ctx.Left() + "字节");
          }
        }
      },
      Close_: function () {
        if (this.ws) {
          this.ws.close();
          delete this.ws;
        }
        clearTimeout(this.wsTimerId);
      },
      //获取Sg头
      GetSgHeader_: function (ctx) {
        var thisClient = this.client;
        var sgHeader = stuSgHeader_.unpack(ctx, Sg.psetting);
        var actualLength = ctx.Left() + SG_HEADER_SIZE_;
        //检查长度是否一致
        if (sgHeader.totalLength != actualLength) {
          logger.error('应用节点({0})，帧长度不一致，头中指定的长度为{1}，而实际发送的长度为{2}'.format(thisClient.appNodeId, sgHeader.totalLength, actualLength));
          return;
        }
        //检查标志字符串
        if (sgHeader.sig != "SMSG") {
          logger.error('应用节点({0})，SG报文头中报文标志不是SMSG'.format(thisClient.appNodeId));
          return;
        }
        //检查md5
        var strMd5InHeader = String.fromCharCode.apply(null, new Uint8Array(ctx.dv.buffer, SG_HEADER_SIZE_ - 4, 4));
        var strIn = String.fromCharCode.apply(null, new Uint8Array(ctx.dv.buffer, 0, SG_HEADER_SIZE_ - 4));
        var strMd5Calculated = BmtStruct.md5(strIn, null, true).substr(0, 4);
        if (strMd5Calculated != strMd5InHeader) {
          logger.error('应用节点({0})，SG报文的MD5验证码不一致'.format(thisClient.appNodeId));
          return;
        }
        return sgHeader;
      },
      //接收到应用帧
      OnApp_: function (ctx) {
        var thisClient = this.client;
        var appHeader = Sg.stuAppHeader.unpack(ctx, Sg.psetting);
        var appDataType;
        if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_BINARY)
          appDataType = BmtStruct.SimpleType._uint8array;
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON)
          appDataType = BmtStruct.SimpleType._ustring;
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML_ANSI || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON_ANSI)
          appDataType = BmtStruct.SimpleType._astring;
        else {
          logger.error('应用节点({0})，接收到应用帧，但是帧的数据类型为{1},不被支持，但支持1-5，帧头为{2}'.format(thisClient.appNodeId, appHeader.dataFormat, appHeader));
          return;
        }
        var appData = appDataType.unpack(ctx, Sg.psetting);
        if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON_ANSI)
          appData = JSON.parse(appData);
        var clientHandler = thisClient.handler;
        if (clientHandler && clientHandler.cbData)
          clientHandler.cbData.call(clientHandler, appHeader, appData);
        this.eatup = true;
      },
      // 接收到初始应答帧
      OnInitAck_: function (ctx) {
        var thisClient = this.client;
        var v = stuInitAck_.unpack(ctx, Sg.psetting);
        if (v.err) {
          logger.error('应用节点({0})，初始化失败，{1}'.format(thisClient.appNodeId, v.err));
        } else {
          if (thisClient.domainId.length == 0)
            thisClient.domainId = v.localDomainId;
          else
            Sg.AssertN(thisClient.domainId == v.localDomainId, '互为备份的路由的域名称不一致，{0}，{1}'.format(thisClient.domainId, v.localDomainId));
          this.OnWebservice_(true);
          this.peerAddrSet.clear();
          for (let item of v.nodeAddrs) {
            this.peerAddrSet.add(JSON.stringify(item));
            var clientHandler = thisClient.handler;
            if (clientHandler && clientHandler.cbAppNodeChanged)
              clientHandler.cbAppNodeChanged.call(clientHandler, this.endPoint, item, true);
          }
        }
        this.eatup = true;
      },
      // 接收到节点变化帧
      OnNodeChanged_: function (ctx) {
        var thisClient = this.client;
        var v = stuNodeChanged_.unpack(ctx, Sg.psetting);
        if (v.appear)
          this.peerAddrSet.add(JSON.stringify(v.nodeAddr));
        else
          this.peerAddrSet.delete(JSON.stringify(v.nodeAddr));
        var clientHandler = thisClient.handler;
        if (clientHandler && clientHandler.cbAppNodeChanged)
          clientHandler.cbAppNodeChanged.call(clientHandler, this.endPoint, v.nodeAddr, v.appear);
        this.eatup = true;
      },
      /// 与Websocket服务连接状态变化
      OnWebservice_: function (isValid) {
        if (this.isConnectedToWS == isValid)
          return;

        this.isConnectedToWS = isValid;
        var clientHandler = this.client.handler;
        if (!isValid) {
          //原有的节点变为无效
          if (clientHandler && clientHandler.cbAppNodeChanged) {
            for (let v of this.peerAddrSet)
              clientHandler.cbAppNodeChanged.call(clientHandler, this.endPoint, JSON.parse(v), false);
          }
          this.peerAddrSet.clear();
        }
        if (clientHandler && clientHandler.cbWebservice)
          clientHandler.cbWebservice.call(clientHandler, this.endPoint, isValid);
      },
      IsAddrValid_: function (addr) {
        return this.peerAddrSet.has(JSON.stringify(addr));
      },
      FitDestNum_: function (destAddr, additionalDestAddrs) {
        var fitNum = 0;
        if (this.IsAddrValid_(destAddr))
          fitNum++;
        var thisLine = this;
        additionalDestAddrs.forEach(function (item) {
          if (thisLine.IsAddrValid_(item))
            fitNum++;
        });
        return fitNum;
      },
    };
    // Sg.Client对象，表示一个应用节点。它直接连接到路由服务。
    /* 构造函数
     *
     * @param[in] endPoint webservice的访问点列表，形式为host:port(;host:port)*（例如localhost:8801;localhost:8802），以分号隔开多个互备的路由服务。
     * @param[in] appNodeId 客户端的应用节点标识，最大32字节的字符串。
     * @param[in] appNodeIdMain 相应的主节点标识。如果不为空，表示本节点是appNodeIdMain的备节点。如果为空，表示本节点不是备节点。
     */
    Sg.Client = function (endPointList, appNodeId, appNodeIdMain) {
      Sg.AssertN(typeof (endPointList) == "string" || typeof (endPointList) == "object" && endPointList instanceof String, "endPoint必须是字符串");
      this.appNodeId = appNodeId;
      this.appNodeIdMain = appNodeIdMain || '';
      this.lines = [];
      var thisClient = this;
      endPointList.split(';').forEach(item => thisClient.lines.push(new Sg.Line(item, thisClient)));
      this.domainId = '';
      var thisClient = this;

      this.handler = {
        cbWebservice: function (endPoint, isValid) {
          logger.info("应用节点({0})与域({1})从{2}{3}".format(thisClient.appNodeId, thisClient.domainId, endPoint, isValid ? "接通" : "断开"));
        },
        cbAppNodeChanged: function (endPoint, addr, isValid) {
          logger.info("应用节点({0})从{1}发现其它应用节点({2},{3}){4}".format(thisClient.appNodeId, endPoint, addr.domainId, addr.appNodeId, isValid ? "连通" : "断开"));
        },
        cbData: function (appHeader, appData) {
          logger.info("应用节点({0})接收到数据，数据头为({1})，数据为({2})".format(thisClient.appNodeId, JSON.stringify(appHeader), JSON.stringify(appData)));
        },
      };

    }
    Sg.Client.prototype = {
      constructor: Sg.Client,
      /// 获取事件处理器对象
      GetHandler: function () {
        return this.handler;
      },
      /** 设置事件处理器对象
      *
      * @param[in] handler 事件处理对象，可以包含三个事件回调，如果没有提供，则不处理该事件。如果从来没有设置过，缺省的事件回调仅用日志记录发生的事件。
      		{
      			//与Websocket服务连接状态变化，参数endPoint表示通过的路由服务，参数isValid为true表示接通，为false表示断开。
      			cbWebservice : function(endPoint, isValid) {
      			},
      			//应用节点发生变化，参数endPoint表示通过的路由服务，参数nodeAddr表示节点地址，类型是Sg.stuSgAddr，参数appear为true表示出现，为false表示消失。
      			cbAppNodeChanged : function(endPoint, nodeAddr, appear) {
      			},
      			//接收到应用数据，参数appHeader表示应用头，类型是Sg.stuAppHeader，参数appData表示应用数据，如果appHeader.dataFormat是Sg.DATA_FORMAT.DATA_BINARY(1)，类型是Uint8Array，否则类型是String。
      			cbData : function(appHeader, appData) {
      			},
      		 };
      */
      SetHandler: function (handler) {
        this.handler = handler;
        if (!handler)
          return;

        Sg.AssertN(handler instanceof Object, "handler是一对象，包含了所有请求的处理函数");
        if (handler.cbWebservice)
          Sg.AssertN(typeof (handler.cbWebservice) == "function" && handler.cbWebservice.length == 2, "WebService状态变化函数必须有2个参数");
        if (handler.cbAppNodeChanged)
          Sg.AssertN(typeof (handler.cbAppNodeChanged) == "function" && handler.cbAppNodeChanged.length == 3, "模块变化函数必须有3个参数");
        if (handler.cbData)
          Sg.AssertN(typeof (handler.cbData) == "function" && handler.cbData.length == 2, "接收数据的函数必须有2个参数");
      },

      /// 打开, reconnectWaitTime，连接失败后到下一次重新连接的间隔时间，单位为毫秒
      Open: function (reconnectWaitTime) {
        if (this.isOpened)
          return;
        if ("WebSocket" in window) {
          this.isOpened = true;
          this.reconnectWaitTime = reconnectWaitTime || 5000;
          this.lines.forEach((item) => item.TryConnect_());
        } else {
          // 浏览器不支持 WebSocket
          alert("您的浏览器不支持 WebSocket!");
        }
      },

      /// 关闭
      Close: function () {
        if (!this.isOpened)
          return;
        this.lines.forEach(item => item.Close_());
        this.isOpened = false;
      },


      /// 节点地址是否有效
      IsAddrValid: function (addr) {
        //在所有lines中，查找其peerAddrMap中是否存在。
        return this.lines.some(line => line.IsAddrValid_(addr));
      },
      /// 是否和Webservice连接成功
      IsWebsockOk: function (endPointIndex) {
        AssertN(typeof (endPointIndex) === 'number' && endPointIndex >= 0 && endPoint < this.lines.length, 'endPointIndex必须是数字')
        var ws = this.lines[endPointIndex].ws;
        return ws && ws.readyState == 1; //OPEN
      },

      /** 发送数据
       *
       * @param[in] appHeader 应用头。
       * @param[in] appData 应用数据，应用头中的dataFormat指明了类型。
       * @param[in] additionalDestAddrs 附加目标地址，元素类型为Sg.stuSgAddr的数组。如果没有附加目标，可以没有此参数，也可以是一个空的数组。
       */
      SendData: function (appHeader, appData, additionalDestAddrs) {
        //检查appType字段
        Sg.AssertN(appHeader.appType >= Sg.APP_TYPE.APP_REQUEST && appHeader.appType <= Sg.APP_TYPE.APP_ACK, "应用类型({0})不在合理范围".format(appHeader.appType));

        //检查additionalDestCount字段
        Sg.AssertN(typeof (appHeader.additionalDestCount) === 'undefined' || appHeader.additionalDestCount == 0, "这个字段由本方法维护，不要提供，或者设置为0");
        var additionalAddrsLength = 0;
        if (additionalDestAddrs) //有此参数
        {
          Sg.AssertN(Array.isArray(additionalDestAddrs), "附加目标地址必须是数组,且可以被Sg.stuSgAddr打包");
          appHeader.additionalDestCount = additionalDestAddrs.length;
          additionalAddrsLength = additionalDestAddrs.length * SG_ADDR_SIZE_;
        } else
          additionalDestAddrs = new Array(0);

        //检查dataFormat字段
        if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_BINARY)
          Sg.AssertN(typeof (appData) === 'object' && appData instanceof Uint8Array, "数据格式为二进制时，appData的类型一定是Uint8Array");
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML_ANSI)
          Sg.AssertN(typeof (appData) === 'string' || typeof (appData) === 'object' && appData instanceof String, "数据格式为xml时，appData的类型一定是字符串");
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON_ANSI)
          Sg.AssertN(Array.isArray(appData) || typeof (appData) === 'object', "数据格式为json，appData的类型一定是对象或数组");
        else
          Sg.AssertN(false, "应用数据的数据格式只能是xml、二进制及json");

        var appDataType; //appData使用的数据类型
        if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_BINARY)
          appDataType = BmtStruct.SimpleType._uint8array;
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON)
          appDataType = BmtStruct.SimpleType._ustring;
        else if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_XML_ANSI || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON_ANSI)
          appDataType = BmtStruct.SimpleType._astring;

        //源地址赋值
        appHeader.srcAddr = {
          domainId: this.domainId,
          appNodeId: this.appNodeId,
        };

        //检查destAddr
        Sg.AssertN(appHeader.destAddr.domainId.length > 0 && appHeader.destAddr.appNodeId.length > 0, "目标地址不能为空，必须填写");
        var bestLine = this.GetBestLine_(appHeader.destAddr, additionalDestAddrs);
        if (!bestLine) {
          logger.warn('应用节点({0})，没有路由可以到达目标，数据将被退回'.format(this.appNodeId));
          this.SendBack_(appHeader, appData, additionalDestAddrs)
          return;
        }
        try {
          //分配内存
          let actualData = appData; //实际发送数据
          if (appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON_ANSI || appHeader.dataFormat == Sg.DATA_FORMAT.DATA_JSON) //如果是json格式
            actualData = JSON.stringify(appData); //做json转换
          var totalLength = SG_HEADER_SIZE_ + APP_HEADER_SIZE_ + additionalAddrsLength + appDataType.size(Sg.psetting, actualData);
          var buf = new ArrayBuffer(totalLength);
          var ctx = new BmtStruct.Context(buf);
          //打包Sg头
          this.FillSgHeader_(ctx, Sg.FRAME_CATEGORY_.SG_FRAME_APP, totalLength);
          //打包App头
          Sg.stuAppHeader.pack(ctx, Sg.psetting, appHeader);
          //打包附加地址
          for (let i = 0; i < appHeader.additionalDestCount; i++)
            Sg.stuSgAddr.pack(ctx, Sg.psetting, additionalDestAddrs[i]);
          //打包应用数据
          appDataType.pack(ctx, Sg.psetting, actualData);

          //发送
          bestLine.ws.send(buf);
        } catch (err) {
          logger.error('应用节点({0})，数据打包发送发生错误，{1}'.format(this.appNodeId, err));
        }
      },

      GetBestLine_: function (destAddr, additionalDestAddrs) {
        const len = this.lines.length;
        var result = new Array(len);
        this.lines.forEach((line, index) => result[index] = line.FitDestNum_(destAddr, additionalDestAddrs));
        var min = 0;
        var candidate = [];
        for (var i = 0; i < len; i++) {
          var cur = result[i];
          if (cur == 0) //可达目标数为0，表示所有的目标都不可达
            continue; //跳过
          if (cur > min) //比原有的更大
          {
            min = cur;
            candidate = []; //清除原有的
            candidate.push(i); //增加当前的
          } else if (cur == min) //相同
          {
            candidate.push(i); //增加到候选表
          } else //更小
          {
            //不进行操作
          }
        }
        var clen = candidate.length;
        if (clen == 0) //没有候选者
          return; //返回空

        var idx = this.GetLineIndex_(clen);
        return this.lines[candidate[idx]];
      },

      GetLineIndex_: function (clen) {
        //总是取第一个
        //return 0;

        //随机
        //function getRandomInt(max) {
        //  return Math.floor(Math.random() * Math.floor(max));
        //}
        //return getRandomInt(clen);

        //轮流
        this.lineIndex = this.lineIndex || -1;
        this.lineIndex++;
        return this.lineIndex %= clen;
      },

      // 设置Sg头
      FillSgHeader_: function (ctx, category, totalLength) {
        stuSgHeader_.pack(ctx, Sg.psetting, {
          totalLength: totalLength,
          sig: "SMSG",
          version: 0x0100, //版本号1.0
          category: category,
          md5code: 0, //先设置为0
        });
        //计算md5
        var strIn = String.fromCharCode.apply(null, new Uint8Array(ctx.dv.buffer, 0, SG_HEADER_SIZE_ - 4));
        var strMd5Calculated = BmtStruct.md5(strIn, null, true).substr(0, 4);
        //将md5值复制到偏移12字节处
        var md5p = new Uint8Array(ctx.dv.buffer, SG_HEADER_SIZE_ - 4, 4);
        for (let i = 0; i < 4; i++)
          md5p[i] = strMd5Calculated.charCodeAt(i);
      },

      //由于没有连接到路由，直接传回待发送数据
      SendBack_: function (appHeader, appData, additionalDestAddrs) {
        var clientHandler = this.handler;
        if (!clientHandler || !clientHandler.cbData)
          return;
        var newAppHeader = JSON.parse(JSON.stringify(appHeader));
        newAppHeader.appType -= 0x80; //将appType的最高位置1，以表示由于目标地址无效，而返回的帧
        newAppHeader.additionalDestCount = 0;
        clientHandler.cbData.call(clientHandler, newAppHeader, appData);
        additionalDestAddrs.forEach(function (destAddr) {
          newAppHeader.destAddr = destAddr;
          clientHandler.cbData.call(clientHandler, newAppHeader, appData);
        });
      },
    }
    return Sg;
  }
);