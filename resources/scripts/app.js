//app.js 被manifest中的CodePath引用，作为常态的websocket client与上位软件通信，插件被安装时加载，被卸载时销毁

let pluginUUID = 'com.ulanzi.counter'

class HttpToolAction extends ActionBase
{

  constructor () {
    super()
  }

  onLoadConfiguration(param)
  {
      console.log('onLoadConfiguration in HttpToolAction')
  }
}

let baseInstance = new ActionBase()
baseInstance.onLoadConfiguration();

let subInstance = new HttpToolAction();
subInstance.onLoadConfiguration();




