<template>
  <el-container class="container">
    <div style="width:500px;">
      <el-form style="width:500px;" ref="form" :model="form" label-width="100px">
        <el-form-item label="小说路径">
          <el-input
            style="width:80.5%;margin-top: 7px;"
            v-model="form.file_path"
            size="mini"
            placeholder="请选择小说路径"
            prefix-icon="el-icon-tickets"
          >
            <template slot="prepend">
              <el-checkbox
                :border="true"
                size="mini"
                id="lm"
                v-model="form.errCodeChecked"
                :checked="lmchecked"
              >乱码</el-checkbox>
            </template>
          </el-input>
          <el-button type="primary" size="mini" @click="openTxt">
            <i class="el-icon-folder-opened"></i>
          </el-button>
        </el-form-item>

        <el-col :span="12">
          <el-form-item label="当前页数">
            <el-input-number
              size="mini"
              controls-position="right"
              :min="1"
              :max="999999999"
              v-model="form.curr_page"
            ></el-input-number>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="每页数量">
            <el-input-number
              v-if="form.curr_model=='1'"
              size="mini"
              controls-position="right"
              :min="5"
              v-model="form.page_size"
            ></el-input-number>

            <el-input-number
              v-else
              size="mini"
              controls-position="right"
              :min="5"
              v-model="form.page_size"
            ></el-input-number>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="是否英文">
            <el-switch v-model="form.is_english"></el-switch>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="换行符号">
            <el-input
              style="width:111px;"
              v-model="form.line_break"
              maxlength="5"
              size="mini"
              placeholder="换行符号"
              prefix-icon="el-icon-sugar"
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="字体大小">
            <el-input-number
              size="mini"
              controls-position="right"
              :min="12"
              :max="100"
              v-model="form.font_size"
            ></el-input-number>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="自动翻页(秒)">
            <el-input-number
              size="mini"
              controls-position="right"
              :min="1"
              :max="60"
              v-model="form.second"
            ></el-input-number>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="背景色">
            <el-color-picker v-model="form.bg_color" show-alpha></el-color-picker>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="文字颜色">
            <el-color-picker v-model="form.txt_color" show-alpha></el-color-picker>
          </el-form-item>
        </el-col>

        <el-col :span="11">
          <el-form-item label="上一页">
            <el-select style="width:138px;" v-model="keyPrevious" size="mini" placeholder="请选择">
              <el-option label="Alt" value="Alt"></el-option>
              <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
              <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col style="text-align: center;margin-top: 10px; margin-left: 10px;" :span="2">
          <span>+</span>
        </el-col>

        <el-col :span="10">
          <el-form-item>
            <el-input
              style="width:179px;margin-left: -100px;"
              v-model="keyPreviousX"
              maxlength="100"
              size="mini"
              placeholder="请输入按键"
              prefix-icon="el-icon-grape"
              @focus="onPreviousFocus"
              @blur="onPreviousBlur"
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="11">
          <el-form-item label="下一页">
            <el-select style="width:138px;" v-model="keyNext" size="mini" placeholder="请选择">
              <el-option label="Alt" value="Alt"></el-option>
              <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
              <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col style="text-align: center;margin-top: 10px; margin-left: 10px;" :span="2">
          <span>+</span>
        </el-col>

        <el-col :span="10">
          <el-form-item>
            <el-input
              style="width:179px;margin-left: -100px;"
              v-model="keyNextX"
              maxlength="100"
              size="mini"
              placeholder="请输入按键"
              prefix-icon="el-icon-grape"
              @focus="onNextFocus"
              @blur="onNextBlur"
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="11">
          <el-form-item label="老板键">
            <el-select style="width:138px;" v-model="keyBoss" size="mini" placeholder="请选择">
              <el-option label="Alt" value="Alt"></el-option>
              <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
              <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col style="text-align: center;margin-top: 10px; margin-left: 10px;" :span="2">
          <span>+</span>
        </el-col>

        <el-col :span="10">
          <el-form-item>
            <el-input
              style="width:179px;margin-left: -100px;"
              v-model="keyBossX"
              maxlength="100"
              size="mini"
              placeholder="请输入按键"
              prefix-icon="el-icon-grape"
              @focus="onBossFocus"
              @blur="onBossBlur"
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="11">
          <el-form-item label="自动翻页">
            <el-select style="width:138px;" v-model="keyAuto" size="mini" placeholder="请选择">
              <el-option label="Alt" value="Alt"></el-option>
              <el-option label="CmdOrCtrl" value="CmdOrCtrl"></el-option>
              <el-option label="CmdOrCtrl+Alt" value="CmdOrCtrl+Alt"></el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col style="text-align: center;margin-top: 10px; margin-left: 10px;" :span="2">
          <span>+</span>
        </el-col>

        <el-col :span="10">
          <el-form-item>
            <el-input
              style="width:179px;margin-left: -100px;"
              v-model="keyAutoX"
              maxlength="100"
              size="mini"
              placeholder="请输入按键"
              prefix-icon="el-icon-grape"
              @focus="onAutoFocus"
              @blur="onAutoBlur"
            ></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="24" style="text-align: center;">
          <el-button style="width: 91%;" type="primary" size="mini" @click="onSubmit">保存</el-button>
        </el-col>
      </el-form>
    </div>

    <div class="rightx">
      <div class="toolx">
        <el-form style="width:182px;" label-width="70px">
          <el-form-item label="显示分页">
            <el-switch v-model="is_display_page"></el-switch>
          </el-form-item>
          <el-form-item label="股票代码">
            <el-input
              style="width:111px;"
              v-model="stock_code"
              size="mini"
              placeholder="请输入股票代码"
              prefix-icon="el-icon-sugar"
            ></el-input>
          </el-form-item>
          <el-form-item label="摸鱼文字">
            <el-input
              style="width:111px;"
              v-model="moyu_text"
              maxlength="100"
              size="mini"
              placeholder="请输入摸鱼文字"
              prefix-icon="el-icon-umbrella"
            ></el-input>
          </el-form-item>
          <!-- <el-form-item label="股票模式">
            <el-switch v-model="is_display_shares" @change="onModel2"></el-switch>
          </el-form-item>-->
          <span class="nbx">此处未来有更牛逼的功能</span>
        </el-form>
      </div>
      <hr />
      <p class="sizex">查看官网，找我微信</p>
      <p class="sizex">扫码进群</p>
      <p class="sizex">探讨摸鱼人生</p>
      <p class="cteamx" @click="openUrl">C.TEAM 出品</p>
    </div>
  </el-container>
