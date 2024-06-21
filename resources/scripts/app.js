//app.js 被manifest中的CodePath引用，作为常态的websocket client与上位软件通信，插件被安装时加载，被卸载时销毁

const ActionBase = require('./base/base.js')

const pluginUUID = 'com.ulanzi.httptool'
const result_parse_match_img = 1
const result_parse_not_match_img = 2

class HttpToolAction extends ActionBase {

  constructor() {
    super()
  }

  /**
  * 添加插件，不同插件需要实现不同逻辑
  */
  onAdd(uniqueActionId, uuid, remoteKey, param) {
    console.log('onAdd,actionid:%s,uuid:%s' , uniqueActionId,uuid)
    
    //插件第一次添加时没有配置数据，不需要运行。
    let request_url = this.data[uniqueActionId]
    if (param.request_url)
    {
      if (!request_url)
      {
        request_url = new HttpApiRequest(param , uniqueActionId)
        this.data[uniqueActionId] = request_url
      }else
        request_url.updateSettings(param)

        
      request_url.performRequest()
    }
  }

  /**
  * 删除插件配置信息
  */
  onClear(uniqueActionId, uuid, remoteKey, param) {
    console.log('onClear,actionid:%s, uuid:%s' , uniqueActionId , uuid)
    
    let request_url = this.data[uniqueActionId]
    if (request_url)
    {
      request_url.destroy()
      delete this.data[uniqueActionId]
    }
  }

  /**
   * 在硬件上按下运行按钮，不同插件实现不同逻辑
   * @param {*} uniqueActionId 
   * @param {*} uuid 
   * @param {*} key 
   * @param {*} param 
   */
  onRun(uniqueActionId, uuid, key, param) {
    
    console.log('onRun, actionid:%s,uuid:%s', uniqueActionId , uuid)

    let request_url = this.data[uniqueActionId]
    if (!request_url)
    {
      this.onAdd(uniqueActionId , uuid , key , param)
    }
    else
    {
      request_url.updateSettings(param)
      request_url.performRequest()
    }
  }


  onLoadConfiguration(param) {
    console.log('onLoadConfiguration in HttpToolAction')
    let request_url = this.data[uniqueActionId]
    if (request_url)
      request_url.updateSettings(param)
  }
}

/**
 * 具体的http请求实现类
 * @param {*} param 
 */
