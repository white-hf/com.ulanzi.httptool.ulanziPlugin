
/**
 * 代表一个连接会话，对应插件 ui不需要，仅仅一个。但对插件后台可能需要，一个插件
 * 如果安装在多个硬件按钮，并同一时段内都使用。
 */
class ConnectSession {
  actionId;
  remoteKey;
  isResponse;
}

/*
* 插件事件处理等逻辑基础类，包含公共方法
*/
class ActionBase {
  port;
  uuid;
  messageType;
  actionUUID;
  websocket;
  isResponse;
  remoteKey;
  isKeepAlive = true;

  data = {};
  actionChilds = new Map();

  constructor() {
  }


  /**
  * 连接上位软件服务
  * @param {string} port 
  * @param {string} uuid
  */
  connectUlanziDeckSocket(port, uuid) {
    this.port = port;
    this.uuid = uuid;

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    try {
      this.websocket = new WebSocket('ws://127.0.0.1:' + port);
      this.websocket.onopen = () => this.registerPlugin(uuid);

      this.websocket.onmessage = (evt) => this.dispatchEvent(evt);

      this.websocket.onerror = (evt) => {
         console.log('WEBSOCKET ERROR:' , evt);
    };

    this.websocket.onclose = (evt) => {
        console.log('WEBSOCKET CLOSED:', evt);
        if (this.isKeepAlive)
          this.connectUlanziDeckSocket(this.port , this.uuid)
    };

    } catch (error) {
      console.log('failed to connect the server');
    }

  }

  /**
   * 插件事件处理，需注意UI和后台的差异
   */
  dispatchEvent(evt) {
    console.log('dispatchEvent, json: ', evt.data)

    let jsonObj = null;
    try {
      jsonObj = JSON.parse(evt.data)      
    } catch (error) {
        console.log('Json parse failed,', evt.data)
        return
    }
    
    let event = jsonObj['cmd']

    //接收到的uuid，可以是主服务的uuid,也可以是action的uuid
    //插件知道自己的uuid，不需要保存参数中，如果和参数中的值不等，应该抛弃此命令。
    let uuid = jsonObj['uuid']
    this.remoteKey = jsonObj['key'] !== undefined?jsonObj['key']:this.remoteKey
    let param = jsonObj['param']

    let code = jsonObj['code']
    this.isResponse = code !== undefined

    //插件不知道自己的actionid，需要保存，主要插件后台有多个实例时需要。
    let uniqueActionId = this.actionUUID = jsonObj['actionid']

    if (this.actionUUID)
    { 
      //记录连接session     
      if (!this.actionChilds.has(uniqueActionId)) {
        let newSession = new ConnectSession()
        newSession.actionId = uniqueActionId
        newSession.uuid = this.uuid
        newSession.isResponse = this.isResponse;
        newSession.remoteKey = this.remoteKey;

        this.actionChilds.set(uniqueActionId, newSession)
      }
    }
  

    if (event === 'run') {
      this.onRun(uniqueActionId, this.uuid, this.remoteKey, param)
    } else if (event === 'add') {
      this.onAdd(uniqueActionId, this.uuid, this.remoteKey, param)
    } else if (event === 'clear') {
        uuid = param.uuid
        uniqueActionId = param.actionid
        key = param.key
        this.onClear(uniqueActionId, this.uuid, this.remoteKey, param)

        if (this.actionChilds.has(uniqueActionId)) {
          this.actionChilds.delete(uniqueActionId)
        }

      //关闭连接
      this.isKeepAlive = false;
      this.websocket.close()
    }
    else if (event === 'state') {

    } else if (event === 'paramfromplugin') {
      console.log('paramfromplugin received payload: ', param)
      this.onReceiveSettings(uniqueActionId, param)
    } else if (event === 'paramfromapp') {
      console.log('paramfromapp received payload: ', param)
      this.onLoadConfiguration(param)
    } else {
      const message = event;
      if (message && message !== '') this.emit(message, data);
    }
  }


  registerPlugin(inPluginUUID) {
    let json = {
      code: '0',
      cmd: 'connected',
      uuid: inPluginUUID
    }
    console.log('registerPlugin ' , json)
    this.websocket.send(JSON.stringify(json))
  }

  /**
   * 在上位机显示文字
   * @param {*} text 
   * @returns 
   */
  showText(text, actionId)
  {
    console.log('showText:%s,%d' , text , actionId)
    
    if (!this.checkWebSocket())
      return

    mySession = this.actionChilds.get(actionId)
    if (!mySession)
    {
      console.log('Can not find session by ',actionId)
      return
    }

    var json = {
      'cmd': 'state',
      'param': {
        'statelist': [
          {
            'uuid': this.uuid,
            'actionid': actionId,
            'key': mySession.remoteKey,
            'showtext":': true,
            'textdata': text
          }
        ]
      }
    }

    this.websocket.send(JSON.stringify(json))  
  }

  getUniqueActionId(uuid, key) {
    return uuid + key
  }

  /**
   * 插件启动运行，不同插件需要实现不同逻辑
   */
  onRun(uniqueActionId, uuid, key, param) {
    console.log('onRun in base')
  }

  /**
   * 添加插件，不同插件需要实现不同逻辑
   */
  onAdd(uniqueActionId, uuid, remoteKey, param) {
    console.log('onAdd in base')
  }

  /**
   * 插件UI的配置数据传递给上位机app保存，插件后台也需要保存，同一插件后台可以多个运行实例，可以多份数据
   */
  onReceiveSettings(uniqueActionId, payload) {
    console.log('onReceiveSettings in base')
  }

  /**
   * 插件UI收到上位机的的配置数据，加载到界面
   */
  onLoadConfiguration(param) {
    console.log('onLoadConfiguration in base')
  }

