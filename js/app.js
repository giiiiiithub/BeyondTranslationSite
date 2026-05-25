(function () {
  // ── 配置 ──────────────────────────────────────
  var API_BASE = "https://beyond-nslation-umvdiweytv.cn-hangzhou.fcapp.run";
  var ADMIN_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 和 FC 环境变量 ADMIN_TOKEN 一致
  var PAYMENT_MODE = "manual"; // "manual"=微信二维码, "auto"=FC后端自动发码

  // ── 套餐定义 ──────────────────────────────────
  // 按 token 量计费。free 为每日免费配额，paid 为一次性购买的 token 包。
  // 实际购买后由管理员手动生成激活码，通过微信发送给用户。
  var PLANS = [
    {
      type: "free", name: "免费版", desc: "每日 1000 Token",
      price: "0",
      features: [
        { icon: "&#x1F50D;", text: "手动分析", check: true, tip: "选中英文 → 右键分析" },
        { icon: "&#x1F4AC;", text: "持续追问", check: true, tip: "针对分析结果继续提问" },
        { icon: "&#x26A1;", text: "网页自动标注", check: "limited", hint: "每日 1000 Token", tip: "Token 耗尽后第二天恢复" }
      ],
      paid: false
    },
    {
      type: "token-1m", name: "基础包", desc: "1M Token",
      price: "5", unit: "1M Token",
      tokenQuota: 1000000,
      features: [
        { icon: "&#x1F50D;", text: "手动分析", check: true, tip: "右键分析，按 token 消耗" },
        { icon: "&#x1F4AC;", text: "持续追问", check: true, tip: "随时追问，深度学习" },
        { icon: "&#x26A1;", text: "网页自动标注", check: true, tip: "浏览英文网站自动标注" },
        { icon: "&#x1F4B0;", text: "不限时间", check: true, tip: "Token 用完为止，无有效期" }
      ],
      paid: true
    },
    {
      type: "token-5m", name: "畅享包", desc: "5M Token · 省 20%",
      price: "20", unit: "5M Token",
      tokenQuota: 5000000,
      features: [
        { icon: "&#x1F50D;", text: "手动分析", check: true, tip: "右键分析，按 token 消耗" },
        { icon: "&#x1F4AC;", text: "持续追问", check: true, tip: "随时追问，深度学习" },
        { icon: "&#x26A1;", text: "网页自动标注", check: true, tip: "浏览英文网站自动标注" },
        { icon: "&#x1F4B0;", text: "不限时间", check: true, tip: "Token 用完为止，无有效期" }
      ],
      paid: true
    },
    {
      type: "token-100m", name: "专业包", desc: "100M Token · 省 40%",
      price: "300", unit: "100M Token",
      tokenQuota: 100000000,
      features: [
        { icon: "&#x1F50D;", text: "手动分析", check: true, tip: "右键分析，按 token 消耗" },
        { icon: "&#x1F4AC;", text: "持续追问", check: true, tip: "随时追问，深度学习" },
        { icon: "&#x26A1;", text: "网页自动标注", check: true, tip: "浏览英文网站自动标注" },
        { icon: "&#x1F4B0;", text: "不限时间", check: true, tip: "Token 用完为止，无有效期" }
      ],
      paid: true
    }
  ];

  // ── DOM 引用 ──────────────────────────────────
  var pricingGrid = document.getElementById("pricingGrid");
  var purchaseSection = document.getElementById("purchaseSection");
  var purchasePanel = document.getElementById("purchasePanel");
  var toastEl = null;
  var pollTimer = 0;

  // ── 工具 ──────────────────────────────────────
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  function scrollTo(el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function api(path, method, bodyObj) {
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (bodyObj) opts.body = JSON.stringify(bodyObj);
    var resp = await fetch(API_BASE + path, opts);
    var data = await resp.json();
    // FC 统一响应格式 { code, data }
    if (data.code !== "000200") throw new Error(data.msg || ("请求失败：" + data.code));
    return data.data;
  }

  // ── 渲染定价卡片 ──────────────────────────────
  function renderPricing() {
    var html = "";
    for (var i = 0; i < PLANS.length; i++) {
      var plan = PLANS[i];
      var priceHTML = plan.paid
        ? '<span class="plan-price">&yen;' + plan.price + '<span>/' + plan.unit + '</span></span>'
        : '<span class="plan-price">免费</span>';
      var featureLines = "";
      for (var f = 0; f < plan.features.length; f++) {
        var feat = plan.features[f];
        var mark;
        if (feat.check === "limited") {
          mark = '<span class="feat-limited">' + (feat.hint || "有限") + '</span>';
        } else if (feat.check) {
          mark = '<span class="feat-yes">&#10003;</span>';
        } else {
          mark = '<span class="feat-no">&#10007;</span>';
        }
        var tipAttr = feat.tip ? ' data-tip="' + feat.tip + '"' : '';
        featureLines +=
          '<div class="feat-row"' + tipAttr + '>' + feat.text + mark + '</div>';
      }
      html +=
        '<div class="pricing-card" data-plan="' + plan.type + '">' +
        '<div class="plan-name">' + plan.name + '</div>' +
        '<div class="plan-desc">' + plan.desc + '</div>' +
        priceHTML +
        '<div class="feat-list">' + featureLines + '</div>' +
        '<button class="plan-btn">' + (plan.paid ? '立即购买' : '免费使用') + '</button>' +
        '</div>';
    }
    pricingGrid.innerHTML = html;

    var cards = pricingGrid.querySelectorAll(".pricing-card");
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener("click", function () {
        var type = this.dataset.plan;
        if (type === "free") {
          showToast("免费版无需购买，安装扩展后直接使用");
          return;
        }
        var plan = null;
        for (var j = 0; j < PLANS.length; j++) {
          if (PLANS[j].type === type) { plan = PLANS[j]; break; }
        }
        if (!plan) return;
        var allCards = pricingGrid.querySelectorAll(".pricing-card");
        for (var c = 0; c < allCards.length; c++) {
          allCards[c].classList.toggle("selected", allCards[c].dataset.plan === type);
        }
        showPurchasePanel(plan);
      });
    }
  }

  // ── 购买面板 ──────────────────────────────────
  function showPurchasePanel(plan) {
    purchasePanel.innerHTML =
      '<h3>确认购买</h3>' +
      '<div class="order-summary">' +
      '<div class="row"><span>套餐</span><span>' + plan.name + '</span></div>' +
      '<div class="row"><span>Token</span><span>' + (plan.tokenQuota / 1000000) + 'M</span></div>' +
      '<div class="row total"><span>应付</span><span>&yen;' + plan.price + '.00</span></div>' +
      '</div>' +
      '<button class="btn btn-primary" id="btnConfirm">确认支付</button>';

    purchaseSection.classList.remove("hidden");
    scrollTo(purchaseSection);

    document.getElementById("btnConfirm").addEventListener("click", function () {
      createOrder(plan);
    });
  }

  // ── 调用后端创建订单 ──────────────────────────
  async function createOrder(plan) {
    // 手动模式：直接展示微信二维码
    if (PAYMENT_MODE === "manual") {
      showManualPayment(plan);
      return;
    }

    // 自动模式：调后端 API
    purchasePanel.innerHTML =
      '<div style="text-align:center;padding:40px">' +
      '<div class="spinner"></div><p style="color:#666;margin-top:12px">正在创建订单...</p>' +
      '</div>';

    try {
      var tokenAmount = plan.tokenQuota / 1000000;
      var result = await api("/api/create-order", "POST", { plan_type: "token", token_amount: tokenAmount });
      showQRCode(plan, result);
    } catch (err) {
      purchasePanel.innerHTML =
        '<h3>创建订单失败</h3>' +
        '<p style="color:#d63031;margin:16px 0">' + (err.message || "未知错误") + '</p>' +
        '<button class="btn btn-secondary" id="btnRetry">重试</button>';
      document.getElementById("btnRetry").addEventListener("click", function () { showPurchasePanel(plan); });
    }
  }

  // ── 手动支付（微信二维码） ─────────────────────
  function showManualPayment(plan) {
    purchasePanel.innerHTML =
      '<h3>' + plan.name + ' · &yen;' + plan.price + '</h3>' +
      '<div class="order-summary" style="text-align:left;margin-top:12px">' +
      '<div class="row"><span>Token</span><span>' + (plan.tokenQuota / 1000000) + 'M</span></div>' +
      '<div class="row total"><span>价格</span><span>&yen;' + plan.price + '.00</span></div>' +
      '</div>' +
      '<div class="qrcode-wrapper">' +
      '<img src="assets/wechat-qr.png" alt="微信扫码" style="width:180px;height:180px;border:1px solid #eee;border-radius:8px">' +
      '<p class="qrcode-hint">扫码加微信，备注套餐名称</p>' +
      '</div>' +
      '<p style="font-size:13px;color:#555">加微信后发送 <strong>' + plan.name + '</strong> 并转账 <strong>&yen;' + plan.price + '</strong></p>' +
      '<p style="background:#fff3cd;color:#856404;padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;margin-top:6px">激活码将通过微信发送给您</p>' +
      '<p style="font-size:11px;color:#bbb;margin-top:8px">联系邮箱：doooooodle@163.com</p>';
  }

  // ── 展示二维码 + 轮询支付状态 ──────────────────
  function showQRCode(plan, result) {
    var orderId = result.order_id;
    var codeUrl = result.code_url;
    var amount = (result.amount / 100).toFixed(0);

    var qrSrc = codeUrl;

    purchasePanel.innerHTML =
      '<h3>微信扫码支付</h3>' +
      '<div class="order-summary">' +
      '<div class="row"><span>套餐</span><span>' + plan.name + '</span></div>' +
      '<div class="row"><span>金额</span><span>&yen;' + amount + '.00</span></div>' +
      '<div class="row"><span>订单号</span><span style="font-size:12px">' + orderId + '</span></div>' +
      '</div>' +
      '<div class="qrcode-wrapper">' +
      '<img src="' + qrSrc + '" alt="支付二维码" style="width:240px;height:240px;border:1px solid #eee;border-radius:8px">' +
      '<p class="qrcode-hint">请用微信扫一扫付款</p>' +
      '<p class="countdown" id="statusText">等待支付中...</p>' +
      '</div>' +
      '<button class="btn btn-secondary" id="btnMockPay">模拟支付（测试用）</button>' +
      '<button class="btn btn-secondary" id="btnCancel" style="margin-left:8px">取消</button>';

    document.getElementById("btnMockPay").addEventListener("click", function () {
      mockPay(orderId);
    });

    document.getElementById("btnCancel").addEventListener("click", function () {
      clearInterval(pollTimer);
      purchaseSection.classList.add("hidden");
    });

    startPolling(orderId, plan);
  }

  // ── 轮询 ──────────────────────────────────────
  function startPolling(orderId, plan) {
    var attempts = 0;
    var maxAttempts = 300; // 15 分钟

    pollTimer = setInterval(async function () {
      attempts++;
      try {
        var data = await api("/api/order-status/" + orderId, "GET");
        var statusEl = document.getElementById("statusText");
        if (statusEl) {
          statusEl.textContent = "等待支付中...（已轮询 " + attempts + " 次）";
        }
        if (data.status === "paid" && data.activation_code) {
          clearInterval(pollTimer);
          showActivationResult(plan, data.activation_code);
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          if (statusEl) statusEl.textContent = "支付超时，请重新下单";
        }
      } catch (err) {
        console.warn("poll error:", err.message);
      }
    }, 3000);
  }

  // ── Mock 支付 ─────────────────────────────────
  async function mockPay(orderId) {
    var el = document.getElementById("statusText");
    if (el) el.textContent = "正在模拟支付...";
    try {
      await api("/api/mock-payment", "POST", {
        order_id: orderId,
        admin_token: ADMIN_TOKEN
      });
      if (el) el.textContent = "模拟支付成功！";
    } catch (err) {
      if (el) el.textContent = "模拟支付失败：" + (err.message || "");
    }
  }

  // ── 展示激活码 ───────────────────────────────
  function showActivationResult(plan, code) {
    purchasePanel.innerHTML =
      '<h3>支付成功</h3>' +
      '<div class="activation-result">' +
      '<p style="color:#666;font-size:14px;margin-bottom:8px">您的激活码：</p>' +
      '<div class="activation-code">' + code + '</div>' +
      '<p style="color:#666;font-size:13px;margin-top:4px">' + plan.name + ' · ' + (plan.tokenQuota / 1000000) + 'M Token</p>' +
      '</div>' +
      '<button class="btn btn-primary btn-copy" id="btnCopy">复制激活码</button>' +
      '<p style="font-size:11px;color:#999;margin-top:6px">请妥善保存激活码，如需找回请联系 doooooodle@163.com</p>' +
      '<div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;text-align:left">' +
      '<p style="font-size:14px;font-weight:600;margin-bottom:10px">如何使用激活码</p>' +
      '<div style="font-size:12px;color:#555;line-height:1.8">' +
        '<div style="margin-bottom:6px">1️⃣ 复制上方激活码</div>' +
        '<div style="margin-bottom:6px">2️⃣ 浏览器右上角点击 BeyondTranslation 图标 → 打开侧边栏</div>' +
        '<div style="margin-bottom:6px">3️⃣ 侧边栏顶部输入激活码 → 确认</div>' +
      '</div>' +
      '</div>';

    purchaseSection.classList.remove("hidden");
    scrollTo(purchaseSection);

    document.getElementById("btnCopy").addEventListener("click", function () {
      navigator.clipboard.writeText(code).then(function () {
        showToast("激活码已复制到剪贴板");
      }, function () {
        showToast("复制失败，请手动选择激活码后 Ctrl+C");
      });
    });
  }

  // ── 启动 ──────────────────────────────────────
  renderPricing();
})();
