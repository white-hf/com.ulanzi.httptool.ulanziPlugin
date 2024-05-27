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
      this.websocket.onopen = () => registerPlugin(uuid);

      this.websocket.onmessage = () => dispatchEvent(evt);

      this.websocket.onerror = (evt) => {
         console.log('WEBSOCKET ERROR:' , evt);
    };

    this.websocket.onclose = (evt) => {
        console.log('WEBSOCKET CLOSED:', evt);
    };

    } catch (error) {
      console.log('failed to connect the server');
    }

  }

  /**
   * 插件事件处理，需注意UI和后台的差异
   */
  dispatchEvent(evt) {
    let jsonObj = JSON.parse(evt.data)
    console.log('onmessage json: ', jsonObj)

    let event = jsonObj['cmd']

    //接收到的uuid，可以是主服务的uuid,也可以是action的uuid
    uuid = jsonObj['uuid']
    remoteKey = jsonObj['key']
    let param = jsonObj['param']

    let code = jsonObj['code']
    isResponse = code !== undefined

    let uniqueActionId = actionUUID = jsonObj['actionid']

    if (event === 'run') {
      onRun(uniqueActionId, uuid, remoteKey, param)
    } else if (event === 'add') {
      if (!actionChilds.has(remoteKey)) {
        actionChilds.set(remoteKey, uuid)
        onAdd(uniqueActionId, uuid, remoteKey, param)
      }
    } else if (event === 'clear') {
      if (actionChilds.has(remoteKey)) {
        actionChilds.delete(remoteKey)

        uuid = param.uuid
        uniqueActionId = param.actionid
        key = param.key
        onClear(uniqueActionId, uuid, remoteKey, param)
      }
    }
    else if (event === 'state') {

    } else if (event === 'paramfromplugin') {
      console.log('paramfromplugin received payload: ', param)
      onReceiveSettings(uniqueActionId, param)
    } else if (event === 'paramfromapp') {
      console.log('paramfromapp received payload: ', param)
      onLoadConfiguration(param)
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
    console.log('registerPlugin ' + json)
    this.websocket.send(JSON.stringify(json))
  }

  /**
   * 在上位机显示文字
   * @param {*} text 
   * @returns 
   */
  showText(text)
  {
    if (!this.checkWebSocket())
      return

    var json = {
      'cmd': 'state',
      'param': {
        'statelist': [
          {
            'uuid': this.uuid,
            'actionId': this.actionUUID,
            'key': this.remoteKey,
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
    var payload = data[actionId];
  }

  /**
   * 添加插件，不同插件需要实现不同逻辑
   */
  onAdd(uniqueActionId, uuid, remoteKey, param) {

  }

  /**
   * 插件UI的配置数据传递给上位机app保存，插件后台也需要保存，同一插件后台可以多个运行实例，可以多份数据
   */
  onReceiveSettings(uniqueActionId, payload) {
    data[uniqueActionId] = payload
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
            'actionId': this.actionUUID,
            'key': this.remoteKey,
            'type': 1,
            'data': vKrabsBase64
          }
        ]
      }
    }

    this.websocket.send(JSON.stringify(json))
  }

  setImage(state) {
    if (!this.checkWebSocket())
      return

    var json = {
      'cmd': 'state',
      'param': {
        'statelist': [
          {
            'uuid': this.uuid,
            'actionId': this.actionUUID,
            'key': this.remoteKey,
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
            'actionId': this.actionUUID,
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

    this.setSettingsToPlugin(payload)
  }

  /**
   * UI加载保存的配置
   * @param {*} payload 
   */
  loadSettings(payload) {
    console.log(payload)
    for (var key in payload) {
      try {
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
    if (this.checkWebSocket()) {
      const json = {
        'cmd': 'paramfromplugin',
        'uuid': this.uuid,
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