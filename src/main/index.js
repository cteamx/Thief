import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, shell, dialog } from 'electron'
import db from './utils/db'
import book from './utils/book'
import osUtil from './utils/osUtil'
import request from 'request'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let tray;
let settingWindow;
let desktopWindow;

const isMac = 'darwin' === process.platform;
const settingURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#/setting`
  : `file://${__dirname}/index.html#setting`

const desktopURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#/desktop`
  : `file://${__dirname}/index.html#desktop`


function init() {
  createKey();
  createTray();

  if (isMac) {
    createSetting();

    if (db.get('curr_model') === '2') {
      createWindownDesktop();

      setTimeout(() => {
        BossKey(1);
      }, 1000);
    }
  } else {
    createWindownDesktop();

    setTimeout(() => {
      BossKey(1);
    }, 1000);
  }
}

function createWindownSetting() {
  /**
   * Initial window options
   */

  settingWindow = new BrowserWindow({
    title: '设 置',
    useContentSize: true,
    width: 497,
    height: 641,
    // resizable: false,
    maximizable: false,
    minimizable: false,
  })

  let webContents = settingWindow.webContents;
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(1);
    webContents.setVisualZoomLevelLimits(1, 1);
    webContents.setLayoutZoomLevelLimits(0, 0);
  })

  settingWindow.loadURL(settingURL)

  settingWindow.on('closed', () => {
    settingWindow = null
  })
}

function createWindownDesktop() {
  /**
   * Initial window options
   */
  const titleBarStyle = isMac ? 'hidden' : 'default';

  desktopWindow = new BrowserWindow({
    useContentSize: true,
    width: 856,
    height: 47,
    resizable: true,
    frame: false,
    transparent: true,
    // maximizable: false
    // y: 600,
    // x: 300
  })

  let webContents = desktopWindow.webContents;
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(1);
    webContents.setVisualZoomLevelLimits(1, 1);
    webContents.setLayoutZoomLevelLimits(0, 0);
  })

  desktopWindow.loadURL(desktopURL)

  desktopWindow.setAlwaysOnTop(true);

  desktopWindow.setSkipTaskbar(true);

  desktopWindow.on('closed', () => {
    desktopWindow = null
  })
}

function setText(text) {
  global.text = {
    text: text
  }
}

function MouseModel(e) {
  if (desktopWindow != null) {
    if (e.checked == true) {
      db.set("is_mouse", "1")
    } else {
      db.set("is_mouse", "0")
    }

    desktopWindow.reload();


    setTimeout(() => {
      let text = osUtil.getTime();
      setText(text);
      desktopWindow.webContents.send('text', 'boss');
    }, 2000);
  }
}

let autoPageTime;

function AutoPage() {
  if (db.get('auto_page') === '1') {
    db.set("auto_page", "0")
    var second = db.get('second');
    autoPageTime = setInterval(function () {
      NextPage();
    }, parseInt(second) * 1000);
  } else if (db.get('auto_page') === '0') {
    db.set("auto_page", "1")
    clearInterval(autoPageTime);
  }
}

function NextPage() {
  let text = book.getNextPage();

  if (db.get('curr_model') === '1') {
    tray.setTitle(text);
  } else if (db.get('curr_model') === '2') {
    setText(text);
    if (desktopWindow != null) {
      desktopWindow.webContents.send('text', 'ping');
    }
  }
}

function PreviousPage() {
  let text = book.getPreviousPage();

  if (db.get('curr_model') === '1') {
    tray.setTitle(text);
  } else if (db.get('curr_model') === '2') {
    setText(text);
    if (desktopWindow != null) {
      desktopWindow.webContents.send('text', 'ping');
    }
  }
}

function BossKey(type) {
  let text = osUtil.getTime();

  if (db.get('curr_model') === '1') {
    tray.setTitle(text);
  }
  if (db.get('curr_model') === '2') {
    tray.setTitle("");
    setText(text);

    if (desktopWindow != null) {
      if (type === 1) {
        desktopWindow.webContents.send('text', 'boss');
      } else if (type === 2) {
        {
          if (desktopWindow.isVisible()) {
            desktopWindow.hide();
          }
          else {
            desktopWindow.show();
          }
        }
      }
    }
  }
}


function checkUpdate() {
  request({
    url: "https://gitee.com/lauix/public_version/raw/master/version.txt",
    method: "GET"
  }, function (err, res, body) {
    console.log(body);
    var newVersion = parseFloat(body);

    var currVersion = 1.0
    if (newVersion > currVersion) {
      const options = {
        type: 'info',
        title: '检查更新',
        message: "发现新版本，是否更新？",
        buttons: ['是', '否']
      }
      dialog.showMessageBox(options, function (index) {
        if (index == 0) {
          shell.openExternal('https://github.com/cteams/Thief-Book/releases')
        }
      })
    } else {
      const options = {
        type: 'info',
        title: '检查更新',
        message: "当前为最新版本",
        buttons: ['确认']
      }
      dialog.showMessageBox(options)
    }
  })
}

