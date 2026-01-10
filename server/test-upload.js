/**
 * 上传 API 测试脚本 (Node.js 版本)
 * 
 * 使用方法:
 *   node test-upload.js [API_URL] [USERNAME] [PASSWORD] [IMAGE_PATH]
 * 
 * 示例:
 *   node test-upload.js http://localhost:3000/v1 admin admin123 test.png
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 从命令行参数获取配置
const API_URL = process.argv[2] || 'http://localhost:3000/v1';
const USERNAME = process.argv[3] || process.env.MERCHANT_USERNAME || 'admin';
const PASSWORD = process.argv[4] || process.env.MERCHANT_PASSWORD || 'admin123';
const IMAGE_PATH = process.argv[5] || 'test.png';

async function testUpload() {
  console.log('==========================================');
  console.log('上传 API 测试工具 (Node.js)');
  console.log('==========================================');
  console.log(`API 地址: ${API_URL}`);
  console.log(`用户名: ${USERNAME}`);
  console.log(`图片路径: ${IMAGE_PATH}`);
  console.log('==========================================');
  console.log('');

  try {
    // 1. 检查图片文件是否存在
    if (!fs.existsSync(IMAGE_PATH)) {
      console.log('❌ 错误: 图片文件不存在:', IMAGE_PATH);
      console.log('');
      console.log('💡 提示: 请指定一个存在的图片文件路径');
      console.log('   例如: node test-upload.js http://localhost:3000/v1 admin admin123 ./test.png');
      process.exit(1);
    }

    // 2. 登录获取 Token
    console.log('📝 正在登录获取 Token...');
    let token;
    try {
      const loginRes = await axios.post(`${API_URL}/merchant/login`, {
        username: USERNAME,
        password: PASSWORD
      });

      if (loginRes.data.code === 200 && loginRes.data.data?.token) {
        token = loginRes.data.data.token;
        console.log('✅ 登录成功');
        console.log(`   Token: ${token.substring(0, 20)}...`);
      } else {
        throw new Error('登录响应格式错误');
      }
    } catch (error) {
      console.log('❌ 登录失败!');
      if (error.response) {
        console.log(`   HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
      } else {
        console.log(`   错误: ${error.message}`);
      }
      console.log('');
      console.log('💡 请检查:');
      console.log('   1. 用户名和密码是否正确');
      console.log('   2. API 地址是否正确');
      console.log('   3. 服务器是否正在运行');
      process.exit(1);
    }

    console.log('');

    // 3. 上传图片
    console.log('📤 正在上传图片...');
    let uploadResult;
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(IMAGE_PATH));

      const uploadRes = await axios.post(
        `${API_URL}/upload/image`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (uploadRes.data.code === 200 && uploadRes.data.data?.url) {
        uploadResult = uploadRes.data;
        console.log('✅ 上传成功!');
        console.log(`   响应:`, JSON.stringify(uploadResult, null, 2));
      } else {
        throw new Error('上传响应格式错误');
      }
    } catch (error) {
      console.log('❌ 上传失败!');
      if (error.response) {
        console.log(`   HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
        console.log(`   响应:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`   错误: ${error.message}`);
      }
      console.log('');
      console.log('💡 可能的原因:');
      console.log('   1. Token 无效或已过期');
      console.log('   2. 文件格式不支持 (只支持 jpg, jpeg, png, gif)');
      console.log('   3. 文件大小超过限制 (默认 5MB)');
      console.log('   4. 服务器错误');
      process.exit(1);
    }

    console.log('');

    // 4. 构建完整的图片 URL
    const relativeUrl = uploadResult.data.url;
    let fullImageUrl;
    
    if (relativeUrl.startsWith('http')) {
      fullImageUrl = relativeUrl;
    } else {
      // 移除 /v1 后缀（如果存在）
      const baseUrl = API_URL.replace(/\/v1\/?$/, '');
      fullImageUrl = baseUrl + (relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl);
    }

    console.log('📥 测试图片访问...');
    console.log(`   图片 URL: ${fullImageUrl}`);
    console.log('');

    // 5. 验证图片可以访问
    try {
      const imageRes = await axios.get(fullImageUrl, {
        responseType: 'stream',
        validateStatus: (status) => status === 200
      });

      console.log('✅ 图片可以正常访问!');
      console.log(`   HTTP 状态码: ${imageRes.status}`);
      console.log(`   Content-Type: ${imageRes.headers['content-type']}`);
      console.log('');
      console.log('💡 在浏览器中打开以下 URL 查看图片:');
      console.log(`   ${fullImageUrl}`);
    } catch (error) {
      console.log('⚠️  图片上传成功，但无法访问');
      if (error.response) {
        console.log(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`   错误: ${error.message}`);
      }
      console.log('');
      console.log('💡 请检查:');
      console.log('   1. Nginx 静态文件配置是否正确');
      console.log('      location /uploads { alias /path/to/uploads; }');
      console.log('   2. 文件是否确实存在于服务器上');
      console.log('   3. 文件权限是否正确 (chmod 644)');
      console.log('   4. Nginx 配置路径是否与实际路径匹配');
      console.log('');
      console.log('   检查命令:');
      console.log(`   - 检查文件: ls -la /path/to/project/server/uploads`);
      console.log(`   - 检查 Nginx: sudo nginx -t`);
      console.log(`   - 查看日志: sudo tail -f /var/log/nginx/error.log`);
    }

    console.log('');
    console.log('==========================================');
    console.log('✅ 测试完成!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testUpload();
