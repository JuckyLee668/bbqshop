module.exports = {
  apps: [{
    name: 'noodles-api',
    script: './app.js',
    instances: 2, // 集群模式，使用 CPU 核心数
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日志配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 自动重启配置
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_memory_restart: '500M',
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // 优雅关闭
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
