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
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
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
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-f218fb61"], ["__file", "D:/uniapp_node/Eaccelerate/components/uni-icons/uni-icons.vue"]]);
  class AndroidVpnManager {
    constructor() {
      this.vpn = null;
      this.available = false;
      this.inited = false;
      this.isConnecting = false;
      this.isConnected = false;
      this.statusCb = null;
      this.timer = null;
      this.connectStartAt = 0;
    }
    // 触发状态回调
    _emit(status) {
      if (typeof this.statusCb === "function") {
        try {
          this.statusCb(status || {});
        } catch (e) {
          formatAppLog("error", "at utils/android-vpn.js:20", e);
        }
      }
    }
    // 初始化：装载原生插件（仅 Android APP-PLUS 环境）
    async initialize() {
      if (this.inited)
        return this.available;
      try {
        const sys = uni.getSystemInfoSync();
        if (sys.platform !== "android") {
          formatAppLog("warn", "at utils/android-vpn.js:32", "[VPN] 非 Android 平台，跳过原生插件");
          this.available = false;
          this.inited = true;
          return false;
        }
        if (typeof requireNativePlugin !== "function") {
          formatAppLog("warn", "at utils/android-vpn.js:36", "[VPN] requireNativePlugin 不可用");
          this.available = false;
          this.inited = true;
          return false;
        }
        this.vpn = requireNativePlugin("MyVpnPlugin");
        this.available = !!this.vpn;
        if (this.available) {
          if (typeof this.vpn.onVpnStatusUpdate === "function") {
            this.vpn.onVpnStatusUpdate((s) => {
              const connected = !!(s && (s.connected || s.isConnected));
              const msg = s && (s.message || s.msg) || (connected ? "已连接" : "未连接");
              this.isConnected = connected;
              this.isConnecting = false;
              this._emit({
                connected,
                status: connected ? "connected" : "disconnected",
                message: msg
              });
            });
          }
        } else {
          formatAppLog("warn", "at utils/android-vpn.js:61", "[VPN] 未加载到原生插件，将使用模拟模式");
        }
      } catch (e) {
        formatAppLog("error", "at utils/android-vpn.js:64", "[VPN] 初始化失败：", e);
        this.available = false;
      }
      this.inited = true;
      return this.available;
    }
    onStatusUpdate(cb) {
      this.statusCb = cb;
    }
    offStatusUpdate() {
      this.statusCb = null;
    }
    async getStatus() {
      if (!this.inited)
        await this.initialize();
      if (this.available && typeof this.vpn.getVpnStatus === "function") {
        try {
          return await new Promise((resolve) => {
            this.vpn.getVpnStatus((s) => {
              const connected = !!(s && (s.connected || s.isConnected));
              resolve({
                connected,
                status: connected ? "connected" : "disconnected",
                message: s && (s.message || s.msg) || (connected ? "已连接" : "未连接")
              });
            });
          });
        } catch (e) {
        }
      }
      return {
        connected: this.isConnected,
        status: this.isConnected ? "connected" : this.isConnecting ? "connecting" : "disconnected",
        message: this.isConnected ? "已连接" : "未连接"
      };
    }
    // 连接
    async connect(node) {
      if (!this.inited)
        await this.initialize();
      if (!node || !node.host || !node.port) {
        throw new Error("节点信息不完整");
      }
      if (this.isConnecting)
        throw new Error("连接中，请稍候");
      if (this.isConnected)
        throw new Error("已连接，请先断开");
      const params = {
        proxyType: "socks5",
        server: node.host,
        port: parseInt(node.port, 10) || 1080,
        username: node.account || "",
        password: node.password || "",
        authType: node.account && node.password ? "password" : "none"
      };
      this.isConnecting = true;
      this._emit({ connected: false, status: "connecting", message: "连接中..." });
      if (this.available && typeof this.vpn.startVpn === "function") {
        return await new Promise((resolve, reject) => {
          const to = setTimeout(() => {
            this.isConnecting = false;
            reject(new Error("连接超时"));
            this._emit({ connected: false, status: "error", message: "连接超时" });
          }, 3e4);
          try {
            this.vpn.startVpn(params, (ret) => {
              clearTimeout(to);
              this.isConnecting = false;
              const ok = !!(ret && ret.success);
              this.isConnected = ok;
              this.connectStartAt = ok ? Date.now() : 0;
              this._emit({
                connected: ok,
                status: ok ? "connected" : "error",
                message: ret && ret.message || (ok ? "连接成功" : "连接失败")
              });
              return ok ? resolve(ret) : reject(new Error(ret && ret.message || "连接失败"));
            });
          } catch (e) {
            clearTimeout(to);
            this.isConnecting = false;
            this.isConnected = false;
            this._emit({ connected: false, status: "error", message: e.message || "连接异常" });
            reject(e);
          }
        });
      }
      return await this._mockConnect();
    }
    // 断开
    async disconnect() {
      if (this.available && typeof this.vpn.stopVpn === "function") {
        return await new Promise((resolve) => {
          try {
            this.vpn.stopVpn((ret) => {
              this.isConnected = false;
              this.isConnecting = false;
              this.connectStartAt = 0;
              this._emit({ connected: false, status: "disconnected", message: ret && ret.message || "已断开" });
              resolve(ret || { success: true });
            });
          } catch (e) {
            this.isConnected = false;
            this.isConnecting = false;
            this.connectStartAt = 0;
            this._emit({ connected: false, status: "disconnected", message: "已断开" });
            resolve({ success: true });
          }
        });
      }
      clearInterval(this.timer);
      this.timer = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.connectStartAt = 0;
      this._emit({ connected: false, status: "disconnected", message: "已断开（模拟）" });
      return { success: true };
    }
    // ——— 模拟模式（仅调界面用） ———
    async _mockConnect() {
      return await new Promise((resolve) => {
        setTimeout(() => {
          this.isConnecting = false;
          this.isConnected = true;
          this.connectStartAt = Date.now();
          this._emit({ connected: true, status: "connected", message: "模拟连接成功" });
          clearInterval(this.timer);
          this.timer = setInterval(() => {
            if (this.isConnected)
              this._emit({ connected: true, status: "connected", message: "模拟运行中" });
          }, 3e3);
          resolve({ success: true, message: "模拟连接成功" });
        }, 1e3);
      });
    }
  }
  const mgr = new AndroidVpnManager();
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
      const nodes = vue.ref([]);
      const selectedIndex = vue.ref(null);
      const page = vue.ref(1);
      const pageSize = vue.ref(20);
      const isLoading = vue.ref(false);
      const isBottom = vue.ref(false);
      let timer = null;
      const availableNodes = vue.computed(
        () => nodes.value.filter((n) => n.status && !isExpired(n))
      );
      const statusClass = vue.computed(() => {
        if (isConnected.value)
          return "connected";
        if (isConnecting.value)
          return "connecting";
        return "disconnected";
      });
      vue.onMounted(async () => {
        checkLogin();
        await mgr.initialize();
        mgr.onStatusUpdate(handleVpnStatus);
        if (isLoggedIn.value)
          refreshNodes();
      });
      vue.onUnmounted(() => {
        mgr.offStatusUpdate();
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      function checkLogin() {
        const t = uni.getStorageSync("token");
        const u = uni.getStorageSync("username");
        if (t && u) {
          token.value = t;
          username.value = u;
          isLoggedIn.value = true;
        }
      }
      async function refreshNodes() {
        if (!isLoggedIn.value) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        if (isLoading.value)
          return;
        isLoading.value = true;
        uni.showLoading({ title: "获取节点中..." });
        try {
          const res = await uni.request({
            url: "http://124.223.21.69/api/nodes",
            method: "GET",
            data: { page: page.value, pageSize: pageSize.value },
            header: { "Authorization": "Bearer " + token.value }
          });
          let arr = [];
          if (Array.isArray(res.data))
            arr = res.data;
          else if (res.data && Array.isArray(res.data.nodes))
            arr = res.data.nodes;
          else if (res.data && Array.isArray(res.data.data))
            arr = res.data.data;
          nodes.value = (arr || []).map((x) => ({ ...x }));
          const idx = nodes.value.findIndex((n) => n.status && !isExpired(n));
          selectedIndex.value = idx !== -1 ? idx : nodes.value.length ? 0 : null;
        } catch (e) {
          uni.showToast({ title: "获取节点失败", icon: "none" });
          formatAppLog("error", "at pages/index/index.vue:182", e);
        } finally {
          isLoading.value = false;
          uni.hideLoading();
        }
      }
      function isExpired(n) {
        if (!n.expire)
          return false;
        return new Date(n.expire).getTime() <= Date.now();
      }
      function hasExpiredDisplay(n) {
        return false;
      }
      function formatExpire(exp) {
        if (!exp)
          return "无过期";
        const d = new Date(exp);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        const delta = d.getTime() - Date.now();
        if (delta > 0) {
          const days = Math.ceil(delta / 864e5);
          if (days <= 30)
            return `${days}天后过期`;
        }
        return `${y}-${m}-${day}`;
      }
      function selectNode(i) {
        const n = nodes.value[i];
        if (!n)
          return;
        if (!n.status || isExpired(n)) {
          uni.showToast({ title: "该节点不可用", icon: "none" });
          return;
        }
        selectedIndex.value = i;
        if (isConnected.value) {
          connectionInfo.value = `${n.tag} · ${n.host}:${n.port}`;
        }
      }
      function handleAuth() {
        if (isLoggedIn.value) {
          uni.showModal({
            title: "确认退出",
            content: "确定要退出登录吗？",
            success: async ({ confirm }) => {
              if (!confirm)
                return;
              if (isConnected.value)
                await disconnectVPN();
              uni.removeStorageSync("token");
              uni.removeStorageSync("username");
              isLoggedIn.value = false;
              token.value = "";
              username.value = "";
              nodes.value = [];
              selectedIndex.value = null;
              uni.showToast({ title: "已退出登录", icon: "success" });
            }
          });
        } else {
          uni.navigateTo({ url: "/pages/login/login" });
        }
      }
      async function toggleVPN() {
        if (isConnecting.value)
          return;
        if (!isLoggedIn.value) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        if (selectedIndex.value === null) {
          uni.showToast({ title: "请选择节点", icon: "none" });
          return;
        }
        if (isConnected.value)
          await disconnectVPN();
        else
          await connectVPN();
      }
      async function connectVPN() {
        const node = nodes.value[selectedIndex.value];
        if (!node)
          return;
        if (!node.status || isExpired(node)) {
          uni.showToast({ title: "该节点不可用", icon: "none" });
          return;
        }
        isConnecting.value = true;
        statusText.value = "连接中...";
        connectButtonText.value = "连接中...";
        try {
          await mgr.connect(node);
        } catch (e) {
          isConnecting.value = false;
          isConnected.value = false;
          statusText.value = "连接失败";
          connectButtonText.value = "连接VPN";
          uni.showToast({ title: e.message || "连接失败", icon: "none" });
        }
      }
      async function disconnectVPN() {
        try {
          await mgr.disconnect();
        } catch (e) {
          uni.showToast({ title: e.message || "断开失败", icon: "none" });
        }
      }
      function handleVpnStatus(s) {
        const connected = !!(s && (s.connected || s.isConnected));
        isConnected.value = connected;
        isConnecting.value = false;
        statusText.value = s && s.message ? s.message : connected ? "已连接" : "未连接";
        connectButtonText.value = connected ? "断开连接" : "连接VPN";
        if (connected && selectedIndex.value !== null) {
          const n = nodes.value[selectedIndex.value];
          connectionInfo.value = `${n.tag} · ${n.host}:${n.port}`;
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          let sec = 0;
          connectionTime.value = "连接时间: 00:00";
          timer = setInterval(() => {
            sec++;
            const mm = String(Math.floor(sec / 60)).padStart(2, "0");
            const ss = String(sec % 60).padStart(2, "0");
            connectionTime.value = `连接时间: ${mm}:${ss}`;
          }, 1e3);
        } else {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          connectionInfo.value = "--";
          connectionTime.value = "--";
        }
        if (s && s.status === "error" && s.message) {
          uni.showToast({ title: s.message, icon: "none" });
        }
      }
      const __returned__ = { isLoggedIn, username, token, isConnected, isConnecting, statusText, connectionInfo, connectionTime, connectButtonText, nodes, selectedIndex, page, pageSize, isLoading, isBottom, get timer() {
        return timer;
      }, set timer(v) {
        timer = v;
      }, availableNodes, statusClass, checkLogin, refreshNodes, isExpired, hasExpiredDisplay, formatExpire, selectNode, handleAuth, toggleVPN, connectVPN, disconnectVPN, handleVpnStatus, ref: vue.ref, computed: vue.computed, onMounted: vue.onMounted, onUnmounted: vue.onUnmounted, get androidVpn() {
        return mgr;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_uni_icons = resolveEasycom(vue.resolveDynamicComponent("uni-icons"), __easycom_0);
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 头部：登录状态 "),
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
      vue.createCommentVNode(" VPN状态卡片 "),
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
          class: vue.normalizeClass(["btn-connect", { connecting: $setup.isConnecting }]),
          onClick: $setup.toggleVPN,
          disabled: !$setup.isLoggedIn || $setup.nodes.length === 0 || $setup.selectedIndex === null
        }, vue.toDisplayString($setup.connectButtonText), 11, ["disabled"])
      ]),
      vue.createCommentVNode(" 节点列表 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "节点列表"),
          vue.createElementVNode("view", {
            class: "section-action",
            onClick: $setup.refreshNodes
          }, [
            vue.createElementVNode("text", { class: "refresh-text" }, "刷新"),
            vue.createVNode(_component_uni_icons, {
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
            vue.renderList($setup.nodes, (n, i) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: n._id,
                class: vue.normalizeClass(["node-item", { "selected": $setup.selectedIndex === i, "offline": !n.status || $setup.isExpired(n), "no-auth": false }]),
                onClick: ($event) => $setup.selectNode(i)
              }, [
                vue.createElementVNode("view", { class: "node-info" }, [
                  vue.createElementVNode("view", { class: "node-details" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "node-name" },
                      vue.toDisplayString(n.tag),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "node-meta" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "node-location" },
                        vue.toDisplayString(n.host) + ":" + vue.toDisplayString(n.port),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "node-expire" },
                        vue.toDisplayString($setup.formatExpire(n.expire)),
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
                        class: vue.normalizeClass(n.status ? "status-online" : "status-offline")
                      },
                      vue.toDisplayString(n.status ? "在线" : "离线"),
                      3
                      /* TEXT, CLASS */
                    ),
                    !$setup.hasExpiredDisplay(n) ? (vue.openBlock(), vue.createElementBlock(
                      "text",
                      {
                        key: 0,
                        class: "status-noauth"
                      },
                      vue.toDisplayString(n.account && n.password ? "需认证" : "免认证"),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true)
                  ]),
                  $setup.selectedIndex === i ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "selected-indicator"
                  }, [
                    vue.createVNode(_component_uni_icons, {
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
      vue.createCommentVNode(" 使用提示 "),
      vue.createElementVNode("view", { class: "section tips-section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "使用提示")
        ]),
        vue.createElementVNode("view", { class: "tips-content" }, [
          vue.createElementVNode("text", { class: "tip-item" }, "• 节点“免认证”说明可直接连接（SOCKS5 无认证）"),
          vue.createElementVNode("text", { class: "tip-item" }, "• 首次连接会弹出 VPN 许可对话框，请允许"),
          vue.createElementVNode("text", { class: "tip-item" }, "• 连接后可切到后台，服务会常驻")
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-1cf27b2a"], ["__file", "D:/uniapp_node/Eaccelerate/pages/index/index.vue"]]);
  const _imports_0 = "/static/icon.ico";
  const _sfc_main$1 = {
    __name: "login",
    setup(__props, { expose: __expose }) {
      __expose();
      const username = vue.ref("test_pan_1234");
      const password = vue.ref("123456");
      const handleLogin = async () => {
        var _a;
        if (!username.value || !password.value) {
          return uni.showToast({
            title: "请输入用户名和密码",
            icon: "none"
          });
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
            if (!token)
              throw new Error("未返回 token");
            uni.setStorageSync("token", token);
            uni.setStorageSync("username", username.value);
            uni.showToast({
              title: "登录成功",
              icon: "success"
            });
            setTimeout(() => {
              uni.reLaunch({
                url: "/pages/index/index"
              });
            }, 500);
          } else {
            throw new Error(((_a = res.data) == null ? void 0 : _a.message) || "登录失败");
          }
        } catch (e) {
          uni.showToast({
            title: e.message || "登录失败",
            icon: "none"
          });
        } finally {
          uni.hideLoading();
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
      ])
    ]);
  }
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-e4e4508d"], ["__file", "D:/uniapp_node/Eaccelerate/pages/login/login.vue"]]);
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
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/uniapp_node/Eaccelerate/App.vue"]]);
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
