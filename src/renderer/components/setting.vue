<template>
  <el-container class="container">
    <el-form class="setting-grid" ref="form" :model="form" label-width="100px">
          <el-form-item class="full-item" label="小说路径">
            <div class="file-path-row">
              <el-input v-model="form.file_path" size="mini" placeholder="请选择小说路径"
                prefix-icon="el-icon-tickets">
                <template slot="prepend">
                  <el-checkbox :border="true" size="mini" id="lm" v-model="form.errCodeChecked"
                    :checked="lmchecked">乱码</el-checkbox>
                </template>
              </el-input>
              <el-button type="primary" size="mini" @click="openTxt">
                <i class="el-icon-folder-opened"></i>
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="当前页数">
            <el-input-number size="mini" controls-position="right" :min="1" :max="999999999"
              v-model="form.curr_page"></el-input-number>
          </el-form-item>

          <el-form-item label="每页数量">
            <el-input-number v-if="form.curr_model == '1'" size="mini" controls-position="right" :min="5"
              v-model="form.page_size"></el-input-number>

            <el-input-number v-else size="mini" controls-position="right" :min="5"
              v-model="form.page_size"></el-input-number>
          </el-form-item>

          <el-form-item label="是否英文">
            <el-switch v-model="form.is_english"></el-switch>
          </el-form-item>

          <el-form-item label="换行符号">
            <el-input class="compact-input" v-model="form.line_break" maxlength="5" size="mini" placeholder="换行符号"
              prefix-icon="el-icon-sugar"></el-input>
          </el-form-item>

          <el-form-item label="字体大小">
            <el-input-number size="mini" controls-position="right" :min="12" :max="100"
              v-model="form.font_size"></el-input-number>
          </el-form-item>

          <el-form-item label="自动翻页(秒)">
            <el-input-number size="mini" controls-position="right" :min="1" :max="60"
              v-model="form.second"></el-input-number>
          </el-form-item>

          <el-form-item label="背景色">
            <el-color-picker v-model="form.bg_color" show-alpha></el-color-picker>
          </el-form-item>

          <el-form-item label="文字颜色">
            <el-color-picker v-model="form.txt_color" show-alpha></el-color-picker>
          </el-form-item>

          <el-form-item label="显示分页">
            <el-switch v-model="is_display_page"></el-switch>
          </el-form-item>
          <el-form-item label="买一金额">
            <el-switch v-model="is_display_buy1_amount"></el-switch>
          </el-form-item>
          <el-form-item label="个股数据">
            <el-switch v-model="is_display_stock_item_data"></el-switch>
          </el-form-item>
          <el-form-item label="颜色模式">
            <el-select v-model="stock_color_mode" size="mini" class="compact-input">
              <el-option label="红涨绿跌" value="red_up_green_down"></el-option>
              <el-option label="红跌绿涨" value="red_down_green_up"></el-option>
              <el-option label="无颜色" value="none"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="当天收益">
            <el-switch v-model="is_display_stock_today_profit"></el-switch>
          </el-form-item>
          <el-form-item label="持有收益">
            <el-switch v-model="is_display_stock_holding_profit"></el-switch>
          </el-form-item>
          <el-form-item label="收益文字">
            <el-switch v-model="is_display_stock_profit_label"></el-switch>
          </el-form-item>
          <el-form-item label="收益分隔">
            <el-input style="width:80px;" v-model="stock_profit_separator" maxlength="10" size="mini"
              placeholder="/"></el-input>
          </el-form-item>
          <el-form-item label="总当天收益">
            <el-switch v-model="is_display_stock_total_today_profit"></el-switch>
          </el-form-item>
          <el-form-item label="总持有收益">
            <el-switch v-model="is_display_stock_total_holding_profit"></el-switch>
          </el-form-item>
          <el-form-item label="摸鱼文字">
            <el-input style="width:130px;" v-model="moyu_text" maxlength="100" size="mini" placeholder="请输入摸鱼文字"
              prefix-icon="el-icon-umbrella"></el-input>
          </el-form-item>
          <el-form-item label="股票代码" class="stock-wide-item">
            <div class="stock-toolbar">
              <el-button type="success" size="mini" icon="el-icon-refresh" @click="refreshStockData" 
                :loading="stockRefreshLoading">
                {{ stockRefreshLoading ? '获取中...' : '获取全A股数据' }}
              </el-button>
              <span class="stock-cache-info" v-if="stockCacheInfo.count > 0">
                已缓存 {{ stockCacheInfo.count }} 条股票数据
                <br>
                更新时间: {{ formatUpdateTime(stockCacheInfo.updateTime) }}
              </span>
            </div>
            <div v-for="(codeObj, index) in stock_code" :key="index" class="stock-code-row">
              <el-input style="width:100px;" v-model="stockDisplay[index]" size="mini" placeholder="代码/名称"
                @blur="updateStockCodeFromInput(index)"></el-input>
              <el-input style="width:80px; margin-left: 6px;" v-model="stock_code[index].cost" size="mini"
                placeholder="成本"></el-input>
              <el-input style="width:80px; margin-left: 6px;" v-model="stock_code[index].shares" size="mini"
                placeholder="股数"></el-input>
              <el-date-picker style="width:130px; margin-left: 6px;" v-model="stock_code[index].buyDate" size="mini"
                type="date" value-format="yyyy-MM-dd" placeholder="买入日期"></el-date-picker>
              <el-button type="danger" size="mini" icon="el-icon-delete" @click="removeStockCode(index)"
                style="margin-left: 6px;"></el-button>
            </div>
            <el-autocomplete v-model="stockSearchQuery" size="mini" :fetch-suggestions="onStockSearch"
              placeholder="输入股票名称或代码" @select="selectStock" class="stock-search">
              <template slot-scope="{ item }">
                <div style="display: flex; justify-content: space-between;">
                  <span>{{ item.name }}</span>
                  <span>{{ item.code }}</span>
                </div>
              </template>
            </el-autocomplete>
            <el-button type="primary" size="mini" icon="el-icon-plus" @click="addStockCode"
              class="stock-add-button">添加股票代码</el-button>
          </el-form-item>

          <div class="bottom-toggle-row full-item">
            <el-form-item label="涨停告警">
              <el-switch v-model="limit_up_alert_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="高级配置">
              <el-switch v-model="show_advanced_config"></el-switch>
            </el-form-item>
          </div>

          <el-form-item label="钉钉Webhook" class="stock-wide-item" v-if="limit_up_alert_enabled">
            <el-input style="width:200px;" v-model="dingtalk_webhook" size="mini" placeholder="钉钉机器人Webhook地址"
              prefix-icon="el-icon-link"></el-input>
          </el-form-item>

          <el-form-item label="@用户手机号" class="stock-wide-item" v-if="limit_up_alert_enabled">
            <div v-for="(phone, index) in at_phone_numbers" :key="index"
              class="phone-row">
              <el-input style="width:130px;" v-model="at_phone_numbers[index]" size="mini" placeholder="手机号"
                maxlength="11"></el-input>
              <el-button type="danger" size="mini" icon="el-icon-delete" @click="removePhoneNumber(index)"
                style="margin-left: 6px;"></el-button>
            </div>
            <el-button type="primary" size="mini" icon="el-icon-plus" @click="addPhoneNumber"
              style="margin-top: 5px;">添加手机号</el-button>
          </el-form-item>

          <div class="advanced-config full-item" v-show="show_advanced_config">
            <div class="hotkey-row">
              <el-form-item label="上一页">
                <el-select v-model="keyPrevious" size="mini" placeholder="请选择">
                  <el-option label="Alt" value="Alt"></el-option>
                  <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
                  <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
                </el-select>
              </el-form-item>
              <span class="hotkey-plus">+</span>
              <el-input class="hotkey-key-input" v-model="keyPreviousX" maxlength="100" size="mini"
                placeholder="请输入按键" prefix-icon="el-icon-grape" @focus="onPreviousFocus"
                @blur="onPreviousBlur"></el-input>
            </div>

            <div class="hotkey-row">
              <el-form-item label="下一页">
                <el-select v-model="keyNext" size="mini" placeholder="请选择">
                  <el-option label="Alt" value="Alt"></el-option>
                  <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
                  <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
                </el-select>
              </el-form-item>
              <span class="hotkey-plus">+</span>
              <el-input class="hotkey-key-input" v-model="keyNextX" maxlength="100" size="mini"
                placeholder="请输入按键" prefix-icon="el-icon-grape" @focus="onNextFocus" @blur="onNextBlur"></el-input>
            </div>

            <div class="hotkey-row">
              <el-form-item label="老板键">
                <el-select v-model="keyBoss" size="mini" placeholder="请选择">
                  <el-option label="Alt" value="Alt"></el-option>
                  <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
                  <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
                </el-select>
              </el-form-item>
              <span class="hotkey-plus">+</span>
              <el-input class="hotkey-key-input" v-model="keyBossX" maxlength="100" size="mini"
                placeholder="请输入按键" prefix-icon="el-icon-grape" @focus="onBossFocus" @blur="onBossBlur"></el-input>
            </div>

            <div class="hotkey-row">
              <el-form-item label="自动翻页">
                <el-select v-model="keyAuto" size="mini" placeholder="请选择">
                  <el-option label="Alt" value="Alt"></el-option>
                  <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
                  <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
                </el-select>
              </el-form-item>
              <span class="hotkey-plus">+</span>
              <el-input class="hotkey-key-input" v-model="keyAutoX" maxlength="100" size="mini"
                placeholder="请输入按键" prefix-icon="el-icon-grape" @focus="onAutoFocus" @blur="onAutoBlur"></el-input>
            </div>
          </div>

    <div class="setting-actions full-item">
      <el-button class="save-button" type="primary" size="mini" @click="onSubmit">保存</el-button>
      <div class="import-export-actions">
        <el-button type="success" size="mini" @click="exportConfig">导出配置</el-button>
        <el-button type="warning" size="mini" @click="importConfig">导入配置</el-button>
      </div>
    </div>
    </el-form>
  </el-container>
