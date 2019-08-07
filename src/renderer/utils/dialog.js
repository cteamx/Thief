'use strict';

import { remote } from 'electron'

export default {
    showOpenFile(callback) {
        remote.dialog.showOpenDialog({
            title: '请选择要打开的文件',
            filters: [
                { name: 'Markdown', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile', 'showHiddenFiles']
        }, (filePaths) => {
            callback(filePaths)
        })
    }
};