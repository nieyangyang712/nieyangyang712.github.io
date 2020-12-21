define(['bmt/SgHelper'], function (arg1) {
  var sg; //简单路由服务
  var obj; //客户端对象
  var sn; //请求的顺序号
  var receiveData

  sg = arg1;

  //创建客户端对象

  var wsConnect = (ip, path) => {
    obj = new sg.Client(ip, path);
    obj.Open();
  }

  //连接到简单路由服务


  //sn设置为1
  sn = 1;

  var wsClose = () => {
    obj.Close()
    obj = null
  }

  var wsReceiveData = (page = null) => {
    return new Promise((resolve, reject) => {
      obj.SetHandler({
        //接收到应答
        'cbData': function (appHeader, appData) {
          console.log(appData)
          if (page) {
            var param = {
              title: page,
              data: appData
            }
            window.postMessage(param, `${window.location.href}`);
          }

          resolve(appData)
        },
      });
    });
  }

  var wsSendData = (header, data) => {
    var appHeader = {
      appType: sg.APP_TYPE.APP_REQUEST,
      sequenceNo: sn++, //请求的顺序号递增
      totalPacketCount: 1,
      currentPacketNo: 1,
      destAddr: {
        domainId: header.domainId,
        appNodeId: header.appNodeId
      }, //目标地址
      reqName: header.reqName,
      reqNo: header.reqNo,
      dataFormat: sg.DATA_FORMAT.DATA_JSON, //数据类型为json
      result: 0,
      chReversed: '',
      additionalDestCount: 0,
    };

    var appData = data
    //准备待发送的数据
    appData.sleepTime = Math.floor(Math.random() * 5);
    appData.a = Math.floor(Math.random() * 100) + 1;
    appData.b = Math.floor(Math.random() * 200) + 1;
    //发送请求
    console.log(appHeader, appData)
    obj.SendData(appHeader, appData);
  }

  return {
    wsConnect: wsConnect,
    wsClose: wsClose,
    wsReceiveData: wsReceiveData,
    wsSendData: wsSendData
  }

});