</template>

<script>
import db from "../../main/utils/db";
import dialog from "../utils/dialog";
import { ipcRenderer, shell } from "electron";
import hotkeys from "hotkeys-js";

export default {
  name: "setting", data() {
    return {
      form: {
        file_path: "",
        curr_page: 1,
        page_size: 5,
        is_english: false,
        line_break: " ",
        bg_color: "",
        txt_color: "",
        curr_model: "1",
        key_previous: "",
        key_next: "",
        key_boss: "",
        key_auto: "",
        lmchecked: false,
        key_type: 0
      },
      is_display_page: true,
      is_display_buy1_amount: true,
      is_display_stock_item_data: true,
      is_display_stock_today_profit: true,
      is_display_stock_holding_profit: true,
      is_display_stock_profit_label: true,
      stock_profit_separator: "/",
      is_display_stock_total_today_profit: false,
      is_display_stock_total_holding_profit: false,
      stock_color_mode: "red_up_green_down",
      show_advanced_config: false,
      is_display_joke: false,
      is_display_shares: false,
      stock_code: [], // 存储 { code: string, name: string }
      stockDisplay: [], // 用于 v-model，显示名称或代码
      moyu_text: "",
      keyPrevious: "Alt",
      keyPreviousX: "",
      keyNext: "Alt",
      keyNextX: "",
      keyBoss: "Alt",
      keyBossX: "",
      keyAuto: "Alt",
      keyAutoX: "",
      stockSearchQuery: "",
      selectedStock: null,
      selectedStocks: [],
      stockSearchResults: [],
      // 涨停告警相关
      limit_up_alert_enabled: false,
      dingtalk_webhook: "",
      at_phone_numbers: [],
      // 股票数据刷新相关
      stockRefreshLoading: false,
      stockCacheInfo: {
        count: 0,
        updateTime: '',
        isInitialized: false
      },
      savedConfigSnapshot: null
    };
  },
  created() {
    try {
      this.onLoad();
    } catch (error) {
      console.error("setting onLoad failed:", error);
    }
  },
  mounted() {
    try {
      this.onKey();
    } catch (error) {
      console.error("setting onKey failed:", error);
    }
    this.$nextTick(() => {
      setTimeout(() => {
        try {
          this.loadStockCacheInfo();
        } catch (error) {
          console.error("setting loadStockCacheInfo failed:", error);
        }
      }, 0);
    });
  },
  beforeDestroy() {
    hotkeys.unbind("*");
  },
  methods: {
    parseHotkey(value) {
      const key = typeof value === "string" ? value : "";
      const arr = key.split("+");
      if (arr.length >= 2) {
        return {
          mod: arr.slice(0, arr.length - 1).join("+"),
          code: arr[arr.length - 1]
        };
      }
      return {
        mod: "Alt",
        code: ""
      };
    },
    async searchStocksFromMain(query) {
      const q = typeof query === "string" ? query.trim() : "";
      if (!q) {
        return [];
      }
      try {
        const response = await ipcRenderer.invoke("search_stock_codes", q);
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        }
      } catch (error) {
        console.error("search_stock_codes invoke failed:", error);
      }
      return [];
    },
    async updateStockCodeFromInput(index) {
      const inputValue = this.stockDisplay[index] ? this.stockDisplay[index].trim() : "";

      // 确保 stock_code[index] 存在且为对象
      if (!this.stock_code[index] || typeof this.stock_code[index] !== 'object') {
        this.$set(this.stock_code, index, { code: "", name: "", cost: "", shares: "", buyDate: "" });
      }

      if (!inputValue) {
        // 如果输入被清空，也清空对应的 stock_code 条目
        this.stock_code[index].code = "";
        this.stock_code[index].name = "";
        this.stock_code[index].cost = "";
        this.stock_code[index].shares = "";
        this.stock_code[index].buyDate = "";
        return;
      }

      const results = await this.searchStocksFromMain(inputValue);
      this.performStockSearch(index, inputValue, results);
    },

    performStockSearch(index, inputValue, results = []) {
      let matchedStock = null;

      if (results && results.length > 0) {
        // 1. 尝试精确代码匹配
        matchedStock = results.find(s => s.code === inputValue);
        // 2. 如果无精确代码匹配，尝试精确名称匹配
        if (!matchedStock) {
          matchedStock = results.find(s => s.name === inputValue);
        }
        // 3. 如果仍然没有匹配，且搜索结果只有一个，则使用该结果
        if (!matchedStock && results.length === 1) {
          matchedStock = results[0];
        }
      }

      if (matchedStock) {
        this.stock_code[index].code = matchedStock.code;
        this.stock_code[index].name = matchedStock.name;
        this.$set(this.stockDisplay, index, matchedStock.name || matchedStock.code);
      } else {
        // 未找到明确匹配项，将输入视为代码或名称
        this.stock_code[index].code = inputValue;
        
        // 根据输入格式判断是代码还是名称
        if (/^[0-9]{6}$/.test(inputValue) || /^(sh|sz|bj)[0-9]{6}$/i.test(inputValue)) {
          // 是代码格式
          this.stock_code[index].name = "";
        } else {
          // 不是标准代码格式，视为名称
          this.stock_code[index].name = inputValue;
        }
        
        this.$set(this.stockDisplay, index, inputValue);
      }
    },
    addStockCode() {
      this.stock_code.push({ code: "", name: "", cost: "", shares: "", buyDate: "" });
      this.stockDisplay.push("");
    },
    removeStockCode(index) {
      this.stock_code.splice(index, 1);
      this.stockDisplay.splice(index, 1);
    },
    addPhoneNumber() {
      this.at_phone_numbers.push("");
    },
    removePhoneNumber(index) {
      this.at_phone_numbers.splice(index, 1);
    },
    onModel1() {
      if (this.is_display_joke) {
        this.is_display_shares = false;
      }
    },
    onModel2() {
      if (this.is_display_shares) {
        this.is_display_joke = false;
      }
    },
    openUrl() {
      shell.openExternal("https://c.team");
    },
    onPreviousFocus() {
      this.keyPreviousX = "";
      this.key_type = 1;
    },
    onNextFocus() {
      this.keyNextX = "";
      this.key_type = 2;
    },
    onBossFocus() {
      this.keyBossX = "";
      this.key_type = 3;
    },
    onAutoFocus() {
      this.keyAutoX = "";
      this.key_type = 4;
    },
    onPreviousBlur() {
      this.key_type = 0;
    },
    onNextBlur() {
      this.key_type = 0;
    },
    onBossBlur() {
      this.key_type = 0;
    },
    onAutoBlur() {
      this.key_type = 0;
    },
    onKey() {
      var that = this;

      hotkeys.filter = function (event) {
        return true;
      };

      hotkeys("*", function (e) {
        if (
          e.key != "Control" &&
          e.key != "Meta" &&
          e.key != "Alt" &&
          e.key != "Shift" &&
          e.key != "Backspace" &&
          e.key != "CapsLock" &&
          e.key != "Enter" &&
          e.key != "Tab" &&
          e.key != "Escape" &&
          e.key != "Numlock" &&
          e.key != "F5"
        ) {
          var keyx = "";
          if (e.key === "ArrowLeft") {
            keyx = "Left";
          } else if (e.key === "ArrowUp") {
            keyx = "Up";
          } else if (e.key === "ArrowDown") {
            keyx = "Down";
          } else if (e.key === "ArrowRight") {
            keyx = "Right";
          } else if (e.key.trim() === "") {
            keyx = "不能为空格,请删掉重新输入";
          }

          if (that.key_type == 1) {
            if (keyx != "") {
              that.keyPreviousX = keyx;
            }
          } else if (that.key_type == 2) {
            if (keyx != "") {
              that.keyNextX = keyx;
            }
          } else if (that.key_type == 3) {
            if (keyx != "") {
              that.keyBossX = keyx;
            }
          } else if (that.key_type == 4) {
            if (keyx != "") {
              that.keyAutoX = keyx;
            }
          }
        }
      });
    },
    buildStockList() {
      return Array.isArray(this.stock_code)
        ? this.stock_code
          .filter(stock => stock && stock.code && stock.code.trim())
          .map(stock => ({
            code: stock.code.trim(),
            name: stock.name || "",
            cost: stock.cost || "",
            shares: stock.shares || "",
            buyDate: stock.buyDate || ""
          }))
        : [];
    },
    buildConfigData() {
      return {
        current_page: this.form.curr_page,
        page_size: this.form.page_size,
        is_english: this.form.is_english,
        line_break: this.form.line_break,
        current_file_path: this.form.file_path,
        bg_color: this.form.bg_color,
        txt_color: this.form.txt_color,
        font_size: this.form.font_size,
        second: this.form.second,
        key_previous: this.keyPrevious + "+" + this.keyPreviousX,
        key_next: this.keyNext + "+" + this.keyNextX,
        key_boss: this.keyBoss + "+" + this.keyBossX,
        key_auto: this.keyAuto + "+" + this.keyAutoX,
        errCodeChecked: this.form.errCodeChecked,
        is_display_page: this.is_display_page,
        is_display_buy1_amount: this.is_display_buy1_amount,
        is_display_stock_item_data: this.is_display_stock_item_data,
        is_display_stock_today_profit: this.is_display_stock_today_profit,
        is_display_stock_holding_profit: this.is_display_stock_holding_profit,
        is_display_stock_profit_label: this.is_display_stock_profit_label,
        stock_profit_separator: this.stock_profit_separator || "/",
        is_display_stock_total_today_profit: this.is_display_stock_total_today_profit,
        is_display_stock_total_holding_profit: this.is_display_stock_total_holding_profit,
        stock_color_mode: this.stock_color_mode || "red_up_green_down",
        display_shares_list: this.buildStockList(),
        moyu_text: this.moyu_text,
        limit_up_alert_enabled: this.limit_up_alert_enabled,
        dingtalk_webhook: this.dingtalk_webhook,
        at_phone_numbers: this.at_phone_numbers
      };
    },
    cloneConfigSnapshot(configData) {
      return JSON.parse(JSON.stringify(configData));
    },
    hasConfigChanged(keys, nextConfig) {
      const previousConfig = this.savedConfigSnapshot || {};
      return keys.some(key => JSON.stringify(previousConfig[key]) !== JSON.stringify(nextConfig[key]));
    },
    onLoad() {
      this.form.curr_page = db.get("current_page");
      this.form.page_size = db.get("page_size");
      this.form.is_english = db.get("is_english");
      this.form.line_break = db.get("line_break");
      this.form.file_path = db.get("current_file_path");
      this.form.bg_color = db.get("bg_color");
      this.form.txt_color = db.get("txt_color");
      this.form.curr_model = db.get("curr_model");
      this.form.font_size = db.get("font_size");
      this.form.second = db.get("second");

      const previousHotkey = this.parseHotkey(db.get("key_previous"));
      this.keyPrevious = previousHotkey.mod;
      this.keyPreviousX = previousHotkey.code;

      const nextHotkey = this.parseHotkey(db.get("key_next"));
      this.keyNext = nextHotkey.mod;
      this.keyNextX = nextHotkey.code;

      const bossHotkey = this.parseHotkey(db.get("key_boss"));
      this.keyBoss = bossHotkey.mod;
      this.keyBossX = bossHotkey.code;

      const autoHotkey = this.parseHotkey(db.get("key_auto"));
      this.keyAuto = autoHotkey.mod;
      this.keyAutoX = autoHotkey.code;

      this.lmchecked = db.get("errCodeChecked");

      this.is_display_page = db.get("is_display_page");
      this.is_display_buy1_amount = db.get("is_display_buy1_amount") !== false;
      this.is_display_stock_item_data = db.get("is_display_stock_item_data") !== false;
      this.is_display_stock_today_profit = db.get("is_display_stock_today_profit") !== false;
      this.is_display_stock_holding_profit = db.get("is_display_stock_holding_profit") !== false;
      this.is_display_stock_profit_label = db.get("is_display_stock_profit_label") !== false;
      this.stock_profit_separator = db.get("stock_profit_separator") || "/";
      this.is_display_stock_total_today_profit = db.get("is_display_stock_total_today_profit") === true;
      this.is_display_stock_total_holding_profit = db.get("is_display_stock_total_holding_profit") === true;
      this.stock_color_mode = db.get("stock_color_mode") || "red_up_green_down";

      const savedStocks = db.get("display_shares_list") || [];
      this.stock_code = savedStocks.map(stock => ({
        code: stock.code,
        name: stock.name || "", // 确保 name 存在，即使是空字符串
        cost: stock.cost || "",
        shares: stock.shares || "",
        buyDate: stock.buyDate || ""
      })); 
      
      this.stockDisplay = this.stock_code.map(stock => stock.name || stock.code); // 优先显示名称

      this.moyu_text = db.get("moyu_text");

      // 加载涨停告警配置
      this.limit_up_alert_enabled = db.get("limit_up_alert_enabled") || false;
      this.dingtalk_webhook = db.get("dingtalk_webhook") || "";
      this.at_phone_numbers = db.get("at_phone_numbers") || [];
      this.savedConfigSnapshot = this.cloneConfigSnapshot(this.buildConfigData());
    },
    openTxt() {
      var that = this;
      dialog.showOpenFile(function (e) {
        that.form.file_path = e[0];
      });
    },
    async onSubmit() {
      const configData = this.buildConfigData();
      const shortcutChanged = this.hasConfigChanged(
        ["key_previous", "key_next", "key_boss", "key_auto"],
        configData
      );
      const stockMonitorChanged = this.hasConfigChanged(
        ["display_shares_list", "limit_up_alert_enabled", "dingtalk_webhook", "at_phone_numbers"],
        configData
      );
      const styleChanged = this.hasConfigChanged(
        ["bg_color", "txt_color", "font_size"],
        configData
      );
      const displayChanged = this.hasConfigChanged(
        [
          "current_page",
          "page_size",
          "is_english",
          "line_break",
          "current_file_path",
          "is_display_page",
          "is_display_buy1_amount",
          "is_display_stock_item_data",
          "is_display_stock_today_profit",
          "is_display_stock_holding_profit",
          "is_display_stock_profit_label",
          "stock_profit_separator",
          "is_display_stock_total_today_profit",
          "is_display_stock_total_holding_profit",
          "stock_color_mode",
          "display_shares_list",
          "moyu_text"
        ],
        configData
      );

      let saveResponse;
      try {
        saveResponse = await ipcRenderer.invoke("save_config", configData);
      } catch (error) {
        this.$message({
          message: error && error.message ? error.message : "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
          type: "error",
          showClose: true
        });
        return;
      }

      if (!saveResponse || !saveResponse.success) {
        this.$message({
          message: saveResponse && saveResponse.message ? saveResponse.message : "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
          type: "error",
          showClose: true
        });
        return;
      }

      this.savedConfigSnapshot = this.cloneConfigSnapshot(configData);

      if (shortcutChanged) {
        ipcRenderer.send("reload_shortcuts_and_tray");
      }

      if (stockMonitorChanged) {
        ipcRenderer.send("update_stock_monitor", configData.limit_up_alert_enabled);
      }

      if (styleChanged) {
        ipcRenderer.send("bg_text_color", "ping");
      }

      if (displayChanged) {
        ipcRenderer.send("refresh_current_display");
      }

      this.$message({
        message: "\u4fdd\u5b58\u6210\u529f",
        type: "success",
        showClose: true
      });
    },
    async onStockSearch(queryString, cb) {
      try {
        if (!queryString || !queryString.trim()) {
          cb([]);
          return;
        }
        
        const results = await this.searchStocksFromMain(queryString.trim());
        
        // 格式化结果以适应el-autocomplete的显示要求
        const formattedResults = results.map(stock => ({
          value: stock.name && stock.name.trim() ? `${stock.name} (${stock.code})` : stock.code,
          name: stock.name || stock.code,
          code: stock.code
        }));
        
        cb(formattedResults);
      } catch (error) {
        console.error('股票搜索出错:', error);
        cb([]);
      }
    },

    selectStock(stock) { // stock is { value: "...", name: "...", code: "..." }
      // 检查股票代码是否已存在
      const existingStockIndex = this.stock_code.findIndex(s => s.code === stock.code);

      if (existingStockIndex === -1) {
        // 不存在则添加到列表末尾
        this.stock_code.push({ code: stock.code, name: stock.name, cost: "", shares: "", buyDate: "" });
        this.stockDisplay.push(stock.name || stock.code);
      } else {
        // 如果已存在，更新其名称，并更新显示
        this.stock_code[existingStockIndex].name = stock.name;
        this.$set(this.stockDisplay, existingStockIndex, stock.name || stock.code);
        this.$message({
          message: `股票 ${stock.code} 已在列表中，信息已更新。`,
          type: "info",
          showClose: true
        });
      }
      this.stockSearchQuery = ""; // 清空搜索框
    },

    onStockSelect(stocks) {
    },

    // 导出配置
    exportConfig() {
      const remote = require('@electron/remote');
      const { dialog } = remote;
      
      dialog.showSaveDialog({
        title: '导出配置',
        defaultPath: 'thief_config.json',
        filters: [
          { name: '配置文件', extensions: ['json'] }
        ]
      }).then(result => {
        if (!result.canceled && result.filePath) {
          // 发送IPC消息给主进程
          ipcRenderer.send('export-config', result.filePath);
          
          // 监听结果
          ipcRenderer.once('export-config-result', (event, response) => {
            if (response.success) {
              this.$message.success(response.message);
            } else {
              this.$message.error(response.message);
            }
          });
        }
      }).catch(err => {
        this.$message.error(`导出失败: ${err.message}`);
      });
    },
    
    // 导入配置
    importConfig() {
      const remote = require('@electron/remote');
      const { dialog } = remote;
      
      dialog.showOpenDialog({
        title: '导入配置',
        filters: [
          { name: '配置文件', extensions: ['json'] }
        ],
        properties: ['openFile']
      }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
          // 确认导入
          this.$confirm('导入配置将覆盖当前所有设置，是否继续？', '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            // 发送IPC消息给主进程
            ipcRenderer.send('import-config', result.filePaths[0]);
            
            // 监听结果
            ipcRenderer.once('import-config-result', (event, response) => {
              if (response.success) {
                this.$message.success(response.message);
                // 重新加载配置
                this.onLoad();
              } else {
                this.$message.error(response.message);
              }
            });
          }).catch(() => {
            this.$message.info('已取消导入');
          });
        }
      }).catch(err => {
        this.$message.error(`导入失败: ${err.message}`);
      });
    },

    // 检查配置是否正确保存
    checkConfigSaved() {
      // 直接从本地读取配置文件
      try {
        const fs = require('fs-extra');
        const path = require('path');
        const remote = require('@electron/remote');
        const app = remote.app;
        const userData = app.getPath('userData');
        const configPath = path.join(userData, '/thief_data.json');
        
        console.log('配置文件路径:', configPath);
        
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const configObj = JSON.parse(configContent);
          
          console.log('配置文件中的股票代码:', JSON.stringify(configObj.display_shares_list || []));
          console.log('当前界面中的股票代码:', JSON.stringify(this.stock_code));
          
          // 检查是否一致
          const fileStocks = JSON.stringify(configObj.display_shares_list || []);
          const currentStocks = JSON.stringify(this.stock_code);
          
          if (fileStocks !== currentStocks) {
            console.error('配置保存不一致！文件中的配置与当前不匹配');
            return false;
          }
          
          return true;
        } else {
          console.error('配置文件不存在:', configPath);
          return false;
        }
      } catch (err) {
        console.error('检查配置保存状态失败:', err);
        return false;
      }
    },

    // 加载股票缓存信息
    loadStockCacheInfo() {
      ipcRenderer.send('get_stock_cache_info');
      
      ipcRenderer.once('get_stock_cache_info_result', (event, response) => {
        if (response.success) {
          this.stockCacheInfo = response.data;
        } else {
          console.error('获取股票缓存信息失败:', response.message);
        }
      });
    },

    // 刷新股票数据
    refreshStockData() {
      this.stockRefreshLoading = true;
      
      ipcRenderer.send('refresh_stock_data');
      
      ipcRenderer.once('refresh_stock_data_result', (event, response) => {
        this.stockRefreshLoading = false;
        
        if (response.success) {
          this.$message({
            message: response.message,
            type: 'success',
            showClose: true
          });
          
          // 刷新缓存信息
          this.loadStockCacheInfo();
        } else {
          this.$message({
            message: response.message,
            type: 'error',
            showClose: true
          });
        }
      });
    },

    // 格式化更新时间
    formatUpdateTime(timeStr) {
      if (!timeStr || timeStr === '未知') {
        return '未知';
      }
      
      try {
        const date = new Date(timeStr);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return '未知';
      }
    },
  }
};
</script>

