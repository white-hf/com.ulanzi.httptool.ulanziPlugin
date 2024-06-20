//action.js 当上位软件选中一个action时加载其界面，取消选中时销毁，一个action可能会创建多个实例，通过key区分不同实例
const pluginUUID = 'com.ulanzi.httptool.action'
const port       = 3906

class HttpToolUIAction extends ActionBase
{

  constructor () {
    super()
  }

  onRun(uniqueActionId, uuid, key, param)
  {
      if (this.isResponse)
        return

      var payload = data[uniqueActionId];

      //设置下位设备显示的图标
      this.setImage(uuid , key , 1);
  }

  /**
   * 加载存储的配置信息到界面
   * @param {*} param 
   */
  onLoadConfiguration(param)
  {
    console.log('onLoadConfiguration in ui')
    this.loadSettings(param)
  }
}

const httpToolUIAction = new HttpToolUIAction()
httpToolUIAction.connectUlanziDeckSocket(port , pluginUUID)

function save()
{
  httpToolUIAction.saveSettings()
}
