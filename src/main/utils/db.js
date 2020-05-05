'use strict';
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import path from 'path'
import fs from 'fs-extra'
import LodashId from 'lodash-id'
import { remote, app } from 'electron'

export default {
    data() {
        return {
            db_util: null,
            file_json: ""
        };
    },
    init() {
        // if (process.env.NODE_ENV !== 'development') {
        //     global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
        // }

        // if (process.env.DEBUG_ENV === 'debug') {
        //     global.__static = path.join(__dirname, '../../static').replace(/\\/g, '\\\\')
        // }

        let APP = process.type === 'renderer' ? remote.app : app
        let STORE_PATH = APP.getPath('userData')
        // let STORE_PATH = "/Users/sanjin/work/h5/vue/thief-book/static"

        if (process.type !== 'renderer') {
            if (!fs.pathExistsSync(STORE_PATH)) {
                fs.mkdirpSync(STORE_PATH)
            }
        }

        this.file_json = new FileSync(path.join(STORE_PATH, '/thief_data.json'));

        this.db_util = low(this.file_json)
        this.db_util._.mixin(LodashId)

        if (!this.db_util.has('current_page').value()) {
            this.db_util.set('current_page', 1).write()
        }

        if (!this.db_util.has('page_size').value()) {
            this.db_util.set('page_size', 20).write()
        }

        if (!this.db_util.has('is_english').value()) {
            this.db_util.set('is_english', false).write()
        }

        if (!this.db_util.has('line_break').value()) {
            this.db_util.set('line_break', " ").write()
        }

        if (!this.db_util.has('current_file_path').value()) {
            this.db_util.set('current_file_path', "").write()
        }

        if (!this.db_util.has('bg_color').value()) {
            this.db_util.set('bg_color', "rgba(0, 0, 0, 0.5)").write()
        }

        if (!this.db_util.has('txt_color').value()) {
            this.db_util.set('txt_color', "#fff").write()
        }

        if (!this.db_util.has('font_size').value()) {
            this.db_util.set('font_size', "14").write()
        }

        if (!this.db_util.has('second').value()) {
            this.db_util.set('second', "5").write()
        }

        if (!this.db_util.has('auto_page').value()) {
            this.db_util.set('auto_page', "0").write()
        }

        if (!this.db_util.has('key_next').value()) {
            this.db_util.set('key_next', "CmdOrCtrl+Alt+.").write()
        }

        if (!this.db_util.has('key_previous').value()) {
            this.db_util.set('key_previous', "CmdOrCtrl+Alt+,").write()
        }

        if (!this.db_util.has('key_boss').value()) {
            this.db_util.set('key_boss', "CmdOrCtrl+Alt+M").write()
        }

        if (!this.db_util.has('key_auto').value()) {
            this.db_util.set('key_auto', "CmdOrCtrl+Alt+P").write()
        }

        if (!this.db_util.has('errCodeChecked').value()) {
            this.db_util.set('errCodeChecked', false).write()
        }

        if (!this.db_util.has('is_mouse').value()) {
            this.db_util.set('is_mouse', "0").write()
        }

        if (!this.db_util.has('is_display_page').value()) {
            this.db_util.set('is_display_page', true).write()
        }

        // if (!this.db_util.has('is_display_joke').value()) {
        //     this.db_util.set('is_display_joke', false).write()
        // }

        if (!this.db_util.has('display_model').value()) {
            this.db_util.set('display_model', '1').write()
        }

        if (!this.db_util.has('display_shares_list').value()) {
            this.db_util.set('display_shares_list', "").write()
        }

        if (!this.db_util.has('moyu_text').value()) {
            this.db_util.set('moyu_text', "Hello").write()
        }

        if (!this.db_util.has('desktop_wh').value()) {
            this.db_util.set('desktop_wh', "").write()
        }

        if (!this.db_util.has('desktop_wz').value()) {
            this.db_util.set('desktop_wz', "").write()
        }

        if (!this.db_util.has('is_ad').value()) {
            this.db_util.set('is_ad', 0).write()
        }

        let isMac = 'darwin' === process.platform;
        if (!this.db_util.has('curr_model').value()) {
            if (isMac) {
                this.db_util.set('curr_model', "1").write()
            } else {
                this.db_util.set('curr_model', "2").write()
            }
        }
    },
    get(key) {
        this.init();
        return this.db_util.get(key).value();
    },
    set(key, value) {
        this.init();
        this.db_util.set(key, value).write();
    }
};