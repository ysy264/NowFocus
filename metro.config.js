const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 禁用 package.json exports 字段解析，防止 React Native 包的 ESM 路径被 Node.js/Metro 错误加载
// 这是 Expo SDK 51 + Node.js 22 环境下的推荐配置
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
