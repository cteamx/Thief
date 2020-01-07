'use strict';

import { remote } from 'electron'

export default {
    showOpenFile(callback) {
        remote.dialog.showOpenDialog({
            title: '请选择要打开的文件',
            filters: [
                { name: 'TXT', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile', 'showHiddenFiles']
          }).then(result => {
            callback(result.filePaths)
          }).catch(err => {
            console.log(err)
          })
    }
};