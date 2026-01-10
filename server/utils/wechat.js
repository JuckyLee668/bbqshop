const https = require('https');
const { URL } = require('url');

// 微信登录，获取openid
const getOpenId = async (code) => {
  return new Promise((resolve, reject) => {
    try {
      if (!process.env.WX_APPID || !process.env.WX_SECRET) {
        throw new Error('微信配置未设置：请配置WX_APPID和WX_SECRET环境变量');
      }

      if (!code) {
        throw new Error('缺少code参数');
      }

      console.log('调用微信API获取openid，appid:', process.env.WX_APPID);
      
      // 构建完整的URL
      const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
      url.searchParams.append('appid', process.env.WX_APPID);
      url.searchParams.append('secret', process.env.WX_SECRET);
      url.searchParams.append('js_code', code);
      url.searchParams.append('grant_type', 'authorization_code');

      console.log('请求URL:', url.toString().replace(process.env.WX_SECRET, '***'));

      const options = {
        method: 'GET',
        timeout: 10000
      };

      const req = https.get(url.toString(), options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('微信API响应数据:', JSON.stringify(result));

            if (result.errcode) {
              const errorMsg = `微信API错误 ${result.errcode}: ${result.errmsg}`;
              console.error(errorMsg);
              reject(new Error(errorMsg));
              return;
            }

            if (!result.openid) {
              reject(new Error('微信API返回数据中没有openid'));
              return;
            }

            resolve({
              openid: result.openid,
              session_key: result.session_key,
              unionid: result.unionid
            });
          } catch (parseError) {
            console.error('解析响应数据失败:', parseError);
            console.error('原始响应:', data);
            reject(new Error('微信登录失败: 响应数据解析失败'));
          }
        });
      });

      req.on('error', (error) => {
        console.error('微信API请求失败:', error);
        reject(new Error('微信登录失败: ' + error.message));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('微信登录失败: 请求超时'));
      });

      req.setTimeout(10000);
    } catch (error) {
      console.error('微信登录错误:', error.message);
      reject(new Error('微信登录失败: ' + error.message));
    }
  });
};

// 解密手机号
const decryptPhone = (encryptedData, iv, sessionKey) => {
  const crypto = require('crypto');
  
  try {
    const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
    decipher.setAutoPadding(true);
    
    let decoded = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    
    const data = JSON.parse(decoded);
    return data.phoneNumber;
  } catch (error) {
    throw new Error('手机号解密失败');
  }
};

module.exports = { getOpenId, decryptPhone };