function Exit() {
  app.quit();
}

function createKey() {
  try {
    globalShortcut.register(db.get('key_previous'), function () {
      PreviousPage();
    })

    globalShortcut.register(db.get('key_next'), function () {
      NextPage();
    })

    globalShortcut.register(db.get('key_boss'), function () {
      BossKey(2);
    })

    globalShortcut.register(db.get('key_auto'), function () {
      AutoPage();
    })
  } catch (error) {
    const options = {
      type: 'info',
      title: '快捷键异常',
      message: "设置快捷键错误，请看文档异常汇总！",
      buttons: ['打开文档', '否']
    }
    dialog.showMessageBox(options, function (index) {
      if (index == 0) {
        shell.openExternal('https://github.com/cteams/Thief-Book/blob/master/README.md')
      }
    })

    Exit();
  }

  globalShortcut.register('CommandOrControl+Alt+X', function () {
    Exit();
  })
}

function createTray() {
  const menubarLogo = process.platform === 'darwin' ? `${__static}/logo.png` : `${__static}/logo.png`

  var menuList = [];
  menuList.push(
    {
      label: '关于',
      click() {
        shell.openExternal('https://github.com/cteams/Thief-Book')
      }
    },
    {
      label: '检查更新',
      click() {
        checkUpdate();
      }
    }
  );

  if (isMac) {
    menuList.push(
      {
        type: "separator"
      },
      {
        label: '任务栏版',
        type: 'radio',
        checked: db.get('curr_model') === '1',
        click() {
          db.set("curr_model", "1")

          if (desktopWindow != null) {
            desktopWindow.close();
          }

          BossKey(1);
        }
      },
      {
        label: '桌面版',
        type: 'radio',
        checked: db.get('curr_model') === '2',
        click() {
          if (desktopWindow === "null" || desktopWindow === "undefined" || typeof (desktopWindow) === "undefined") {
            createWindownDesktop();
          } else {
            try {
              desktopWindow.show();
            } catch (error) {
              createWindownDesktop();
            }
          }

          db.set("curr_model", "2")

          setTimeout(() => {
            BossKey(1);
          }, 1000);
        }
      }
    );
  } else {
  }

  menuList.push(
    {
      type: "separator"
    },
    {
      label: '鼠标模式',
      type: 'checkbox',
      click(e) {
        MouseModel(e);
      }
    },
    {
      label: '自动翻页',
      type: 'checkbox',
      accelerator: db.get('key_auto'),
      checked: db.get('auto_page') === '0',
      click() {
        AutoPage();
      }
    },
    {
      label: '上一页',
      accelerator: db.get('key_previous'),
      click() {
        PreviousPage();
      }
    },
    {
      label: '下一页',
      accelerator: db.get('key_next'),
      click() {
        NextPage();
      }
    },
    {
      label: '老板键',
      accelerator: db.get('key_boss'),
      click() {
        BossKey(2);
      }
    },
    {
      label: '设置',
      click() {
        if (settingWindow === "null" || settingWindow === "undefined" || typeof (settingWindow) === "undefined") {
          createWindownSetting();
        } else {
          try {
            settingWindow.show();
          } catch (error) {
            createWindownSetting();
          }
        }
      }
    },
    {
      type: "separator"
    },
    {
      accelerator: 'CommandOrControl+Alt+X',
      label: '退出',
      click() {
        Exit();
      }
    }
  );


  tray = new Tray(menubarLogo)
  tray.setContextMenu(Menu.buildFromTemplate(menuList))
  BossKey();
}

function createSetting() {
  if (isMac) {
    app.dock.hide();
  } else {
    // 
  }
}

ipcMain.on('bg_text_color', function () {
  if (desktopWindow != null) {
    desktopWindow.webContents.send('bg_text_color', 'ping');
  }
})

ipcMain.on('MouseAction', function (e, v) {
  if (desktopWindow != null) {
    if (v == "1") {
      // 鼠标左击
      NextPage();
    } else if (v == "2") {
      // 鼠标右击
      PreviousPage();
    } else if (v == "3") {
      // 鼠标进入
    } else if (v == "4") {
      // 鼠标移出
      BossKey(2);
    }
  }
})

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (desktopWindow) {
    if (desktopWindow.isMinimized()) desktopWindow.restore()
    desktopWindow.focus()
  }
})

if (shouldQuit) {
  app.quit()
}

app.on('ready', init)

app.on('window-all-closed', () => {
  db.set("auto_page", "1");
  db.set("is_mouse", "0");
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// app.on('activate', () => {
//   if (settingWindow === null) {
//     createWindow()
//   }
// })

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

// import { autoUpdater } from 'electron-updater'

// autoUpdater.on('update-downloaded', () => {
//   autoUpdater.quitAndInstall()
// })

// app.on('ready', () => {
//   if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
// })