<style scoped lang="scss">
.container {
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  padding: 26px 28px 32px;
  box-sizing: border-box;
  display: block;
  overflow-y: auto;
  overflow-x: hidden;

  .setting-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 44px;
    align-items: start;
    width: 100%;
  }

  .setting-grid > .el-form-item {
    min-width: 0;
    margin-bottom: 22px;
  }

  .setting-grid > .full-item,
  .setting-grid > .stock-wide-item,
  .setting-grid > .advanced-config,
  .setting-grid > .bottom-toggle-row,
  .setting-actions {
    grid-column: 1 / -1;
  }

  .file-path-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .file-path-row .el-input {
    flex: 1;
    min-width: 0;
  }

  .compact-input {
    width: 160px;
  }

  .bottom-toggle-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 44px;
    align-items: start;
    margin-bottom: 22px;
  }

  .bottom-toggle-row .el-form-item {
    margin-bottom: 0;
  }

  .hotkey-row {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 18px minmax(160px, 1fr);
    align-items: start;
    column-gap: 12px;
    margin-bottom: 22px;
  }

  .hotkey-row:last-child {
    margin-bottom: 22px;
  }

  .hotkey-row .el-form-item {
    margin-bottom: 0;
  }

  .hotkey-row .el-select,
  .hotkey-key-input {
    width: 100%;
  }

  .hotkey-plus {
    line-height: 32px;
    text-align: center;
    font-weight: bold;
  }

  .hotkey-row ::v-deep .el-form-item__content,
  .hotkey-row ::v-deep .el-input__inner,
  .hotkey-row ::v-deep .el-input__icon {
    height: 32px;
    line-height: 32px;
  }

  .setting-actions {
    grid-column: 1 / -1;
    padding-top: 16px;
  }

  .save-button {
    width: 100%;
  }

  .import-export-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 12px;
  }

  .import-export-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .stock-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 10px;
    margin-bottom: 10px;
  }

  .stock-cache-info {
    color: #999999;
    font-size: 12px;
    line-height: 1.6;
  }

  .stock-code-row,
  .phone-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .stock-code-row .el-input:first-child {
    width: 130px !important;
  }

  .stock-code-row .el-input:nth-child(2),
  .stock-code-row .el-input:nth-child(3) {
    width: 92px !important;
  }

  .stock-code-row .el-date-editor {
    width: 150px !important;
  }

  .stock-code-row .el-button,
  .phone-row .el-button {
    margin-left: 0 !important;
  }

  .stock-code-row .el-button {
    width: 36px;
    padding-left: 0;
    padding-right: 0;
  }

  .stock-search {
    width: 260px !important;
    margin-top: 5px;
  }

  .stock-add-button {
    margin-top: 5px;
  }
}

.el-input-number--mini {
  width: 111px;
  line-height: 26px;
}

.el-checkbox__input {
  cursor: pointer;
  outline: 0;
  line-height: 1;
  vertical-align: middle;
  margin-right: -7px;
}

#lm {
  margin-left: -17px;
  margin-right: -17px;

  .el-checkbox__label {
    display: inline-block;
    padding-left: 10px;
    line-height: 19px;
    font-size: 12px;
  }
}

.el-checkbox.is-bordered.el-checkbox--mini {
  height: 26px;
  border: 0px;
}

.el-checkbox.is-bordered.is-checked {
  border: 0px;
}

.el-form-item__content {
  margin-left: 0px;
}
</style>
