const Wechatpay = require('wechatpay-node-v3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 微信支付配置
const config = {
  appid: process.env.WX_APPID, // 小程序 AppID
  mchid: process.env.WX_MCHID, // 商户号
  publicKey: process.env.WX_PUBLIC_KEY, // 微信支付平台证书公钥（可选，用于验证回调）
  privateKey: process.env.WX_PRIVATE_KEY, // 商户私钥（用于签名）
  key: process.env.WX_API_KEY, // API v3密钥（32位字符串）
  certSerialNo: process.env.WX_CERT_SERIAL_NO, // 证书序列号
  notifyUrl: process.env.WX_NOTIFY_URL || `${process.env.API_BASE_URL || 'http://localhost:3000'}/v1/payment/notify`, // 支付回调地址
};

// 初始化微信支付实例
let wechatpay = null;
let initError = null; // 记录初始化错误信息

try {
  // 检查必要的配置
  const missingConfigs = [];
  if (!config.appid) missingConfigs.push('WX_APPID');
  if (!config.mchid) missingConfigs.push('WX_MCHID');
  if (!config.key) missingConfigs.push('WX_API_KEY');
  
  if (missingConfigs.length > 0) {
    initError = `微信支付配置不完整，缺少以下环境变量: ${missingConfigs.join(', ')}`;
    console.warn(initError);
  } else {
    // 如果提供了私钥文件路径，从文件读取
    let privateKey = config.privateKey;
    if (config.privateKey && config.privateKey.startsWith('file://')) {
      try {
        const keyPath = config.privateKey.replace('file://', '');
        privateKey = fs.readFileSync(path.resolve(keyPath), 'utf8');
      } catch (fileErr) {
        initError = `无法读取私钥文件: ${fileErr.message}`;
        console.error(initError);
        throw fileErr;
      }
    }

    // 初始化微信支付实例
    // 注意：如果使用 API v3，需要提供私钥和证书序列号
    const wechatpayConfig = {
      appid: config.appid,
      mchid: config.mchid,
      key: config.key,
    };

    // 如果提供了私钥，添加私钥配置（用于签名）
    if (privateKey) {
      wechatpayConfig.privateKey = privateKey;
    } else {
      console.warn('未配置 WX_PRIVATE_KEY，签名功能可能不可用');
    }

    // 如果提供了证书序列号，添加证书序列号
    if (config.certSerialNo) {
      wechatpayConfig.certSerialNo = config.certSerialNo;
    } else {
      console.warn('未配置 WX_CERT_SERIAL_NO，某些功能可能不可用');
    }

    // 如果提供了公钥，添加公钥配置（用于验证回调）
    if (config.publicKey) {
      wechatpayConfig.publicKey = config.publicKey;
    }

    try {
      wechatpay = new Wechatpay(wechatpayConfig);
      console.log('微信支付初始化成功');
    } catch (initErr) {
      initError = `微信支付实例创建失败: ${initErr.message}`;
      console.error(initError);
      throw initErr;
    }
  }
} catch (err) {
  initError = err.message || '未知错误';
  console.error('微信支付初始化失败:', initError);
  console.warn('请检查环境变量配置，微信支付功能将不可用');
}

/**
 * 创建支付订单（统一下单）
 * @param {Object} params - 支付参数
 * @param {String} params.openid - 用户 openid
 * @param {String} params.orderNo - 订单号
 * @param {Number} params.amount - 支付金额（分）
 * @param {String} params.description - 商品描述
 * @param {String} params.notifyUrl - 回调地址（可选，默认使用配置中的地址）
 * @returns {Promise<Object>} 支付参数
 */
async function createPayment(params) {
  if (!wechatpay) {
    throw new Error('微信支付未初始化，请检查配置');
  }

  const { openid, orderNo, amount, description, notifyUrl } = params;

  if (!openid || !orderNo || !amount || !description) {
    throw new Error('支付参数不完整');
  }

  try {
    // 调用微信支付统一下单接口（JSAPI支付）
    const result = await wechatpay.transactions_jsapi({
      description: description, // 商品描述
      out_trade_no: orderNo, // 商户订单号
      notify_url: notifyUrl || config.notifyUrl, // 支付回调地址
      amount: {
        total: Math.round(amount), // 总金额，单位：分
        currency: 'CNY'
      },
      payer: {
        openid: openid // 用户 openid
      }
    });

    // 返回 prepay_id
    return {
      prepayId: result.prepay_id,
      ...result
    };
  } catch (err) {
    console.error('创建支付订单失败:', err);
    // 如果是配置问题，提供更详细的错误信息
    if (err.message && err.message.includes('privateKey')) {
      throw new Error('微信支付配置错误：请检查私钥配置');
    }
    throw new Error(`创建支付订单失败: ${err.message || '未知错误'}`);
  }
}

/**
 * 生成小程序支付参数
 * @param {String} prepayId - 预支付交易会话ID
 * @returns {Object} 小程序支付参数
 */
function generatePaymentParams(prepayId) {
  if (!wechatpay) {
    throw new Error('微信支付未初始化，请检查配置');
  }

  const appId = config.appid;
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${prepayId}`;
  const signType = 'RSA';

  // 构建签名串
  const signString = `${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;

  // 使用私钥签名
  let paySign;
  try {
    let privateKey = config.privateKey;
    
    // 如果私钥是文件路径，从文件读取
    if (config.privateKey && config.privateKey.startsWith('file://')) {
      const keyPath = config.privateKey.replace('file://', '');
      privateKey = fs.readFileSync(path.resolve(keyPath), 'utf8');
    }
    
    if (!privateKey) {
      throw new Error('私钥未配置');
    }
    
    paySign = crypto.createSign('RSA-SHA256')
      .update(signString, 'utf8')
      .sign(privateKey, 'base64');
  } catch (err) {
    console.error('签名生成失败:', err);
    throw new Error(`签名生成失败: ${err.message || '未知错误'}`);
  }

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign
  };
}

/**
 * 验证支付回调签名
 * @param {Object} headers - 请求头
 * @param {String} body - 请求体
 * @returns {Boolean} 签名是否有效
 */
function verifyNotify(headers, body) {
  if (!wechatpay) {
    return false;
  }

  try {
    return wechatpay.verifySign(headers, body);
  } catch (err) {
    console.error('验证支付回调签名失败:', err);
    return false;
  }
}

/**
 * 查询订单支付状态
 * @param {String} orderNo - 商户订单号
 * @returns {Promise<Object>} 订单信息
 */
async function queryOrder(orderNo) {
  if (!wechatpay) {
    throw new Error('微信支付未初始化，请检查配置');
  }

  try {
    const result = await wechatpay.query({
      out_trade_no: orderNo
    });
    return result;
  } catch (err) {
    console.error('查询订单失败:', err);
    throw new Error(`查询订单失败: ${err.message || '未知错误'}`);
  }
}

/**
 * 关闭订单
 * @param {String} orderNo - 商户订单号
 * @returns {Promise<Object>} 关闭结果
 */
async function closeOrder(orderNo) {
  if (!wechatpay) {
    throw new Error('微信支付未初始化，请检查配置');
  }

  try {
    const result = await wechatpay.close({
      out_trade_no: orderNo
    });
    return result;
  } catch (err) {
    console.error('关闭订单失败:', err);
    throw new Error(`关闭订单失败: ${err.message || '未知错误'}`);
  }
}

/**
 * 获取初始化错误信息
 * @returns {String|null} 错误信息，如果初始化成功则返回 null
 */
function getInitError() {
  return initError;
}

module.exports = {
  createPayment,
  generatePaymentParams,
  verifyNotify,
  queryOrder,
  closeOrder,
  isAvailable: () => !!wechatpay,
  getInitError
};
