if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LAUNCH = "onLaunch";
  const ON_REACH_BOTTOM = "onReachBottom";
  const ON_PULL_DOWN_REFRESH = "onPullDownRefresh";
  function requireNativePlugin(name) {
    return weex.requireModule(name);
  }
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createLifeCycleHook(
    ON_SHOW,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onHide = /* @__PURE__ */ createLifeCycleHook(
    ON_HIDE,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onLaunch = /* @__PURE__ */ createLifeCycleHook(
    ON_LAUNCH,
    1
    /* HookFlags.APP */
  );
  const onReachBottom = /* @__PURE__ */ createLifeCycleHook(
    ON_REACH_BOTTOM,
    2
    /* HookFlags.PAGE */
  );
  const onPullDownRefresh = /* @__PURE__ */ createLifeCycleHook(
    ON_PULL_DOWN_REFRESH,
    2
    /* HookFlags.PAGE */
  );
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$3 = {
    __name: "uni-icons",
    props: {
      type: {
        type: String,
        default: ""
      },
      size: {
        type: [Number, String],
        default: 32
      },
      color: {
        type: String,
        default: "#333"
      }
    },
    setup(__props, { expose: __expose }) {
      __expose();
      const __returned__ = {};
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        class: vue.normalizeClass(["uni-icons", [$props.type ? "uni-icons-" + $props.type : ""]]),
        style: vue.normalizeStyle({ color: $props.color, "font-size": $props.size + "rpx" })
      },
      [
        $props.type === "compass" ? (vue.openBlock(), vue.createElementBlock("text", { key: 0 }, "🧭")) : $props.type === "chat" ? (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "💬")) : $props.type === "chatboxes" ? (vue.openBlock(), vue.createElementBlock("text", { key: 2 }, "📨")) : $props.type === "personadd" ? (vue.openBlock(), vue.createElementBlock("text", { key: 3 }, "👤")) : $props.type === "camera" ? (vue.openBlock(), vue.createElementBlock("text", { key: 4 }, "📷")) : $props.type === "person" ? (vue.openBlock(), vue.createElementBlock("text", { key: 5 }, "👥")) : $props.type === "game" ? (vue.openBlock(), vue.createElementBlock("text", { key: 6 }, "🎮")) : $props.type === "more" ? (vue.openBlock(), vue.createElementBlock("text", { key: 7 }, "⋯")) : $props.type === "refresh" ? (vue.openBlock(), vue.createElementBlock("text", { key: 8 }, "🔄")) : (vue.openBlock(), vue.createElementBlock("text", { key: 9 }, "❓"))
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const UniIcons = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-f218fb61"], ["__file", "F:/uni-app_node/uni-app/Eaccelerate/components/uni-icons/uni-icons.vue"]]);
  class AndroidVpnManager {
    constructor() {
      this.isConnected = false;
      this.isConnecting = false;
      this.statusCallback = null;
      this.vpnPlugin = null;
      this.isInitialized = false;
      this.connectionState = "disconnected";
      this.lastStatus = null;
      this.retryCount = 0;
      this.maxRetries = 3;
    }
    // 添加插件状态检查方法
    checkPluginAvailability() {
      return new Promise((resolve) => {
        try {
          if (typeof requireNativePlugin !== "function") {
            resolve(false);
            return;
          }
          const plugin = requireNativePlugin("MyVpnPlugin");
          resolve(!!plugin);
        } catch (error) {
          formatAppLog("error", "at utils/android-vpn.js:33", "检查插件可用性失败:", error);
          resolve(false);
        }
      });
    }
    async diagnosePlugin() {
      formatAppLog("log", "at utils/android-vpn.js:40", "=== VPN插件诊断 ===");
      const systemInfo = uni.getSystemInfoSync();
      formatAppLog("log", "at utils/android-vpn.js:44", "运行平台:", systemInfo.platform);
      formatAppLog("log", "at utils/android-vpn.js:45", "应用版本:", systemInfo.appVersion);
      formatAppLog("log", "at utils/android-vpn.js:48", "requireNativePlugin 类型:", typeof requireNativePlugin);
      try {
        const plugin = requireNativePlugin("MyVpnPlugin");
        formatAppLog("log", "at utils/android-vpn.js:53", "插件加载结果:", plugin ? "成功" : "失败");
        formatAppLog("log", "at utils/android-vpn.js:54", "插件对象类型:", typeof plugin);
        if (plugin) {
          const methods = ["startVpn", "stopVpn", "getVpnStatus", "onVpnStatusUpdate"];
          methods.forEach((method) => {
            formatAppLog("log", "at utils/android-vpn.js:60", `${method} 方法:`, typeof plugin[method] === "function" ? "存在" : "缺失");
          });
        }
      } catch (error) {
        formatAppLog("log", "at utils/android-vpn.js:64", "插件加载异常:", error.message);
      }
      formatAppLog("log", "at utils/android-vpn.js:67", "=== 诊断结束 ===");
    }
    // 添加插件验证方法
    async verifyPlugin() {
      formatAppLog("log", "at utils/android-vpn.js:72", "=== 验证插件可用性 ===");
      try {
        const systemInfo = uni.getSystemInfoSync();
        formatAppLog("log", "at utils/android-vpn.js:77", "运行平台:", systemInfo.platform);
        if (systemInfo.platform !== "android") {
          formatAppLog("log", "at utils/android-vpn.js:80", "非Android平台，跳过插件验证");
          return false;
        }
        if (typeof requireNativePlugin !== "function") {
          formatAppLog("error", "at utils/android-vpn.js:86", "requireNativePlugin 不可用");
          return false;
        }
        formatAppLog("log", "at utils/android-vpn.js:91", "尝试加载插件...");
        const plugin = requireNativePlugin("MyVpnPlugin");
        formatAppLog("log", "at utils/android-vpn.js:93", "插件加载结果:", plugin);
        if (!plugin) {
          formatAppLog("error", "at utils/android-vpn.js:96", "插件加载返回 null");
          return false;
        }
        const methods = ["startVpn", "stopVpn", "getVpnStatus", "onVpnStatusUpdate"];
        let allMethodsExist = true;
        methods.forEach((method) => {
          const exists = typeof plugin[method] === "function";
          formatAppLog("log", "at utils/android-vpn.js:106", `方法 ${method}: ${exists ? "存在" : "缺失"}`);
          if (!exists)
            allMethodsExist = false;
        });
        formatAppLog("log", "at utils/android-vpn.js:110", "插件验证结果:", allMethodsExist ? "通过" : "失败");
        return allMethodsExist;
      } catch (error) {
        formatAppLog("error", "at utils/android-vpn.js:114", "插件验证异常:", error);
        return false;
      }
    }
    // 初始化VPN功能
    async initialize() {
      if (this.isInitialized) {
        formatAppLog("log", "at utils/android-vpn.js:123", "VPN功能已初始化");
        return this.pluginAvailable;
      }
      await this.diagnosePlugin();
      formatAppLog("log", "at utils/android-vpn.js:128", "开始初始化VPN功能");
      this.pluginAvailable = await this.verifyPlugin();
      formatAppLog("log", "at utils/android-vpn.js:131", "插件可用状态:", this.pluginAvailable);
      try {
        const systemInfo = uni.getSystemInfoSync();
        formatAppLog("log", "at utils/android-vpn.js:136", "系统平台:", systemInfo.platform);
        if (systemInfo.platform !== "android") {
          formatAppLog("warn", "at utils/android-vpn.js:139", "VPN功能仅支持Android平台");
          this.isInitialized = true;
          this.pluginAvailable = false;
          return false;
        }
        if (typeof requireNativePlugin !== "function") {
          formatAppLog("error", "at utils/android-vpn.js:147", "requireNativePlugin 方法不可用");
          this.isInitialized = true;
          this.pluginAvailable = false;
          return false;
        }
        try {
          this.vpnPlugin = requireNativePlugin("MyVpnPlugin");
          if (!this.vpnPlugin) {
            throw new Error("插件加载返回null");
          }
          if (typeof this.vpnPlugin.startVpn !== "function" || typeof this.vpnPlugin.stopVpn !== "function") {
            formatAppLog("error", "at utils/android-vpn.js:163", "VPN插件方法不完整");
            this.pluginAvailable = false;
          } else {
            this.pluginAvailable = true;
            formatAppLog("log", "at utils/android-vpn.js:167", "VPN插件加载成功，方法检查通过");
          }
        } catch (pluginError) {
          formatAppLog("error", "at utils/android-vpn.js:170", "加载VPN插件失败:", pluginError);
          this.pluginAvailable = false;
        }
        if (this.pluginAvailable) {
          await this.setupStatusListener();
        }
        this.isInitialized = true;
        formatAppLog("log", "at utils/android-vpn.js:180", "VPN功能初始化完成，插件可用状态:", this.pluginAvailable);
        return this.pluginAvailable;
      } catch (error) {
        formatAppLog("error", "at utils/android-vpn.js:192", "VPN初始化异常:", error);
        this.isInitialized = true;
        this.pluginAvailable = false;
        return false;
      }
    }
    // 设置状态监听
    async setupStatusListener() {
      if (!this.vpnPlugin || typeof this.vpnPlugin.onVpnStatusUpdate !== "function") {
        formatAppLog("warn", "at utils/android-vpn.js:202", "VPN插件不支持状态监听，使用模拟模式");
        return;
      }
      return new Promise((resolve) => {
        try {
          this.vpnPlugin.onVpnStatusUpdate({}, (result) => {
            formatAppLog("log", "at utils/android-vpn.js:209", "收到原生VPN状态更新:", JSON.stringify(result));
            this.handleNativeStatusUpdate(result);
          });
          formatAppLog("log", "at utils/android-vpn.js:212", "VPN状态监听注册成功");
          resolve(true);
        } catch (error) {
          formatAppLog("error", "at utils/android-vpn.js:215", "注册状态监听失败:", error);
          resolve(false);
        }
      });
    }
    // 处理原生状态更新
    handleNativeStatusUpdate(result) {
      if (!result || typeof result !== "object") {
        formatAppLog("warn", "at utils/android-vpn.js:224", "无效的状态更新数据");
        return;
      }
      const connected = !!result.connected || !!result.isConnected;
      const message = result.message || "状态更新";
      const status = result.status || (connected ? "connected" : "disconnected");
      this.lastStatus = result;
      this.isConnected = connected;
      this.isConnecting = false;
      this.connectionState = status;
      formatAppLog("log", "at utils/android-vpn.js:237", "处理VPN状态更新:", {
        connected,
        status,
        message
      });
      if (connected) {
        this.retryCount = 0;
      }
      if (this.statusCallback) {
        const statusInfo = {
          connected,
          isConnected: connected,
          status,
          message,
          timestamp: result.timestamp || Date.now(),
          success: result.success !== false
        };
        this.statusCallback(statusInfo);
      }
    }
    // 启动VPN连接
    async connect(node) {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }
        if (!this.pluginAvailable) {
          let errorMsg = "VPN插件不可用 - ";
          if (!this.vpnPlugin) {
            errorMsg += "插件对象为null";
          } else if (typeof this.vpnPlugin.startVpn !== "function") {
            errorMsg += "startVpn方法不存在";
          } else {
            errorMsg += "未知原因";
          }
          formatAppLog("warn", "at utils/android-vpn.js:281", errorMsg + "，使用模拟模式");
          return this.mockConnect(node);
        }
        if (this.isConnecting) {
          throw new Error("VPN连接正在进行中");
        }
        if (this.isConnected) {
          throw new Error("VPN已连接，请先断开");
        }
        if (!node || !node.host || !node.port) {
          throw new Error("节点信息不完整");
        }
        formatAppLog("log", "at utils/android-vpn.js:299", "开始连接VPN，服务器:", node.host + ":" + node.port);
        this.isConnecting = true;
        this.connectionState = "connecting";
        return new Promise((resolve, reject) => {
          const connectionParams = {
            server: node.host,
            port: parseInt(node.port) || 1080,
            username: node.account || "default",
            password: node.password || "default"
          };
          formatAppLog("log", "at utils/android-vpn.js:312", "调用原生连接方法:", connectionParams);
          const timeoutId = setTimeout(() => {
            reject(new Error("VPN连接超时（30秒）"));
          }, 3e4);
          this.vpnPlugin.startVpn(connectionParams, (result) => {
            clearTimeout(timeoutId);
            formatAppLog("log", "at utils/android-vpn.js:321", "原生连接回调:", JSON.stringify(result));
            this.isConnecting = false;
            if (result && result.success) {
              this.isConnected = true;
              this.connectionState = "connected";
              resolve(result);
            } else {
              const errorMsg = result ? result.message : "连接失败，无返回结果";
              this.isConnected = false;
              this.connectionState = "disconnected";
              reject(new Error(errorMsg));
            }
          });
        });
      } catch (error) {
        this.isConnecting = false;
        this.isConnected = false;
        this.connectionState = "error";
        formatAppLog("error", "at utils/android-vpn.js:342", "VPN连接错误:", error);
        throw error;
      }
    }
    // 处理连接错误
    handleConnectionError(errorMsg, reject) {
      this.isConnecting = false;
      this.isConnected = false;
      this.connectionState = "error";
      formatAppLog("error", "at utils/android-vpn.js:353", "VPN连接错误:", errorMsg);
      this.triggerStatusUpdate(false, errorMsg, "error");
      if (reject) {
        reject(new Error(errorMsg));
      }
    }
    // 断开VPN连接
    async disconnect() {
      formatAppLog("log", "at utils/android-vpn.js:365", "开始断开VPN连接");
      try {
        if (!this.isConnected && !this.isConnecting) {
          formatAppLog("log", "at utils/android-vpn.js:369", "VPN未连接，无需断开");
          return {
            success: true,
            message: "VPN未连接",
            wasConnected: false
          };
        }
        this.triggerStatusUpdate(false, "正在断开连接...", "disconnecting");
        if (!this.vpnPlugin) {
          throw new Error("VPN插件未初始化");
        }
        return new Promise((resolve, reject) => {
          this.vpnPlugin.stopVpn({}, (result) => {
            formatAppLog("log", "at utils/android-vpn.js:387", "原生断开回调:", JSON.stringify(result));
            this.isConnecting = false;
            if (result && result.success) {
              formatAppLog("log", "at utils/android-vpn.js:392", "VPN断开指令发送成功");
              resolve({
                success: true,
                message: "VPN断开指令已发送",
                wasConnected: true
              });
            } else {
              const errorMsg = result ? result.message : "断开失败";
              this.handleDisconnectionError(errorMsg, reject);
            }
          });
        });
      } catch (error) {
        this.handleDisconnectionError(error.message, () => {
          throw error;
        });
      }
    }
    // 处理断开错误
    handleDisconnectionError(errorMsg, reject) {
      formatAppLog("error", "at utils/android-vpn.js:420", "VPN断开错误:", errorMsg);
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionState = "disconnected";
      this.triggerStatusUpdate(false, errorMsg, "error");
      if (reject) {
        reject(new Error(errorMsg));
      }
    }
    // 监听状态变化
    onStatusUpdate(callback) {
      formatAppLog("log", "at utils/android-vpn.js:436", "注册状态更新回调");
      this.statusCallback = callback;
      if (this.statusCallback) {
        this.triggerStatusUpdate(
          this.isConnected,
          this.isConnected ? "已连接" : "未连接",
          this.connectionState
        );
      }
    }
    // 触发状态更新
    triggerStatusUpdate(connected, message, status = null) {
      const statusInfo = {
        connected,
        isConnected: connected,
        status: status || (connected ? "connected" : "disconnected"),
        message,
        timestamp: Date.now()
      };
      formatAppLog("log", "at utils/android-vpn.js:457", "触发状态更新:", statusInfo);
      if (this.statusCallback) {
        this.statusCallback(statusInfo);
      }
    }
    // 移除状态监听
    offStatusUpdate() {
      formatAppLog("log", "at utils/android-vpn.js:466", "移除状态监听");
      this.statusCallback = null;
    }
    // 获取当前状态
    async getStatus() {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }
        if (this.vpnPlugin && typeof this.vpnPlugin.getVpnStatus === "function") {
          return new Promise((resolve) => {
            this.vpnPlugin.getVpnStatus({}, (result) => {
              formatAppLog("log", "at utils/android-vpn.js:481", "获取VPN状态结果:", JSON.stringify(result));
              if (result) {
                this.handleNativeStatusUpdate(result);
              }
              resolve(result || {
                isConnected: this.isConnected,
                connected: this.isConnected,
                status: this.connectionState,
                message: "状态查询完成",
                success: true
              });
            });
          });
        }
        return {
          isConnected: this.isConnected,
          connected: this.isConnected,
          status: this.connectionState,
          message: "当前状态",
          success: true
        };
      } catch (error) {
        formatAppLog("error", "at utils/android-vpn.js:505", "获取状态错误:", error);
        return {
          isConnected: false,
          connected: false,
          status: "error",
          message: error.message,
          success: false
        };
      }
    }
    // 获取连接状态摘要
    getConnectionSummary() {
      return {
        isConnected: this.isConnected,
        isConnecting: this.isConnecting,
        connectionState: this.connectionState,
        lastStatus: this.lastStatus
      };
    }
    // 模拟连接（测试用）
    async mockConnect(node) {
      formatAppLog("log", "at utils/android-vpn.js:528", "模拟VPN连接:", node.host);
      return new Promise((resolve) => {
        setTimeout(() => {
          this.isConnecting = false;
          this.isConnected = true;
          this.connectionState = "connected";
          this.triggerStatusUpdate(true, "模拟连接成功", "connected");
          resolve({
            success: true,
            message: "模拟连接成功"
          });
        }, 2e3);
      });
    }
    // 模拟断开（测试用）
    async mockDisconnect() {
      formatAppLog("log", "at utils/android-vpn.js:547", "模拟VPN断开");
      return new Promise((resolve) => {
        setTimeout(() => {
          this.isConnected = false;
          this.connectionState = "disconnected";
          this.triggerStatusUpdate(false, "模拟断开成功", "disconnected");
          resolve({
            success: true,
            message: "模拟断开成功",
            wasConnected: true
          });
        }, 1e3);
      });
    }
  }
  const androidVpnManager = new AndroidVpnManager();
  const _sfc_main$2 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const isLoggedIn = vue.ref(false);
      const username = vue.ref("");
      const token = vue.ref("");
      const isConnected = vue.ref(false);
      const isConnecting = vue.ref(false);
      const statusText = vue.ref("未连接");
      const connectionInfo = vue.ref("--");
      const connectionTime = vue.ref("--");
      const connectButtonText = vue.ref("连接VPN");
      const selectedNode = vue.ref(null);
      const selectedApps = vue.ref([0]);
      const nodes = vue.ref([]);
      const connectionSeconds = vue.ref(0);
      const connectingInterval = vue.ref(null);
      const page = vue.ref(1);
      const pageSize = vue.ref(20);
      const isBottom = vue.ref(false);
      const isLoading = vue.ref(false);
      const apps = vue.ref([
        {
          name: "浏览器",
          icon: "compass"
        },
        {
          name: "WhatsApp",
          icon: "chat"
        },
        {
          name: "Telegram",
          icon: "chatboxes"
        },
        {
          name: "Twitter",
          icon: "personadd"
        },
        {
          name: "Instagram",
          icon: "camera"
        },
        {
          name: "Facebook",
          icon: "person"
        },
        {
          name: "游戏",
          icon: "game"
        },
        {
          name: "全部应用",
          icon: "more"
        }
      ]);
      const log = (message, data = null) => {
        {
          formatAppLog("log", "at pages/index/index.vue:181", `[VPN] ${message}`, data || "");
        }
      };
      const statusClass = vue.computed(() => {
        if (isConnected.value)
          return "connected";
        if (isConnecting.value)
          return "connecting";
        return "disconnected";
      });
      const availableNodes = vue.computed(() => {
        return nodes.value.filter((node) => {
          const isOnline = node.status === true;
          const isNotExpired = new Date(node.expire) > /* @__PURE__ */ new Date();
          return isOnline && isNotExpired;
        });
      });
      vue.onMounted(() => {
        checkLoginStatus();
        setupVpn();
      });
      onShow(() => {
        if (isLoggedIn.value) {
          page.value = 1;
          isBottom.value = false;
          fetchNodes(false);
        }
      });
      vue.onUnmounted(() => {
        if (connectingInterval.value) {
          clearInterval(connectingInterval.value);
          connectingInterval.value = null;
        }
        androidVpnManager.offStatusUpdate();
      });
      const setupVpn = async () => {
        const isAndroid = uni.getSystemInfoSync().platform === "android";
        log("初始化VPN功能");
        if (isAndroid) {
          try {
            await androidVpnManager.initialize();
            androidVpnManager.onStatusUpdate((status) => {
              handleVpnStatusChange(status);
            });
            const currentStatus = await androidVpnManager.getStatus();
            handleVpnStatusChange(currentStatus);
          } catch (error) {
            log("VPN初始化失败", error);
            handleVpnStatusChange({
              connected: false,
              isConnected: false,
              status: "disconnected",
              message: "初始化失败"
            });
          }
        } else {
          log("非Android平台，不支持VPN");
          handleVpnStatusChange({
            connected: false,
            isConnected: false,
            status: "unsupported",
            message: "当前平台不支持VPN"
          });
        }
      };
      onReachBottom(() => {
        if (!isBottom.value && !isLoading.value) {
          page.value++;
          fetchNodes(true);
        }
      });
      onPullDownRefresh(async () => {
        page.value = 1;
        isBottom.value = false;
        isLoading.value = false;
        await fetchNodes(false);
        uni.stopPullDownRefresh();
      });
      const checkLoginStatus = () => {
        const storedToken = uni.getStorageSync("token");
        const storedUsername = uni.getStorageSync("username");
        if (storedToken && storedUsername) {
          isLoggedIn.value = true;
          username.value = storedUsername;
          token.value = storedToken;
        }
      };
      const fetchNodes = async (isLoadMore = false) => {
        var _a;
        if (!isLoggedIn.value) {
          uni.showToast({
            title: "请先登录",
            icon: "none"
          });
          return;
        }
        if (isLoading.value)
          return;
        isLoading.value = true;
        if (!isLoadMore) {
          uni.showLoading({
            title: "获取节点中..."
          });
        }
        try {
          const res = await uni.request({
            url: "http://124.223.21.69/api/nodes",
            method: "GET",
            data: {
              page: page.value,
              pageSize: pageSize.value
            },
            header: {
              "Authorization": "Bearer " + token.value
            }
          });
          if (res.statusCode === 200 && res.data) {
            let newNodes = [];
            if (Array.isArray(res.data)) {
              newNodes = res.data;
            } else if (res.data.nodes && Array.isArray(res.data.nodes)) {
              newNodes = res.data.nodes;
            } else if (res.data.data && Array.isArray(res.data.data)) {
              newNodes = res.data.data;
            } else {
              newNodes = [];
            }
            const processedNodes = newNodes.map((node) => ({
              ...node,
              displayName: node.tag || "未知节点",
              isAvailable: node.status === true && new Date(node.expire) > /* @__PURE__ */ new Date(),
              expireText: formatDate(node.expire),
              hasAuth: !!(node.account && node.password)
            }));
            if (isLoadMore) {
              nodes.value = [...nodes.value, ...processedNodes];
            } else {
              nodes.value = processedNodes;
              const firstAvailableIndex = processedNodes.findIndex((node) => node.isAvailable);
              if (firstAvailableIndex !== -1) {
                selectedNode.value = firstAvailableIndex;
              } else if (processedNodes.length > 0) {
                selectedNode.value = 0;
              }
            }
            const total = res.data.total || newNodes.length;
            if (newNodes.length < pageSize.value || nodes.value.length >= total) {
              isBottom.value = true;
            }
            if (!isLoadMore) {
              uni.hideLoading();
            }
          } else {
            throw new Error(((_a = res.data) == null ? void 0 : _a.message) || "获取节点失败");
          }
        } catch (error) {
          if (!isLoadMore) {
            uni.hideLoading();
          }
          uni.showToast({
            title: "获取节点失败",
            icon: "none"
          });
          log("获取节点失败:", error);
        } finally {
          isLoading.value = false;
        }
      };
      const handleAuth = () => {
        if (isLoggedIn.value) {
          uni.showModal({
            title: "确认退出",
            content: "确定要退出登录吗？",
            success: (res) => {
              if (res.confirm) {
                uni.removeStorageSync("token");
                uni.removeStorageSync("username");
                isLoggedIn.value = false;
                token.value = "";
                nodes.value = [];
                selectedNode.value = null;
                if (isConnected.value) {
                  disconnectVPN();
                }
                uni.showToast({
                  title: "已退出登录",
                  icon: "success"
                });
              }
            }
          });
        } else {
          uni.navigateTo({
            url: "/pages/login/login"
          });
        }
      };
      const connectVPN = async () => {
        if (isConnecting.value) {
          uni.showToast({
            title: "连接正在进行中，请稍候",
            icon: "none",
            duration: 1e3
          });
          return;
        }
        if (!isLoggedIn.value) {
          uni.showToast({
            title: "请先登录",
            icon: "none"
          });
          return;
        }
        if (selectedNode.value === null) {
          uni.showToast({
            title: "请先选择节点",
            icon: "none"
          });
          return;
        }
        const selectedNodeData = nodes.value[selectedNode.value];
        if (!selectedNodeData.isAvailable) {
          uni.showToast({
            title: "当前节点不可用",
            icon: "none"
          });
          return;
        }
        if (!selectedNodeData.hasAuth) {
          uni.showToast({
            title: "当前节点缺少认证信息",
            icon: "none"
          });
          return;
        }
        log("开始VPN连接流程", {
          node: selectedNodeData.tag
        });
        isConnecting.value = true;
        statusText.value = "连接中...";
        connectButtonText.value = "连接中";
        try {
          await androidVpnManager.connect(selectedNodeData);
          log("VPN连接指令完成");
        } catch (error) {
          log("VPN连接错误", error);
        }
      };
      const disconnectVPN = async () => {
        try {
          log("开始断开VPN连接");
          await androidVpnManager.disconnect();
          log("VPN断开指令完成");
        } catch (error) {
          log("断开VPN失败", error);
          uni.showToast({
            title: error.message || "断开VPN失败",
            icon: "none"
          });
        }
      };
      const toggleVPN = async () => {
        if (isConnecting.value) {
          return;
        }
        if (!isLoggedIn.value) {
          uni.showToast({
            title: "请先登录",
            icon: "none"
          });
          return;
        }
        if (nodes.value.length === 0) {
          uni.showToast({
            title: "暂无可用节点",
            icon: "none"
          });
          return;
        }
        if (selectedNode.value === null) {
          uni.showToast({
            title: "请先选择节点",
            icon: "none"
          });
          return;
        }
        const selectedNodeData = nodes.value[selectedNode.value];
        if (!selectedNodeData.isAvailable) {
          uni.showToast({
            title: "当前节点不可用",
            icon: "none"
          });
          return;
        }
        if (!selectedNodeData.hasAuth) {
          uni.showToast({
            title: "当前节点缺少认证信息",
            icon: "none"
          });
          return;
        }
        log("切换VPN状态", {
          isConnected: isConnected.value,
          isConnecting: isConnecting.value,
          node: selectedNodeData.tag
        });
        if (isConnected.value) {
          await disconnectVPN();
        } else {
          await connectVPN();
        }
      };
      const handleVpnStatusChange = (status) => {
        const connected = status.connected !== void 0 ? status.connected : status.isConnected !== void 0 ? status.isConnected : false;
        isConnected.value = connected;
        isConnecting.value = false;
        if (connected) {
          statusText.value = "已连接";
          connectButtonText.value = "断开连接";
          if (selectedNode.value !== null) {
            const selectedNodeData = nodes.value[selectedNode.value];
            connectionInfo.value = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`;
          }
          connectionSeconds.value = 0;
          updateConnectionTime();
          if (connectingInterval.value) {
            clearInterval(connectingInterval.value);
          }
          connectingInterval.value = setInterval(updateConnectionTime, 1e3);
          uni.showToast({
            title: status.message || "VPN连接成功",
            icon: "success",
            duration: 2e3
          });
        } else {
          statusText.value = status.message || "未连接";
          connectButtonText.value = "连接VPN";
          connectionInfo.value = "--";
          connectionTime.value = "--";
          if (connectingInterval.value) {
            clearInterval(connectingInterval.value);
            connectingInterval.value = null;
          }
          if (status.message && status.message !== "未连接" && !status.message.includes("初始化")) {
            uni.showToast({
              title: status.message,
              icon: "none",
              duration: 2e3
            });
          }
        }
      };
      const handleVpnError = (error) => {
        let errorMessage = "VPN连接失败";
        if (error && typeof error === "object") {
          errorMessage = error.message || "VPN连接失败";
        }
        formatAppLog("error", "at pages/index/index.vue:623", "处理VPN错误:", errorMessage);
        isConnecting.value = false;
        isConnected.value = false;
        if (errorMessage.includes("插件未初始化") || errorMessage.includes("插件不可用")) {
          errorMessage = "VPN功能暂不可用，正在使用模拟模式";
          setTimeout(async () => {
            formatAppLog("log", "at pages/index/index.vue:634", "尝试使用模拟模式连接");
            try {
              const selectedNodeData = nodes.value[selectedNode.value];
              await androidVpnManager.mockConnect(selectedNodeData);
            } catch (mockError) {
              formatAppLog("error", "at pages/index/index.vue:639", "模拟模式连接也失败:", mockError);
            }
          }, 1e3);
        }
        statusText.value = "连接失败";
        connectButtonText.value = "连接VPN";
        uni.showToast({
          title: errorMessage,
          icon: "none",
          duration: 3e3
        });
        handleVpnStatusChange({
          connected: false,
          isConnected: false,
          status: "error",
          message: errorMessage
        });
      };
      const updateConnectionTime = () => {
        connectionSeconds.value++;
        const hours = Math.floor(connectionSeconds.value / 3600);
        const minutes = Math.floor(connectionSeconds.value % 3600 / 60);
        const seconds = connectionSeconds.value % 60;
        if (hours > 0) {
          connectionTime.value = `连接时间: ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        } else {
          connectionTime.value = `连接时间: ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
      };
      const selectNode = (index) => {
        const node = nodes.value[index];
        if (!node.isAvailable) {
          uni.showToast({
            title: "该节点不可用",
            icon: "none"
          });
          return;
        }
        if (!node.hasAuth) {
          uni.showToast({
            title: "该节点缺少认证信息",
            icon: "none"
          });
          return;
        }
        selectedNode.value = index;
        if (isConnected.value) {
          connectionInfo.value = `${node.tag} · ${node.host}:${node.port}`;
        }
        uni.showToast({
          title: `已选择: ${node.tag}`,
          icon: "success"
        });
      };
      const toggleAppSelection = (index) => {
        if (index === 7) {
          selectedApps.value = [7];
        } else {
          if (selectedApps.value.includes(index)) {
            selectedApps.value = selectedApps.value.filter((i) => i !== index);
            if (selectedApps.value.length === 0) {
              selectedApps.value = [7];
            }
          } else {
            selectedApps.value = selectedApps.value.filter((i) => i !== 7);
            selectedApps.value.push(index);
          }
        }
      };
      const getCountryFlag = (tag) => {
        const flagMap = {
          "广东": "🇨🇳",
          "河间": "🇨🇳",
          "天津": "🇨🇳",
          "宁波": "🇨🇳",
          "蠡县": "🇨🇳",
          "澄海": "🇨🇳",
          "凤翔": "🇨🇳"
        };
        for (const [key, flag] of Object.entries(flagMap)) {
          if (tag.includes(key)) {
            return flag;
          }
        }
        return "🌐";
      };
      const formatDate = (dateString) => {
        if (!dateString)
          return "未知";
        const date = new Date(dateString);
        const now = /* @__PURE__ */ new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
        if (diffDays <= 30) {
          return `${diffDays}天后过期`;
        } else {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
        }
      };
      const __returned__ = { isLoggedIn, username, token, isConnected, isConnecting, statusText, connectionInfo, connectionTime, connectButtonText, selectedNode, selectedApps, nodes, connectionSeconds, connectingInterval, page, pageSize, isBottom, isLoading, apps, log, statusClass, availableNodes, setupVpn, checkLoginStatus, fetchNodes, handleAuth, connectVPN, disconnectVPN, toggleVPN, handleVpnStatusChange, handleVpnError, updateConnectionTime, selectNode, toggleAppSelection, getCountryFlag, formatDate, ref: vue.ref, computed: vue.computed, onMounted: vue.onMounted, onUnmounted: vue.onUnmounted, get onShow() {
        return onShow;
      }, get onReachBottom() {
        return onReachBottom;
      }, get onPullDownRefresh() {
        return onPullDownRefresh;
      }, UniIcons, get androidVpnManager() {
        return androidVpnManager;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 头部 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", { class: "user-info" }, [
          $setup.isLoggedIn ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 0,
              class: "welcome-text"
            },
            "欢迎, " + vue.toDisplayString($setup.username),
            1
            /* TEXT */
          )) : (vue.openBlock(), vue.createElementBlock("text", {
            key: 1,
            class: "welcome-text"
          }, "请先登录")),
          vue.createElementVNode(
            "button",
            {
              class: "btn-auth",
              onClick: $setup.handleAuth
            },
            vue.toDisplayString($setup.isLoggedIn ? "退出登录" : "登录"),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" VPN连接状态 "),
      vue.createElementVNode("view", { class: "vpn-status-card" }, [
        vue.createElementVNode("view", { class: "status-header" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["status-indicator", $setup.statusClass])
            },
            null,
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "text",
            { class: "status-text" },
            vue.toDisplayString($setup.statusText),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode(
          "view",
          { class: "connection-info" },
          vue.toDisplayString($setup.connectionInfo),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "view",
          { class: "connection-time" },
          vue.toDisplayString($setup.connectionTime),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: vue.normalizeClass(["btn-connect", { "connecting": $setup.isConnecting }]),
          onClick: $setup.toggleVPN,
          disabled: !$setup.isLoggedIn || $setup.availableNodes.length === 0 || $setup.selectedNode === null
        }, vue.toDisplayString($setup.connectButtonText), 11, ["disabled"])
      ]),
      vue.createCommentVNode(" 节点列表 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "节点列表"),
          vue.createElementVNode("view", {
            class: "section-action",
            onClick: $setup.fetchNodes
          }, [
            vue.createElementVNode("text", { class: "refresh-text" }, "刷新"),
            vue.createVNode($setup["UniIcons"], {
              type: "refresh",
              size: "16",
              color: "#4361ee"
            })
          ])
        ]),
        vue.createElementVNode("view", { class: "nodes-stats" }, [
          vue.createElementVNode(
            "text",
            { class: "stats-text" },
            "可用节点: " + vue.toDisplayString($setup.availableNodes.length) + "/" + vue.toDisplayString($setup.nodes.length),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("scroll-view", {
          class: "node-list",
          "scroll-y": ""
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.nodes, (node, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: node._id,
                class: vue.normalizeClass(["node-item", {
                  "selected": $setup.selectedNode === index,
                  "offline": !node.isAvailable,
                  "no-auth": !node.hasAuth
                }]),
                onClick: ($event) => $setup.selectNode(index)
              }, [
                vue.createElementVNode("view", { class: "node-info" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "node-flag" },
                    vue.toDisplayString($setup.getCountryFlag(node.tag)),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "node-details" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "node-name" },
                      vue.toDisplayString(node.tag),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "node-meta" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "node-location" },
                        vue.toDisplayString(node.host) + ":" + vue.toDisplayString(node.port),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "node-expire" },
                        vue.toDisplayString(node.expireText),
                        1
                        /* TEXT */
                      )
                    ])
                  ])
                ]),
                vue.createElementVNode("view", { class: "node-status" }, [
                  vue.createElementVNode("view", { class: "status-indicators" }, [
                    vue.createElementVNode(
                      "text",
                      {
                        class: vue.normalizeClass(node.status ? "status-online" : "status-offline")
                      },
                      vue.toDisplayString(node.status ? "在线" : "离线"),
                      3
                      /* TEXT, CLASS */
                    ),
                    !node.hasAuth ? (vue.openBlock(), vue.createElementBlock("text", {
                      key: 0,
                      class: "status-noauth"
                    }, "无认证")) : vue.createCommentVNode("v-if", true)
                  ]),
                  $setup.selectedNode === index ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "selected-indicator"
                  }, [
                    vue.createVNode($setup["UniIcons"], {
                      type: "checkmark",
                      size: "16",
                      color: "#4361ee"
                    })
                  ])) : vue.createCommentVNode("v-if", true)
                ])
              ], 10, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          $setup.nodes.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "empty-state"
          }, [
            vue.createElementVNode("text", null, "暂无节点数据，请先登录或刷新")
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      vue.createCommentVNode(" 应用选择 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "选择应用")
        ]),
        vue.createElementVNode("view", { class: "app-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.apps, (app, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: index,
                class: vue.normalizeClass(["app-item", { "selected": $setup.selectedApps.includes(index) }]),
                onClick: ($event) => $setup.toggleAppSelection(index)
              }, [
                vue.createElementVNode("view", { class: "app-icon" }, [
                  vue.createVNode($setup["UniIcons"], {
                    type: app.icon,
                    size: "24",
                    color: "#4361ee"
                  }, null, 8, ["type"])
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "app-label" },
                  vue.toDisplayString(app.name),
                  1
                  /* TEXT */
                )
              ], 10, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 使用提示 "),
      vue.createElementVNode("view", { class: "section tips-section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "使用提示")
        ]),
        vue.createElementVNode("view", { class: "tips-content" }, [
          vue.createElementVNode("text", { class: "tip-item" }, '• 请选择状态为"在线"且有认证信息的节点'),
          vue.createElementVNode("text", { class: "tip-item" }, "• 连接成功后，所有应用流量将通过VPN"),
          vue.createElementVNode("text", { class: "tip-item" }, "• 首次连接需要授予VPN权限")
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-1cf27b2a"], ["__file", "F:/uni-app_node/uni-app/Eaccelerate/pages/index/index.vue"]]);
  const _imports_0 = "/static/icon.ico";
  const _sfc_main$1 = {
    __name: "login",
    setup(__props, { expose: __expose }) {
      __expose();
      const username = vue.ref("test_pan_1234");
      const password = vue.ref("123456");
      const handleLogin = async () => {
        if (!username.value || !password.value) {
          uni.showToast({
            title: "请输入用户名和密码",
            icon: "none"
          });
          return;
        }
        uni.showLoading({
          title: "登录中..."
        });
        try {
          const res = await uni.request({
            url: "http://124.223.21.69/api/users/login",
            method: "POST",
            data: {
              username: username.value,
              password: password.value
            },
            header: {
              "Content-Type": "application/json"
            }
          });
          if (res.statusCode === 200 && res.data) {
            const token = res.data.token || res.data.accessToken;
            if (token) {
              uni.setStorageSync("token", token);
              uni.setStorageSync("username", username.value);
              uni.hideLoading();
              uni.showToast({
                title: "登录成功",
                icon: "success"
              });
              setTimeout(() => {
                uni.reLaunch({
                  url: "/pages/index/index"
                });
              }, 1500);
            } else {
              throw new Error("登录失败: 未获取到token");
            }
          } else {
            throw new Error("登录失败: " + (res.data.message || "未知错误"));
          }
        } catch (error) {
          uni.hideLoading();
          uni.showToast({
            title: "登录失败",
            icon: "none"
          });
          formatAppLog("error", "at pages/login/login.vue:99", "登录失败:", error);
        }
      };
      const __returned__ = { username, password, handleLogin, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createElementVNode("view", { class: "login-header" }, [
        vue.createElementVNode("view", { class: "title-container" }, [
          vue.createElementVNode("image", {
            class: "title-icon",
            src: _imports_0,
            mode: "aspectFit"
          }),
          vue.createElementVNode("text", { class: "login-title" }, "e加速")
        ]),
        vue.createElementVNode("text", { class: "login-subtitle" }, "请登录您的VPN账户")
      ]),
      vue.createElementVNode("view", { class: "login-form" }, [
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.createElementVNode("text", { class: "input-label" }, "用户名"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input-field",
              type: "text",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.username = $event),
              placeholder: "请输入用户名"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.username]
          ])
        ]),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.createElementVNode("text", { class: "input-label" }, "密码"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input-field",
              type: "password",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.password = $event),
              placeholder: "请输入密码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.password]
          ])
        ]),
        vue.createElementVNode("button", {
          class: "btn-login",
          onClick: $setup.handleLogin
        }, "登录"),
        vue.createElementVNode("view", { class: "login-tips" }, [
          vue.createCommentVNode(" <text>测试账号: test123 / test123</text> ")
        ])
      ]),
      vue.createCommentVNode(' <view class="login-footer">\r\n      <text class="footer-text">© 2025 VPN助手</text>\r\n    </view> ')
    ]);
  }
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-e4e4508d"], ["__file", "F:/uni-app_node/uni-app/Eaccelerate/pages/login/login.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/login/login", PagesLoginLogin);
  const _sfc_main = {
    __name: "App",
    setup(__props, { expose: __expose }) {
      __expose();
      onLaunch(() => {
        formatAppLog("log", "at App.vue:6", "App Launch");
        const token = uni.getStorageSync("token");
        if (token) {
          uni.reLaunch({
            url: "/pages/index/index"
          });
        }
      });
      formatAppLog("log", "at App.vue:18", "App Show");
      onHide(() => {
        formatAppLog("log", "at App.vue:22", "App Hide");
      });
      const __returned__ = { get onLaunch() {
        return onLaunch;
      }, get onShow() {
        return onShow;
      }, get onHide() {
        return onHide;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "F:/uni-app_node/uni-app/Eaccelerate/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
