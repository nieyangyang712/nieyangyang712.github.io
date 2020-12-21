define(
	[
		"qunit",
		"bmt/SgHelper",
	],
	function(q)
	{
		Sg.AssertBreak = true;
		q.module("SgHelper" );
		function doneCheck(assert, n_)
		{
			var done = assert.async();
			var n = n_ || 1;
			
			//term为true时，表示立即终止
			return function(term)
			{
				if(term && n > 0) //且n>0表示没有执行过done()
				{
					n = 0; //置0，即使本函数再被调用，也不会再执行done()
					done();
					return;
				}
				
				if(--n == 0) //递减，如果为0，表示预定次数到了
					done(); //执行done();
			}
		}
		
		//开户一个app节点，它New一个Sg.Client对象，并打开。
		//节点对象缓存在ctx.obj上，ctx根据需要，可以缓存其它对象，如resove,reject,等
		function StartNode(ctx, ippList, appNodeId, appNodeIdMain, handler)
		{
			return new Promise((resolve, reject)=>{
				ctx.obj = new Sg.Client(ippList, appNodeId, appNodeIdMain);
				ctx.resolve = resolve;
				ctx.reject = reject;
				if(handler) //有handler，在Open()之前，SetHandler()
					ctx.obj.SetHandler(handler);
				else //没有handler，设置默认handler，在这个handler中，连接到ws成功后，做resolve()
					ctx.obj.SetHandler({cbWebservice : function(endPoint, isValid) {
						if(isValid)
							resolve();
					}, });
				ctx.obj.Open(); //建立连接
				
				//如果3秒未连接上，则reject
				setTimeout(()=>{
					reject('连接超时,' + ippList + '/' + appNodeId + '，请确认路由服务已经启动。');
				}, 3000); 
				
				//3秒之内，连上至少一个路由，则成功，否则进行出错提示。			});
		}
		//结束一个app节点，直接在ctx上进行
		function StopNode(ctx)
		{
			ctx.obj.Close();
		}
		//目标：与路由服务连接
		//前提条件：路由服务启动，ws端口为localhost:1080
		//原理：连接上路由后，
		//          cbWebservice事件会被调用，参数isValid为true。
		//          对于每个在线的AppNode，都会导致cbAppNodeChanged事件调用，nodeAddr是AppNode的地址，appear为true。所以至少自己的cbAppNodeChanged事件会被调用。
		//      appNode从路由断开后，
		//          对于每个在线的AppNode，都会导致cbAppNodeChanged事件调用，nodeAddr是AppNode的地址，appear为false。所以至少自己的cbAppNodeChanged事件会被调用。
		//          cbWebservice事件会被调用，参数isValid为false。
		q.test("websocket connect test", function(assert) 
		{
			var dc = doneCheck(assert, 4);

			var handler = {
				
				//与Websocket服务连接状态变化，参数isValid为true表示接通，为false表示断开。
				cbWebservice : function(endPoint, isValid) {
					if(isValid)
						ctx.resolve();
					this.no++; //递增顺序号
					if(isValid)
						assert.ok(this.no == 1, 'connect to ws ok'); //第一个事件
					else
						assert.ok(this.no == 4, 'disconnect from ws ok');//第四个事件
					dc();
				},
				//应用节点发生变化，参数nodeAddr表示节点地址，类型是Sg.stuSgAddr，参数appear为true表示出现，为false表示消失。
				cbAppNodeChanged : function(endPoint, nodeAddr, appear) {
					if(nodeAddr.appNodeId != 'ws_app0') //不是'ws_app0'，不关心
						return;//返回
					this.no++; //递增顺序号
					if(appear)
						assert.ok(this.no == 2, 'self appear ok'); //第二个事件
					else
						assert.ok(this.no == 3, 'self disappear ok'); //第三个事件
					dc();
				},
			};
			handler.no = 0;//初始为0
			
			var ctx = {};
			StartNode(ctx, 'localhost:1080', 'ws_app0', '', handler)
			.catch((msg)=>{
				assert.notOk(true, msg);
				dc(true);
			})
			.finally(()=>{
				StopNode(ctx); //立即关闭连接
			});
		});


		function SendData(ctx1, ctx2, appHeader, appData, additionalDestAddrs)
		{
			return new Promise((resolve, reject)=>{
				appHeader.additionalDestCount = 0;
				var receivedData = { forObj1 : [], forObj2 : [] };
				var left = 1;
				if(additionalDestAddrs)
					left += additionalDestAddrs.length;
				var EndCheck = function()
				{
					if(--left == 0)
						resolve(receivedData);
				}
				ctx1.obj.SetHandler({ cbData : function(appHeader_, appData_){
					console.log(new Date().toJSON(), 'receivedData.forObj1');
					receivedData.forObj1.push({appHeader : appHeader_, appData : appData_}); //缓存接收到的数据
					EndCheck();
				},
				});
				ctx2.obj.SetHandler({ cbData : function(appHeader_, appData_){
					console.log(new Date().toJSON(), 'receivedData.forObj2');
					receivedData.forObj2.push({appHeader : appHeader_, appData : appData_}); //缓存接收到的数据
					EndCheck();
				},
				});
				ctx1.obj.SendData(appHeader, appData, additionalDestAddrs);
				setTimeout(()=>{ reject(new Date().toJSON() + ',超时没有接收到数据'); }, 100); //100ms超时
			});
		}
		//需要发送的数据的app头
		var appHeader = {
			appType : Sg.APP_TYPE.APP_REQUEST,
			sequenceNo : 20,
			totalPacketCount : 1,
			currentPacketNo : 1,
			destAddr : {
				domainId : 'domain1',
				appNodeId : 'ws_app2',
			}, //目标地址
			reqName : 'cmd1',
			reqNo : 1,
			dataFormat : Sg.DATA_FORMAT.DATA_XML,
			result : 0,
			chReversed :'',
			additionalDestCount: 0,
		};
		
		//需要发送数据的数据内容
		var appData = '<info>一条从web发出的消息</info>';
		//目标：发送数据
		//前提条件：路由服务启动，ws端口为localhost:1080。在服务配置文件中指定，域的标识为'domin1'。
		//原理：连接上路由后，启动两个应用节点ws_app1,ws_app2，由ws_app1向ws_app2发送数据，ws_app2接收到数据，ws_app1接收到退回数据
		q.test("send data test", function(assert) 
		{
			var dc = doneCheck(assert);

			var ctx1 = {};
			var ctx2 = {};
			StartNode(ctx1, 'localhost:1080', 'ws_app1')
			.then(()=>{
				assert.ok(true, '节点1建立成功');
				return StartNode(ctx2, 'localhost:1080', 'ws_app2');
			})
			//两个连接都已建立，开始第一次数据发送，验证数据发送与接收
			.then(()=>{
				assert.ok(true, '节点2建立成功');
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_XML;
				return SendData(ctx1, ctx2, appHeader, appData);
			})
			.then((receivedData)=>{
				assert.ok(true, '接收数据成功');
				assert.ok(receivedData.forObj1.length == 0 && receivedData.forObj2.length == 1, 'obj1没有收到数据，obj2收到一条数据');
				let m = receivedData.forObj2[0];
				assert.deepEqual(m, {appHeader: appHeader, appData : appData}, '接收的数据正确');
			})
			//开始第二次数据发送，验证数据退回
			.then(()=>{
				appHeader.destAddr.appNodeId = 'ws_app3'; //改成一个不在线的目标
				return SendData(ctx1, ctx2, appHeader, appData, []);
			})
			.then((receivedData)=>{
				assert.ok(true, '检查退回的数据');
				assert.ok(receivedData.forObj2.length == 0 && receivedData.forObj1.length == 1, 'obj1接收到退回的一条数据，obj2没有收到数据');
				let m = receivedData.forObj1[0];
				assert.equal(m.appHeader.appType, Sg.APP_TYPE.APP_REQUEST - 128, '数据被退回，appType最高位置1');
				m.appHeader.appType = Sg.APP_TYPE.APP_REQUEST;//改回原值
				assert.deepEqual(m, {appHeader: appHeader, appData : appData}, '退回的数据除appHeader.appType外，全相同');
			})
			//第三次数据发送，验证一次向多个目标发数
			.then(()=>{
				appHeader.destAddr.appNodeId = 'ws_app2';
				return SendData(ctx1, ctx2, appHeader, appData, [{domainId:'domain1', appNodeId:'ws_app3'},]);
			})
			.then((receivedData)=>{
				assert.ok(receivedData.forObj2.length == 1 && receivedData.forObj1.length == 1, 'obj1接收到退回的一条数据，obj2收到一条数据');
			})
			//以json方式发送数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_JSON; //json格式
				return SendData(ctx1, ctx2, appHeader, {a : 1, b : 2});
			})
			.then((receivedData)=>{
				let m = receivedData.forObj2[0];
				assert.deepEqual(m.appData, {a : 1, b : 2}, 'json方式发送的数据和接收的数据一致');
			})
			.catch((msg)=>{
				assert.notOk(true, msg);
			})
			.finally(()=>{
				dc();
				StopNode(ctx1); //立即关闭连接
				StopNode(ctx2); //立即关闭连接
			});
		});
		

		function SendCommand(ctx, appHeader, appData)
		{
			return new Promise((resolve, reject)=>{
				var jd = JSON.stringify(appData);
				ctx.obj.SetHandler({
					cbData : function(appHeader_, appData_){
						console.log(new Date().toJSON(), '接收到命令的应答'+jd);
						resolve({appHeader : appHeader_, appData : appData_}); //缓存接收到的数据
						},
					});
				appHeader.additionalDestCount = 0;
				console.log(new Date().toJSON()+ '发送命令'+jd);
				ctx.obj.SendData(appHeader, appData);
				setTimeout(()=>{ reject(new Date().toJSON()+ '超时没有接收到命令的应答'+jd); }, 200); //100ms超时
			});
		}
		//目标：与qt编写的服务进行交互
		//前提条件：路由服务。ws端口为localhost:1080。在服务配置文件中指定，域的标识为'domin1'。
		//          qt编写的服务。该服务接收到命令，会进行应答。对xml以双倍字符串作为应答，对json对象的所有数值类型成员加一作为应答，对二进制数据不作改变作为应答。
		q.test("send data to qt client", function(assert) 
		{
			var dc = doneCheck(assert);

			var ctx = {};
			appHeader.destAddr = { domainId : 'domain1', appNodeId : 'app_s1'}; //目标是domain1,app_s1
			appHeader.appType = Sg.APP_TYPE.APP_REQUEST; //app类型是命令
			StartNode(ctx, 'localhost:1080', 'ws_app3')
			.then(()=>{
				assert.ok(true, '节点3建立成功');
			})
			//发送二进制格式数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_BINARY;
				return SendCommand(ctx, appHeader, new Uint8Array([0x01, 0x02, 0x03]));
			})
			//验证二进制的应答
			.then((receivedData)=>{
				assert.deepEqual(receivedData.appData, new Uint8Array([0x01, 0x02, 0x03]), '接收从qt服务的二进制的应答正确');
				assert.equal(receivedData.appHeader.appType, Sg.APP_TYPE.APP_ACK, '接收从qt服务的应答包的类型正确');
			})
			//发送json格式数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_JSON;
				return SendCommand(ctx, appHeader, {x : 1, y : 2 });
			})
			//验证json的应答
			.then((receivedData)=>{
				assert.deepEqual(receivedData.appData, {x : 2, y : 3}, '接收从qt服务的json对象的应答正确');
			})
			//发送json(ansi)格式数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_JSON_ANSI;
				return SendCommand(ctx, appHeader, {x : 1, y : 2 });
			})
			//验证json(ansi)的应答
			.then((receivedData)=>{
				assert.deepEqual(receivedData.appData, {x : 2, y : 3}, '接收从qt服务的json(ansi)对象的应答正确');
			})
			//发送xml格式数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_XML;
				return SendCommand(ctx, appHeader, 'abcd');
			})
			//验证xml的应答
			.then((receivedData)=>{
				assert.equal(receivedData.appData, 'abcdabcd', '接收从qt服务的xml的应答正确');
			})
			//发送xml(ansi)格式数据
			.then(()=>{
				appHeader.dataFormat = Sg.DATA_FORMAT.DATA_XML_ANSI;
				return SendCommand(ctx, appHeader, 'abcd');
			})
			//验证xml(ansi)的应答
			.then((receivedData)=>{
				assert.equal(receivedData.appData, 'abcdabcd', '接收从qt服务的xml(ansi)的应答正确');
			})
			.catch((msg)=>{
				assert.notOk(true, msg);
			})
			.finally(()=>{
				dc();
				StopNode(ctx); //立即关闭连接
			});
		});	
	}
);