</template>

<script>
import db from "../../main/utils/db";
import dialog from "../utils/dialog";
import { ipcRenderer, shell } from "electron";
import hotkeys from "hotkeys-js";

export default {
  name: "setting",
  data() {
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
      is_display_joke: false,
      is_display_shares: false,
      stock_code: "",
      moyu_text: "",
      keyPrevious: "CmdOrCtrl+Alt",
      keyPreviousX: "",
      keyNext: "CmdOrCtrl+Alt",
      keyNextX: "",
      keyBoss: "CmdOrCtrl+Alt",
      keyBossX: "",
      keyAuto: "CmdOrCtrl+Alt",
      keyAutoX: ""
    };
  },
  created() {
    this.onLoad();
    this.onKey();
  },
  methods: {
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

      hotkeys.filter = function(event) {
        return true;
      };

      hotkeys("*", function(e) {
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
          }else if (e.key.trim() === "") {
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

      var key_previous = db.get("key_previous");
      var arr = key_previous.split("+");
      if (arr.length === 2) {
        this.keyPrevious = arr[0];
        this.keyPreviousX = arr[1];
      } else if (arr.length === 3) {
        this.keyPrevious = arr[0] + "+" + arr[1];
        this.keyPreviousX = arr[2];
      }

      var key_next = db.get("key_next");
      var arr = key_next.split("+");
      if (arr.length === 2) {
        this.keyNext = arr[0];
        this.keyNextX = arr[1];
      } else if (arr.length === 3) {
        this.keyNext = arr[0] + "+" + arr[1];
        this.keyNextX = arr[2];
      }

      var key_boss = db.get("key_boss");
      var arr = key_boss.split("+");
      if (arr.length === 2) {
        this.keyBoss = arr[0];
        this.keyBossX = arr[1];
      } else if (arr.length === 3) {
        this.keyBoss = arr[0] + "+" + arr[1];
        this.keyBossX = arr[2];
      }

      var key_auto = db.get("key_auto");
      var arr = key_auto.split("+");
      if (arr.length === 2) {
        this.keyAuto = arr[0];
        this.keyAutoX = arr[1];
      } else if (arr.length === 3) {
        this.keyAuto = arr[0] + "+" + arr[1];
        this.keyAutoX = arr[2];
      }

      this.lmchecked = db.get("errCodeChecked");

      this.is_display_page = db.get("is_display_page");

      this.stock_code = db.get("display_shares_list");

      this.moyu_text = db.get("moyu_text");
      // this.is_display_joke = db.get("is_display_joke");
      // this.is_display_shares = db.get("is_display_shares");
    },
    openTxt() {
      var that = this;
      dialog.showOpenFile(function(e) {
        that.form.file_path = e[0];
      });
    },
    onSubmit() {
      db.set("current_page", this.form.curr_page);
      db.set("page_size", this.form.page_size);
      db.set("is_english", this.form.is_english);
      db.set("line_break", this.form.line_break);
      db.set("current_file_path", this.form.file_path);
      db.set("bg_color", this.form.bg_color);
      db.set("txt_color", this.form.txt_color);
      db.set("font_size", this.form.font_size);
      db.set("second", this.form.second);

      var key_previous = this.keyPrevious + "+" + this.keyPreviousX;
      db.set("key_previous", key_previous);

      var key_next = this.keyNext + "+" + this.keyNextX;
      db.set("key_next", key_next);

      var key_boss = this.keyBoss + "+" + this.keyBossX;
      db.set("key_boss", key_boss);

      var key_auto = this.keyAuto + "+" + this.keyAutoX;
      db.set("key_auto", key_auto);

      db.set("errCodeChecked", this.form.errCodeChecked);

      db.set("is_display_page", this.is_display_page);
      // db.set("is_display_joke", this.is_display_joke);
      // db.set("is_display_shares", this.is_display_shares);

      db.set("display_shares_list", this.stock_code);

      db.set("moyu_text", this.moyu_text);

      ipcRenderer.send("bg_text_color", "ping");

      this.$message({
        message: "保存成功，请尽情的摸鱼吧！",
        type: "success",
        showClose: true
      });
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  margin: 10px;

  .rightx {
    width: 185px;
    text-align: center;
    line-height: 8px;

    .toolx {
      height: 390px;

      .nbx {
        writing-mode: vertical-rl;
        font-size: 14px;
        letter-spacing: 6px;
        margin-left: 0px;
        background: #585858;
        padding: 7px 80px 7px 80px;
        margin-top: -7px;
        color: #ffffff;
        border-radius: 8px;
        font-size: 12px;
      }
    }

    .sizex {
      font-size: 12px;
      line-height: 44px;
      font-weight: bold;
    }

    .cteamx {
      background: #38393a;
      line-height: 24px;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
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
