const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getOpenId, decryptPhone } = require('../utils/wechat');
const { success, error } = require('../utils/response');

// 微信登录
router.post('/wx-login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;

    console.log('收到登录请求，code:', code ? '已提供' : '未提供');

    if (!code) {
      return error(res, '缺少code参数', 400);
    }

    // 检查环境变量
    if (!process.env.WX_APPID || !process.env.WX_SECRET) {
      console.error('环境变量未配置: WX_APPID 或 WX_SECRET');
      return error(res, '服务器配置错误：缺少微信配置', 500);
    }

    if (!process.env.JWT_SECRET) {
      console.error('环境变量未配置: JWT_SECRET');
      return error(res, '服务器配置错误：缺少JWT密钥', 500);
    }

    // 获取openid
    let openid, unionid;
    try {
      console.log('开始获取openid...');
      const result = await getOpenId(code);
      openid = result.openid;
      unionid = result.unionid;
      
      if (!openid) {
        console.error('获取openid失败：返回结果中没有openid');
        return error(res, '获取微信ID失败，请检查appid和secret配置', 500);
      }
      console.log('成功获取openid:', openid);
    } catch (err) {
      console.error('获取openid失败:', err);
      return error(res, '微信登录失败：' + (err.message || '请检查服务器配置'), 500);
    }

    // 查找或创建用户
    let user;
    try {
      // 先查找是否存在该openid的用户
      user = await User.findOne({ openid });
      
      if (!user) {
        // 如果不存在，检查是否有openid为null或undefined的旧记录（兼容旧数据）
        // 注意：这里不查找null，因为MongoDB的unique索引不允许多个null值
        // 直接创建新用户，如果遇到唯一索引冲突，说明数据库中有旧索引需要清理
        
        console.log('创建新用户，openid:', openid);
        try {
          user = new User({
            openid,
            unionid,
            nickName: userInfo?.nickName || '微信用户',
            avatarUrl: userInfo?.avatarUrl
          });
          await user.save();
          console.log('新用户创建成功，ID:', user._id);
        } catch (saveErr) {
          // 如果是唯一索引冲突，可能是数据库中有旧索引
          if (saveErr.code === 11000) {
            console.error('唯一索引冲突，可能是数据库索引问题:', saveErr);
            // 尝试删除旧索引并重试
            try {
              await User.collection.dropIndex('openId_1').catch(() => {});
              await User.collection.dropIndex('openid_1').catch(() => {});
              // 重新创建用户
              user = new User({
                openid,
                unionid,
                nickName: userInfo?.nickName || '微信用户',
                avatarUrl: userInfo?.avatarUrl
              });
              await user.save();
              console.log('清理索引后，新用户创建成功，ID:', user._id);
            } catch (retryErr) {
              throw new Error('创建用户失败，请检查数据库索引配置。错误：' + retryErr.message);
            }
          } else {
            throw saveErr;
          }
        }
      } else {
        console.log('找到已存在用户，ID:', user._id);
        // 更新用户信息（如果提供了新信息，或者现有信息为空）
        let needSave = false;
        if (userInfo?.nickName && (!user.nickName || user.nickName === '微信用户')) {
          user.nickName = userInfo.nickName;
          needSave = true;
        }
        if (userInfo?.avatarUrl && !user.avatarUrl) {
          user.avatarUrl = userInfo.avatarUrl;
          needSave = true;
        }
        // 如果提供了新信息且与现有信息不同，也更新
        if (userInfo?.nickName && user.nickName !== userInfo.nickName) {
          user.nickName = userInfo.nickName;
          needSave = true;
        }
        if (userInfo?.avatarUrl && user.avatarUrl !== userInfo.avatarUrl) {
          user.avatarUrl = userInfo.avatarUrl;
          needSave = true;
        }
        if (needSave) {
          await user.save();
          console.log('用户信息已更新');
        }
      }
    } catch (dbErr) {
      console.error('数据库操作失败:', dbErr);
      return error(res, '数据库操作失败：' + (dbErr.message || '请检查数据库连接'), 500);
    }

    // 生成token
    let token;
    try {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
      console.log('Token生成成功');
    } catch (jwtErr) {
      console.error('Token生成失败:', jwtErr);
      return error(res, 'Token生成失败：' + (jwtErr.message || '请检查JWT配置'), 500);
    }

    success(res, {
      token,
      userInfo: {
        id: user._id,
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('登录接口未捕获的错误:', err);
    console.error('错误堆栈:', err.stack);
    error(res, err.message || '登录失败，请重试', 500);
  }
});

// 绑定手机号（需要认证）
const { auth } = require('../middleware/auth');
router.post('/bind-phone', auth, async (req, res) => {
  try {
    const { encryptedData, iv, code } = req.body;
    const userId = req.userId; // 从token中获取

    if (!encryptedData || !iv) {
      return error(res, '缺少必要参数', 400);
    }

    // 如果提供了code，则通过code获取session_key；否则需要提供sessionKey
    let sessionKey;
    if (code) {
      const { session_key } = await getOpenId(code);
      sessionKey = session_key;
    } else if (req.body.sessionKey) {
      sessionKey = req.body.sessionKey;
    } else {
      return error(res, '缺少code或sessionKey参数', 400);
    }

    const phone = decryptPhone(encryptedData, iv, sessionKey);
    
    const user = await User.findById(userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    user.phone = phone;
    await user.save();

    success(res, { phone });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
