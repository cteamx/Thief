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
            oldFilePath: "",
            errCode: false,
            fileCache: "",
        };
    },
    getSize(text) {
        let size = text.length;
        this.page = Math.ceil(size / this.page_size);
    },
    getFileName() {
        var file_name = this.filePath.split("/").pop();
    },
    async getPage(type) {
        let curr_page = await db.get("current_page");
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
    async readFile() {
        if (this.filePath === "" || typeof (this.filePath) === "undefined") {
            return "请选择TXT小说路径"
        }

        if (this.filePath !== this.oldFilePath) {
            try {
                var data = fs.readFileSync(this.filePath);

                if (this.errCode) {
                    data = iconv.decode(data, 'gb2312');
                } else {
                    data = iconv.decode(data, 'utf-8');
                }
                this.oldFilePath = this.filePath
                var line_break = await db.get("line_break");
                data = data.toString().replace(/\n/g, line_break).replace(/\r/g, " ").replace(/　　/g, " ").replace(/ /g, " ");
                this.fileCache = data
            } catch (error) {
                return "TXT小说路径不存在或路径不正确"
            }
        }

        return this.fileCache
    },
    async init() {
        this.filePath = await db.get("current_file_path");
        this.errCode = await db.get("errCodeChecked");
        var is_english = await db.get("is_english");
        var curr_model = await db.get("curr_model");

        if (is_english === true) {
            if (curr_model === "1") {
                this.page_size = await db.get("page_size");
            } else {
                this.page_size = await db.get("page_size");
            }
        } else {
            if (curr_model === "1") {
                this.page_size = await db.get("page_size");
            } else {
                this.page_size = await db.get("page_size");
            }
        }
    },
    async soText(so) {
        await this.init();
        // 小说搜索
        let text = await this.readFile();
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
    async makePage(text) {
        this.getStartEnd();
        this.updatePage();
        if (await db.get("is_display_page")) {
            var page_info = this.curr_page_number.toString() + "/" + this.page.toString();
            return text.substring(this.start, this.end) + "    " + page_info;
        } else {
            return text.substring(this.start, this.end)
        }
    },
    async getPreviousPage() {
        await this.init();
        let text = await this.readFile();
        this.getSize(text);
        await this.getPage("previous");
        return await this.makePage(text);
    },
    async getNextPage() {
        await this.init();
        let text = await this.readFile();
        this.getSize(text);
        await this.getPage("next");
        return await this.makePage(text);
    },
    async getJumpingPage() {
        await this.init();
        let text = await this.readFile();
        this.getSize(text);
        await this.getPage("curr");
        return await this.makePage(text);
    }
};
