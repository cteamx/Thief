<template>
  <el-container class="container">
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
            :max="28"
            v-model="form.page_size"
          ></el-input-number>

          <el-input-number
            v-else
            size="mini"
            controls-position="right"
            :min="5"
            :max="100"
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

      <el-col :span="24">
        <el-form-item label="上一页">
          <el-input
            style="width:351px;"
            v-model="form.key_previous"
            maxlength="100"
            size="mini"
            placeholder="请输入按键"
            prefix-icon="el-icon-grape"
            @focus="onPreviousFocus"
            @blur="onPreviousBlur"
          ></el-input>
        </el-form-item>
      </el-col>

      <el-col :span="24">
        <el-form-item label="下一页">
          <el-input
            style="width:351px;"
            v-model="form.key_next"
            maxlength="100"
            size="mini"
            placeholder="请输入按键"
            prefix-icon="el-icon-grape"
            @focus="onNextFocus"
            @blur="onNextBlur"
          ></el-input>
        </el-form-item>
      </el-col>

      <el-col :span="24">
        <el-form-item label="老板键">
          <el-input
            style="width:351px;"
            v-model="form.key_boss"
            maxlength="100"
            size="mini"
            placeholder="请输入按键"
            prefix-icon="el-icon-grape"
            @focus="onBossFocus"
            @blur="onBossBlur"
          ></el-input>
        </el-form-item>
      </el-col>

      <el-col :span="24">
        <el-form-item label="自动翻页">
          <el-input
            style="width:351px;"
            v-model="form.key_auto"
            maxlength="100"
            size="mini"
            placeholder="请输入按键"
            prefix-icon="el-icon-grape"
            @focus="onAutoFocus"
            @blur="onAutoBlur"
          ></el-input>
        </el-form-item>
      </el-col>

      <el-button style="width: 100%;" type="primary" size="mini" @click="onSubmit">保存</el-button>
    </el-form>
  </el-container>
</template>

<script>
import db from "../../main/utils/db";
import dialog from "../utils/dialog";
import { ipcRenderer } from "electron";
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
      }
    };
  },
  created() {
    this.onLoad();
    this.onKey();
  },
  methods: {
    onPreviousFocus() {
      this.form.key_previous = "";
      this.key_type = 1;
    },
    onNextFocus() {
      this.form.key_next = "";
      this.key_type = 2;
    },
    onBossFocus() {
      this.form.key_boss = "";
      this.key_type = 3;
    },
    onAutoFocus() {
      this.form.key_auto = "";
      this.key_type = 4;
    },
    onPreviousBlur() {
      if (this.form.key_previous.trim() === "") {
        this.form.key_previous = db.get("key_previous");
      }
      this.key_type = 0;
    },
    onNextBlur() {
      if (this.form.key_next.trim() === "") {
        this.form.key_next = db.get("key_next");
      }

      this.key_type = 0;
    },
    onBossBlur() {
      if (this.form.key_boss.trim() === "") {
        this.form.key_boss = db.get("key_boss");
      }

      this.key_type = 0;
    },
    onAutoBlur() {
      if (this.form.key_auto.trim() === "") {
        this.form.key_auto = db.get("key_auto");
      }

      this.key_type = 0;
    },
    onKey() {
      var that = this;

      hotkeys.filter = function(event) {
        return true;
      };

      hotkeys("*", function(e) {
        if (e.key != "Backspace") {
          if (
            e.key === "Control" ||
            e.key === "Meta" ||
            e.key === "Alt" ||
            e.key === "Shift"
          ) {
            if (that.key_type == 1) {
              var arr = that.form.key_previous.split("+");
              if (arr.length > 1) {
                var keyx = "";
                if (e.key === "Meta" || e.key === "Control") {
                  keyx = "CmdOrCtrl";
                } else {
                  keyx = e.key;
                }

                if (arr.indexOf(keyx) <= -1) {
                  that.form.key_previous = that.form.key_previous + keyx + "+";
                }
              } else {
                if (e.key === "Meta" || e.key === "Control") {
                  that.form.key_previous =
                    that.form.key_previous + "CmdOrCtrl" + "+";
                } else {
                  that.form.key_previous = that.form.key_previous + e.key + "+";
                }
              }
            } else if (that.key_type == 2) {
              var arr = that.form.key_next.split("+");
              if (arr.length > 1) {
                var keyx = "";
                if (e.key === "Meta" || e.key === "Control") {
                  keyx = "CmdOrCtrl";
                } else {
                  keyx = e.key;
                }

                if (arr.indexOf(keyx) <= -1) {
                  that.form.key_next = that.form.key_next + keyx + "+";
                }
              } else {
                if (e.key === "Meta" || e.key === "Control") {
                  that.form.key_next = that.form.key_next + "CmdOrCtrl" + "+";
                } else {
                  that.form.key_next = that.form.key_next + e.key + "+";
                }
              }
            } else if (that.key_type == 3) {
              var arr = that.form.key_boss.split("+");
              if (arr.length > 1) {
                var keyx = "";
                if (e.key === "Meta" || e.key === "Control") {
                  keyx = "CmdOrCtrl";
                } else {
                  keyx = e.key;
                }

                if (arr.indexOf(keyx) <= -1) {
                  that.form.key_boss = that.form.key_boss + keyx + "+";
                }
              } else {
                if (e.key === "Meta" || e.key === "Control") {
                  that.form.key_boss = that.form.key_boss + "CmdOrCtrl" + "+";
                } else {
                  that.form.key_boss = that.form.key_boss + e.key + "+";
                }
              }
            } else if (that.key_type == 4) {
              var arr = that.form.key_auto.split("+");
              if (arr.length > 1) {
                var keyx = "";
                if (e.key === "Meta" || e.key === "Control") {
                  keyx = "CmdOrCtrl";
                } else {
                  keyx = e.key;
                }

                if (arr.indexOf(keyx) <= -1) {
                  that.form.key_auto = that.form.key_auto + keyx + "+";
                }
              } else {
                if (e.key === "Meta" || e.key === "Control") {
                  that.form.key_auto = that.form.key_auto + "CmdOrCtrl" + "+";
                } else {
                  that.form.key_auto = that.form.key_auto + e.key + "+";
                }
              }
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

      this.form.key_previous = db.get("key_previous");
      this.form.key_next = db.get("key_next");
      this.form.key_boss = db.get("key_boss");
      this.form.key_auto = db.get("key_auto");

      this.lmchecked = db.get("errCodeChecked");
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

      db.set("key_previous", this.form.key_previous);
      db.set("key_next", this.form.key_next);
      db.set("key_boss", this.form.key_boss);
      db.set("key_auto", this.form.key_auto);

      db.set("errCodeChecked", this.form.errCodeChecked);

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
</style>