function HttpApiRequest(param , uniqueActionId) {
  var settings = param,
  poll_timer = 0,
  actionId = uniqueActionId,
  key_state = null;

function performRequest() {
  const frequency = settings.poll_status_frequency || 15;

  destroy();

  if (settings.poll_status) {
      sendRequest(do_status_poll = true);

      poll_timer = setInterval(function() {
          sendRequest(do_status_poll = true);
      }, 1000 * frequency);
  }else
    sendRequest(do_status_poll = false);
}


function destroy() {
  if (poll_timer !== 0) {
      window.clearInterval(poll_timer);
      poll_timer = 0;
  }
}


function showSuccess(resp , do_status_poll)
{
  if (!settings.response_parse || !do_status_poll)
  {
    //显示请求成功提醒
    httpToolAction.showText('Api requested successfully' , actionId)
  }
}

function updateSettings(new_settings) {
  settings = new_settings;
}


function sendRequest(do_status_poll = false) {
  if (!settings.request_url) {
    httpToolAction.showText('Invalid url' , actionId);
      return;
  }

  if (do_status_poll) {
      if (!Boolean(settings.response_parse) || !Boolean(settings.poll_status)) return;
  }

  let url    = settings.request_url;
  let body   = undefined;
  let method = 'GET';
  if (settings.request_body)
    body   = settings.request_body;

  method = settings.request_method? settings.request_method:method;

  const opts = {
      cache: 'no-cache',
      headers: constructHeaders(),
      method: method,
      body: ['GET', 'HEAD'].includes(method)
                              ? undefined
                              : body,
  };

  console.log(opts);

  fetch(url, opts)
      .then((resp) => checkResponseStatus(resp))
      .then((resp) => checkResponseValue(resp, do_status_poll))
      .then((resp) => showSuccess(resp, do_status_poll))
      .catch(err => {
        httpToolAction.showText('Api request failed' , actionId);
        console.log('Failed to request ' + url);
        console.log(err);
      }
  );

}

function constructHeaders() {
  let default_headers = settings.request_content_type
                          ? { 'Content-Type': settings.request_content_type }
                          : {};
  let input_headers = {};

  if (settings.request_headers) {
      settings.request_headers.split(/\n/).forEach(h => {
          if (h.includes(':')) {
              const [name, value] = h.split(/: *(.*)/).map(s => {
                  return s.trim();
              });

              if (name) {
                  input_headers[name] = value;
              }
          }
      });
  }

  return {
      ...default_headers,
      ...input_headers
  }
}

async function checkResponseStatus(resp) {
  if (!resp) {
      throw new Error();
  }
  if (!resp.ok) {
      throw new Error(`${resp.status}: ${resp.statusText}\n${await resp.text()}`);
  }
  return resp;
}

/**
 * 检查http请求返回的报文是否与配置的数据匹配，并在下行设备显示预先配置好的图标。
 * @param {*} resp 
 * @param {*} do_status_poll 
 * @returns 
 */
async function checkResponseValue(resp, do_status_poll) {
  if (!settings.response_parse)
      return;

  let json, body;
  var new_key_state = key_state;

  const field  = settings.response_parse_field?settings.response_parse_field:undefined;
  const value  = settings.response_parse_value?settings.response_parse_value:undefined;

  if (field  !== undefined && value !== undefined) {
      json = await resp.json();
      new_key_state = (lookForPathValue(json , field) == value);
  } else if (field !== undefined) {
      json = await resp.json();
      new_key_state = !(['false', '0', '', 'undefined'].indexOf(String(lookForPathValue(json, field)).toLowerCase().trim()) + 1);
  } else if (value !== undefined) {
      body = await resp.text();
      new_key_state = body.includes(value);
  }

  if (new_key_state == key_state) return;

  key_state = new_key_state;

  //需要2个资源文件，根据请求结果是否匹配显示
  imageIndex = key_state
              ? result_parse_match_img 
              : result_parse_not_match_img;
  
  //httpToolAction.setImageByPath
  httpToolAction.setImage(imageIndex , actionId)
  return resp;
}

function lookForPathValue(json, path) {
  // 将JSON格式文本转换为对象，如果已经是对象则直接使用
  if (typeof json === 'string') {
      try {
          json = JSON.parse(json);
      } catch (e) {
          console.error('Invalid JSON string');
          return false;
      }
  }

  // 分割路径，支持点分隔路径
  const keys = path.split('.');

  // 递归查找路径上的值
  function findValue(obj, keys) {
      if (obj === undefined || obj === null) {
          return undefined;
      }
      if (keys.length === 0) {
          return obj;
      }
      return findValue(obj[keys[0]], keys.slice(1));
  }

  // 查找路径对应的值
  const result = findValue(json, keys);

  // 比较结果与给定值是否匹配
  return result;
}

return {
  performRequest: performRequest,
  updateSettings: updateSettings,
  destroy: destroy
};
}


/**
 * 单元测试代码
 */
function test()
{
  const ht = new HttpToolAction()
  ht.uuid = 'i am uuid'

  let paramData = {
    request_url:'http://127.0.0.1:3306/api',
    response_parse:true,
    poll_status:false,
    request_method:'GET',
    request_body:'',
    request_headers:'origin:http://127.0.0.1:3306\nt1:v1',
    request_content_type:'application/xml',
    response_parse_field: "cmd",
    response_parse_value: "add",
   
  }

  let json = {
    code: '0',
    cmd: 'add',
    uuid: 'i am uuid',
    actionid:'i am actionid',
    key:'0-1',
    param:paramData
  }

  let evt = {
    data:JSON.stringify(json)
  }

  ht.dispatchEvent(evt)

  //run
  json.cmd = 'run'
  evt.data = JSON.stringify(json)
  ht.dispatchEvent(evt)

  //clear
  json.cmd = 'clear'
  paramData.uuid = 'i am uuid'
  paramData.key = '0_1'
  paramData.actionid = 'i am actionid'

  evt.data = JSON.stringify(json)
  ht.dispatchEvent(evt)
}

test()
const httpToolAction = new HttpToolAction()
//httpToolAction.connectUlanziDeckSocket(3906, pluginUUID)



