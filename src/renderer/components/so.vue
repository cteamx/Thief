<template>
  <div class="container">
    <div class="sobg">
      <el-row :gutter="10" style="margin-left: 0px;margin-right: 0px;">
        <el-col :span="18">
          <el-input
            v-model="sotext"
            placeholder="请输入搜索内容"
            prefix-icon="el-icon-search"
            style="width:100%;"
            size="mini"
          ></el-input>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%;"
            type="primary"
            icon="el-icon-search"
            size="mini"
            @click="soText"
          >搜索</el-button>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="10" style="margin-left: 0px;margin-right: 0px;padding-top: 52px;height: 540px;overflow-y: auto;">
      <el-col :span="24" style="text-align: center;width:100%;">
        <div v-if="soResult.length>0">
          <div
            class="sox"
            v-for="(item, index) in soResult"
            :key="index"
            @click="onJumpPage(item.page)"
          >
            <span>{{item.text}} / {{item.page}}</span>
          </div>
        </div>
        <div v-else class="null">
          <span>暂无内容</span>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import db from "../../main/utils/db";
import book from "../../main/utils/book";
import { ipcRenderer } from "electron";

export default {
  name: "so",
  data() {
    return {
      sotext: "",
      soResult: []
    };
  },
  created() {},
  methods: {
    soText() {
      if (this.sotext.trim() != "") {
        this.soResult = book.soText(this.sotext);
      } else {
        this.soResult = [];
      }
    },
    onJumpPage(page) {
      db.set("current_page", parseInt(page) - 1);

      ipcRenderer.send("jump_page", "ping");

      this.$message({
        message: "已经到跳转到该页面",
        type: "success",
        showClose: true
      });
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  overflow-y: auto;
  // margin: 10px;

  .sobg {
    background: #333;
    line-height: 50px;
    position: fixed;
    width: 100%;
    z-index: 999;
  }

  .sox {
    border-bottom: 1px solid #dedede;
    line-height: 25px;
    letter-spacing: 1px;
    font-size: 12px;
    color: #3e3b3b;
    cursor: pointer;
  }

  .sox:hover {
    color: #000;
    background: #f5f5f5;
  }

  .null {
    color: #8c8c8c;
    margin-top: 200px;
    font-size: 24px;
    letter-spacing: 6px;
  }
}
</style>
