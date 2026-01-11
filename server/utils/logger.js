// 日志工具
// 生产环境可以集成专业的日志库（如 winston, pino）

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  // 信息日志（开发环境输出，生产环境可选择性输出）
  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
    // 生产环境可以写入日志文件
  },

  // 错误日志（始终输出）
  error: (...args) => {
    console.error('[ERROR]', ...args);
    // 生产环境应该写入错误日志文件
  },

  // 警告日志
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  // 调试日志（仅开发环境）
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }
};

module.exports = logger;
