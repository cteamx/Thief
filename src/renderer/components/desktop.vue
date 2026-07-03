<template>
  <el-container class="container" :style="color">
    <div class="text boss" v-if="is_boss">
      <span v-html="text"></span>
    </div>
    <div v-else>
      <div
        class="texts"
        @click="onMouse(1)"
        @contextmenu.prevent="onMouse(2)"
        @mouseover="onMouse(3)"
        @mouseout="onMouse(4)"
        @dbclick.prevent="onMouse(5)"
        v-show="is_mouse_model=='1'"
        v-html="text"></div>

      <div :class="display_css" v-show="is_mouse_model=='0'" v-html="text"></div>
    </div>
  </el-container>
</template>

<script>
import db from "../../main/utils/db";
import { ipcRenderer } from "electron";
import remote from "@electron/remote";

export default {
  name: "desktop",
  data() {
    return {
      is_boss: true,
      bg_color: "",
      txt_color: "",
      font_size: "",
      text: "",
      is_mouse_model: "0",
      display_css: "text",
    };
  },
  computed: {
    color() {
      return `background: ${this.bg_color}; color: ${this.txt_color}; font-size: ${this.font_size}px;`;
    }
  },
  watch: {
    bg_color: {
      handler(newVal) {
        console.log('bg_color 发生变化:', newVal);
      },
      immediate: true
    },
    txt_color: {
      handler(newVal) {
        console.log('txt_color 发生变化:', newVal);
      },
      immediate: true
    },
    font_size: {
      handler(newVal) {
        console.log('font_size 发生变化:', newVal);
      },
      immediate: true
    }
  },
  created() {
    this.onLoad();
  },
  mounted() {
    var that = this;
    console.log('Desktop组件已挂载，开始监听bg_text_color事件');
    
    ipcRenderer.on("bg_text_color", function(event, colorConfig) {
      console.log('收到bg_text_color消息:', colorConfig);
      
      if (colorConfig && typeof colorConfig === 'object') {
        // 直接使用主进程传递的颜色配置
        console.log('使用主进程传递的颜色配置');
        that.bg_color = colorConfig.bg_color || "rgba(0, 0, 0, 0.5)";
        that.txt_color = colorConfig.txt_color || "#fff";
        that.font_size = colorConfig.font_size || "14";
        
        console.log('直接设置的颜色配置:');
        console.log('背景色:', that.bg_color);
        console.log('文字颜色:', that.txt_color);
        console.log('字体大小:', that.font_size);
        
        // 强制触发Vue更新
        that.$nextTick(() => {
          console.log('样式已更新，当前计算样式:', that.color);
        });
      } else {
        // 兜底方案：从数据库重新读取
        console.log('未收到颜色配置，从数据库读取');
        that.onLoad();
      }
    });

    ipcRenderer.on("text", function(event, payload) {
      let message = "ping";
      let raw = "";

      if (payload && typeof payload === "object") {
        message = payload.message || "ping";
        raw = payload.text || "";
      } else {
        message = payload;
        try {
          raw = remote.getGlobal("text").text || "";
        } catch (_) {
          raw = "";
        }
      }

      const htmlText = String(raw).replace(/(?:\r\n|\r|\n)/g, '<br/>');
      if (message === "boss") {
        that.is_boss = true;
      } else {
        that.is_boss = false;
      }
      that.text = htmlText;

      var display_model = db.get("display_model");
      if (display_model == "1") {
        that.display_css = "text";
      } else if (display_model == "2") {
        that.display_css = "text mar-top";
      }
    });
  },
  methods: {
    onLoad() {
      // 强制重新初始化数据库以获取最新配置
      db.initialized = false;
      if (!db.init()) {
        console.error('数据库重新初始化失败');
        return;
      }
      
      // 添加短暂延迟确保数据库操作完成
      setTimeout(() => {
        this.bg_color = db.get("bg_color") || "rgba(0, 0, 0, 0.5)";
        this.txt_color = db.get("txt_color") || "#fff";
        this.font_size = db.get("font_size") || "14";

        console.log('Desktop - onLoad 被调用');
        console.log('背景色:', this.bg_color);
        console.log('文字颜色:', this.txt_color);
        console.log('字体大小:', this.font_size);

        this.is_mouse_model = db.get("is_mouse");
        
        // 强制触发Vue的响应式更新
        this.$nextTick(() => {
          console.log('样式已更新，当前计算样式:', this.color);
        });
      }, 100);
    },
    onMouse(type) {
      if (type == 1) {
        // 鼠标左击
        ipcRenderer.send("MouseAction", "1");
      } else if (type == 2) {
        // 鼠标右击
        ipcRenderer.send("MouseAction", "2");
      } else if (type == 3) {
        // 鼠标进入
        ipcRenderer.send("MouseAction", "3");
      } else if (type == 4) {
        // 鼠标移出
        ipcRenderer.send("MouseAction", "4");
      }
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  height: 100%;

  .mar-top {
    margin-top: 3px;
  }

  .text {
    -webkit-app-region: drag;
    height: 100%;
    padding: 0px 10px;
  }

  .texts {
    -webkit-app-region: no-drag;
    height: 100%;
    padding: 0px 10px;
  }

  .boss {
    text-align: center;
    width: 100%;
    display: table;
    overflow: hidden;

    span {
      vertical-align: middle;
      display: table-cell;
    }
  }
}
</style>

<style lang="scss">
.profit-up,
.stock-color-red {
  color: #f56c6c;
}

.profit-down,
.stock-color-green {
  color: #67c23a;
}
</style>
