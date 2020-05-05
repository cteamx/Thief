<template>
  <el-container class="container">
    <div class="divx"></div>
    <div class="setting" v-if="is_setting">
      <el-input
        placeholder="请选择本地PDF"
        v-model="input"
        class="input-with-select"
        @keyup.enter.native="onSo"
        size="mini"
      >
        <el-button slot="append" icon="el-icon-folder-opened" @click="onSelect"></el-button>
      </el-input>
    </div>
    <div v-loading="loading" v-if="pdfurl" class="center">
      <canvas v-for="data in canvasData" :key="data" :id="'the-canvas-'+data" class="canvasstyle"></canvas>
    </div>
  </el-container>
</template>

<script>
import fs from "fs";
import hotkeys from "hotkeys-js";
import { ipcRenderer } from "electron";
import dialog from "../utils/dialog";
import PDFJS from "pdfjs-dist";

export default {
  name: "pdf",
  components: {},
  data() {
    return {
      is_setting: true,
      input: "",
      pdfDoc: null, // pdfjs 生成的对象
      pageNum: 1, //
      pageRendering: false,
      pageNumPending: null,
      scale: 1.2, // 放大倍数
      page_num: 0, // 当前页数
      page_count: 0, // 总页数
      maxscale: 2, // 最大放大倍数
      minscale: 0.8, // 最小放大倍数
      canvasData: [],
      pdfjsView: false,
      pdfurl: null,
      loading: false
    };
  },
  created() {
    this.onLoad();
    this.onKey();
  },
  methods: {
    renderPage(num) {
      // 渲染pdf
      const vm = this;
      this.pageRendering = true;
      const canvas = document.getElementById(`the-canvas-${num}`);
      // Using promise to fetch the page
      this.pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport(vm.scale);
        // alert(vm.canvas.height)
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
          //   canvasContext: vm.ctx,
          canvasContext: canvas.getContext("2d"),
          viewport
        };
        const renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(() => {
          vm.pageRendering = false;
          if (vm.pageNumPending !== null) {
            // New page rendering is pending
            vm.renderPage(vm.pageNumPending);
            vm.pageNumPending = null;
          }
        });
      });
      vm.page_num = vm.pageNum;
    },
    makePDF(url) {
      this.pdfurl = url;
      this.pdfjsView = true;
      this.showPDf();
    },
    showPDf() {
      const vm = this;
      this.loading = true;
      vm.canvasData = [];
      var data = fs.readFileSync(vm.pdfurl);
      var typedarray = new Uint8Array(data);
      PDFJS.getDocument(typedarray)
        .then(pdfDoc_ => {
          // 初始化pdf
          vm.pdfDoc = pdfDoc_;
          vm.page_count = vm.pdfDoc.numPages;
          for (let i = 0; i < vm.page_count; i += 1) {
            vm.canvasData.push(i + 1);
          }
          return pdfDoc_;
        })
        .then(pdfDoc_ => {
          // 初始化pdf
          vm.pdfDoc = pdfDoc_;
          vm.page_count = vm.pdfDoc.numPages;
          for (let i = 0; i < vm.page_count; i += 1) {
            vm.renderPage(i + 1);
          }
          vm.loading = false;
        });
    },
    onLoad() {},
    onSo() {
      this.makePDF(this.input);
      ipcRenderer.send("pdfOpacity", "change");
    },
    onSelect() {
      var that = this;
      dialog.showOpenPdfFile(function(e) {
        that.input = e[0];
        that.makePDF(that.input);
        ipcRenderer.send("pdfOpacity", "change");
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
          ipcRenderer.send("pdfOpacity", "-");
        } else if (e.key === "+") {
          ipcRenderer.send("pdfOpacity", "+");
        } else if (e.key === "c") {
          that.open();
        } else if (e.key === "x") {
          ipcRenderer.send("pdfOpacity", "exit");
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
  }

  .center {
    width: 100%;
    height: 100%;
    text-align: center;
    overflow: auto;

    .canvasstyle {
      width: 100%;
    }
  }
}
</style>
