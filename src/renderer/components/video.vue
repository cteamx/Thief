<template>
  <el-container class="container">
    <div class="divx"></div>
    <div class="setting" v-if="is_setting">
      <el-input placeholder="请选择本地视频" v-model="input" class="input-with-select" size="mini">
        <el-button slot="append" icon="el-icon-folder-opened" @click="onSelect"></el-button>
      </el-input>
    </div>
    <div class="videox" v-if="url">
      <video :src="url" controls autoplay class="video_src" width="100%"></video>
    </div>
  </el-container>
</template>

<script>
import fs from "fs";
import hotkeys from "hotkeys-js";
import { ipcRenderer } from "electron";
import dialog from "../utils/dialog";

export default {
  name: "video",
  data() {
    return {
      url: null,
      is_setting: true,
      input: ""
    };
  },
  created() {
    this.onKey();
  },
  methods: {
    getUrl() {
      var data = fs.readFileSync(this.input);
      let url = window.URL.createObjectURL(new Blob([data]));
      this.url = url;
    },
    onSelect() {
      var that = this;
      dialog.showOpenVideoFile(function(e) {
        that.input = e[0];
        that.getUrl();
        ipcRenderer.send("videoOpacity", "change");
      });
    },
    open() {
      if (this.is_setting) {
        this.is_setting = false;
      } else {
        this.is_setting = true;
      }
    },
    onKey() {
      var that = this;

      hotkeys.filter = function(event) {
        return true;
      };

      hotkeys("*", function(e) {
        if (e.key === "-") {
          ipcRenderer.send("videoOpacity", "-");
        } else if (e.key === "+") {
          ipcRenderer.send("videoOpacity", "+");
        } else if (e.key === "c") {
          that.open();
        } else if (e.key === "x") {
          ipcRenderer.send("videoOpacity", "exit");
        }
      });
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  border: 0px;

  .divx {
    width: 50px;
    height: 50px;
    position: absolute;
    z-index: 999;
    -webkit-app-region: drag;
  }

  .ifr {
    width: 100%;
    height: 100%;
    border: 0px;
  }

  .setting {
    width: 100%;
    clear: both;
    position: absolute;
    padding-top: 0px;
    z-index: 998;
  }

  .videox {
    background: #000;

    .video_src {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