  /**
   * 删除插件配置信息
   */
  onClear(uniqueActionId, uuid, remoteKey, param) {
    console.log('onClear in base')
  }



  /**
  * 设置自定义图片，内容是base64格式
  */
  setUserDefinedImage(vKrabsBase64) {
    if (!this.checkWebSocket())
      return

    var json = {
      'cmd': 'state',
      'param': {
        'statelist': [
          {
            'uuid': this.uuid,
            'actionid': this.actionUUID,
            'key': this.remoteKey,
            'type': 1,
            'data': vKrabsBase64
          }
        ]
      }
    }

    this.websocket.send(JSON.stringify(json))
  }

  setImage(state , actionId) {
    if (!this.checkWebSocket())
      return

    mySession = this.actionChilds.get(actionId)
    if (!mySession)
    {
      console.log('Can not find session by ',actionId)
      return
    }

    var json = {
      'cmd': 'state',
      'param': {
        'statelist': [
          {
            'uuid': this.uuid,
            'actionid': actionId,
            'key': mySession.remoteKey,
            'type': 0,
            'state': state
          }
        ]
      }
    }

    this.websocket.send(JSON.stringify(json))
  }

  setImageByPath(path) {
    if (!this.checkWebSocket())
      return

    var json = {
      'cmd': 'state',
      'param': {
        'stateList': [
          {
            'uuid': this.uuid,
            'actionid': this.actionUUID,
            'key': this.remoteKey,
            'type': 2,
            'path': path
          }
        ]
      }
    }
    this.websocket.send(JSON.stringify(json))
  }

  /**
   * UI保存配置
   */
  saveSettings() {
    var payload = {}
    var elements = document.getElementsByClassName('sdProperty')

    Array.prototype.forEach.call(elements, function (elem) {
      var key = elem.id
      if (!key)
      {
        console.log('The id is null, skip saving')
        return
      }

      if (elem.classList.contains('sdCheckbox') || elem.type === 'checkbox') { // Checkbox
        payload[key] = elem.checked
      } else if (elem.classList.contains('sdFile') || elem.type === 'file'){ // File
        //const curFiles = elem.files
        //if (curFiles.length === 1) {
        //  var srcName = URL.createObjectURL(curFiles[0])

        var elemFile = document.getElementById(elem.id + 'Filename')
        payload[key] = decodeURIComponent(elem.value.replace(/^C:\\fakepath\\/, ''))
       
        if (!elem.value) {
          // Fetch innerText if file is empty (happens when we lose and regain focus to this key)
          //payload[key] = decodeURIComponent(elemFile.innerText.replace(/^C:\\fakepath\\/, ''))
        } else {
          // Set value on initial file selection
          //elemFile.innerText = elem.value
        }
      } else if (elem.classList.contains('sdList')) { // Dynamic dropdown
        var valueField = elem.getAttribute('sdValueField')
        payload[valueField] = elem.value
      } else if (elem.classList.contains('sdHTML')) { // HTML element
        var valueField = elem.getAttribute('sdValueField')
        payload[valueField] = elem.innerHTML
      } else { // Normal value
        payload[key] = elem.value
      }
      console.log('Save: [' + key + ']:[' + payload[key] + ']')
    })

    console.log(payload)
    this.setSettingsToPlugin(payload)
  }

  /**
   * UI加载保存的配置
   * @param {*} payload 
   */
  loadSettings(payload) {
    console.log('loadSettings:',payload)
    for (var key in payload) {
      try {
        if (key == null)
          continue

        var elem = document.getElementById(key)
        if (elem.classList.contains('sdCheckbox') || elem.type === 'checkbox') { // Checkbox
          elem.checked = payload[key]
        } else if (elem.classList.contains('sdFile') || elem.type === 'file') { // File
          //var elemFile = document.getElementById(elem.id + 'Filename')
          //elemFile.innerText = decodeURIComponent(payload[key].replace(/^C:\\fakepath\\/, ''))
          elem.value = payload[key]
          //if (!elemFile.innerText) {
          //  elemFile.innerText = 'No file...'
          //}
        } else if (elem.classList.contains('sdList')) { // Dynamic dropdown
          var textProperty = elem.getAttribute('sdListTextProperty')
          var valueProperty = elem.getAttribute('sdListValueProperty')
          var valueField = elem.getAttribute('sdValueField')

          var items = payload[key]
          elem.options.length = 0

          for (var idx = 0; idx < items.length; idx++) {
            var opt = document.createElement('option')
            opt.value = items[idx][valueProperty]
            opt.text = items[idx][textProperty]
            elem.appendChild(opt)
          }
          elem.value = payload[valueField]
        } else if (elem.classList.contains('sdHTML')) { // HTML element
          elem.innerHTML = payload[key]
        } else { // Normal value
          elem.value = payload[key]
        }

        console.log('Load: ' + key + '=' + payload[key])

        try {
          this.displayCustomSettings()
        } catch (error) { }

      } catch (err) {
        console.log('loadConfiguration failed for key: ' + key + ' - ' + err)
      }
    }

  }

  displayCustomSettings() {
    console.log('This is default DisplayCustomSettings');
  }

  setSettingsToPlugin(payload) {
    //插件ui保持配置，不需要区分connect session
    if (this.checkWebSocket()) {
      const json = {
        'cmd': 'paramfromplugin',
        'uuid': this.uuid,
        'actionid':this.actionUUID,
        'key': this.remoteKey,
        'param': payload
      }

      this.websocket.send(JSON.stringify(json))
    }
  }

  checkWebSocket() {
    return (this.websocket && (this.websocket.readyState === 1))
  }
}

module.exports = ActionBase 