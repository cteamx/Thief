'use strict';

import fs from "fs"
import db from "./db"
import iconv from "iconv-lite"

export default {
    data() {
        return {
            curr_page_number: 1,
            page_size: 50,
            page: 0,
            start: 0,
            end: this.page_size,
            filePath: "",
            errCode: false
        };
    },
    getSize(text) {
        let size = text.length;
        this.page = Math.ceil(size / this.page_size);
    },
    getFileName() {
        var file_name = this.filePath.split("/").pop();
    },
    getPage(type) {
        let curr_page = db.get("current_page");
        var page = 0;

        if (type === "previous") {
            if (curr_page <= 1) {
                page = 1;
            } else {
                page = curr_page - 1;
            }
        } else if (type === "next") {
            if (curr_page >= this.page) {
                page = this.page;
            } else {
                page = curr_page + 1;
            }
        } else if (type === "curr") {
            page = curr_page;
        }

        this.curr_page_number = page;
    },
    updatePage() {
        db.set("current_page", this.curr_page_number)
    },
    getStartEnd() {
        this.start = this.curr_page_number * this.page_size;
        this.end = this.curr_page_number * this.page_size - this.page_size;
    },
    readFile() {
        if (this.filePath === "" || typeof (this.filePath) === "undefined") {
            return "请选择TXT小说路径"
        }

        try {
            var data = fs.readFileSync(this.filePath);

            if (this.errCode) {
                data = iconv.decode(data, 'gb2312');
            } else {
                data = iconv.decode(data, 'utf-8');
            }
        } catch (error) {
            return "TXT小说路径不存在或路径不正确"
        }

        var line_break = db.get("line_break");

        return data.toString().replace(/\n/g, line_break).replace(/\r/g, " ").replace(/　　/g, " ").replace(/ /g, " ");
    },
    init() {
        this.filePath = db.get("current_file_path");
        this.errCode = db.get("errCodeChecked");
        var is_english = db.get("is_english");
        var curr_model = db.get("curr_model");

        if (is_english === true) {
            if (curr_model === "1") {
                this.page_size = db.get("page_size");
            } else {
                this.page_size = db.get("page_size");
            }
        } else {
            if (curr_model === "1") {
                this.page_size = db.get("page_size");
            } else {
                this.page_size = db.get("page_size");
            }
        }
    },
    soText(so) {
        this.init();
        // 小说搜索
        let text = this.readFile();
        this.getSize(text);

        // 存储搜索结果
        var soResult = [];

        // 正则
        var re = new RegExp(so, "g");
        var result = "";

        do {
            try {
                result = re.exec(text);

                // 分页位置
                var page = Math.ceil(result.index / this.page_size);

                // 附近内容
                var textx = text.substring(result.index - 30, result.index + 31)

                // 加入结果 数组
                soResult.push({
                    index: result.index,
                    page: page,
                    text: textx
                })
            } catch (error) { }
        }
        while (result != null)

        return soResult;
    },
    makePage(text) {
        this.getStartEnd();
        this.updatePage();
        if (db.get("is_display_page")) {
            var page_info = this.curr_page_number.toString() + "/" + this.page.toString();
            return text.substring(this.start, this.end) + "    " + page_info;
        } else {
            return text.substring(this.start, this.end)
        }
    },
    getPreviousPage() {
        this.init();
        let text = this.readFile();
        this.getSize(text);
        this.getPage("previous");
        return this.makePage(text);
    },
    getNextPage() {
        this.init();
        let text = this.readFile();
        this.getSize(text);
        this.getPage("next");
        return this.makePage(text);
    },
    getJumpingPage() {
        this.init();
        let text = this.readFile();
        this.getSize(text);
        this.getPage("curr");
        return this.makePage(text);
    }
};