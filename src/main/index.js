import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, shell, dialog, nativeImage, TouchBar } from 'electron'
import db from './utils/db'
import book from './utils/book'
import osUtil from './utils/osUtil'
import stock from './utils/stock'
import request from 'request'

const { TouchBarButton, TouchBarSpacer } = TouchBar

let touchBarText = null;

function createTouchBarText() {
  touchBarText = new TouchBarButton({
    label: '',
    backgroundColor: '#363636',
    click: () => {
      BossKey(2);
    }
  })

  var touchBar = new TouchBar({
    items: [
      touchBarText
    ]
  })

  return touchBar;
}

function createTouchBarButton() {
  let button1 = new TouchBarButton({
    label: '🤒 Previous',
    backgroundColor: '#a923ce',
    click: () => {
      PreviousPage();
    }
  })

  let button2 = new TouchBarButton({
    label: '🤪 Next',
    backgroundColor: '#2352ce',
    click: () => {
      NextPage();
    }
  })

  let button3 = new TouchBarButton({
    label: '👻 Fuck !',
    backgroundColor: '#ce2323',
    click: () => {
      BossKey(2);
    }
  })

  let touchBar = new TouchBar({
    items: [
      button1,
      new TouchBarSpacer({ size: 'small' }),
      button2,
      new TouchBarSpacer({ size: 'small' }),
      button3,
      new TouchBarSpacer({ size: 'small' })
    ]
  })

  return touchBar;
}


/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let tray;
let settingWindow;
let soWindow;
let desktopWindow;
let desktopBarWindow;

const isMac = 'darwin' === process.platform;

const soURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#/so`
  : `file://${__dirname}/index.html#so`

const settingURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#/setting`
  : `file://${__dirname}/index.html#setting`

const desktopURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080/#/desktop`
  : `file://${__dirname}/index.html#desktop`


function init() {
  if (isMac) {
    createSetting();

    if (db.get('curr_model') === '2') {
      createWindownDesktop();

      setTimeout(() => {
        BossKey(1);
      }, 1000);
    } else if (db.get('curr_model') === '3') {
      db.set("curr_model", "1")
    }
  } else {
    createWindownDesktop();

    setTimeout(() => {
      BossKey(1);
    }, 1000);
  }

  createKey();
  createTray();
}

function createSoSetting() {
  /**
   * Initial window options
   */

  soWindow = new BrowserWindow({
    title: '搜 索',
    useContentSize: true,
    width: 334,
    height: 540,
    // resizable: false,
    maximizable: false,
    minimizable: false,
  })

  let webContents = soWindow.webContents;
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(1);
    webContents.setVisualZoomLevelLimits(1, 1);
    webContents.setLayoutZoomLevelLimits(0, 0);
  })

  soWindow.loadURL(soURL)

  soWindow.on('closed', () => {
    soWindow = null
  })
}


function createWindownSetting() {
  /**
   * Initial window options
   */
  settingWindow = new BrowserWindow({
    title: '设 置',
    useContentSize: true,
    width: 715,
    height: 630,
    resizable: false,
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

  var width = 856;
  var height = 47;
  var x = 356;
  var y = 429;

  var desktop_wh = db.get('desktop_wh');
  var desktop_wz = db.get('desktop_wz');

  var arr_wh = desktop_wh.split(",");
  var arr_wz = desktop_wz.split(",");

  if (arr_wh.length == 2) {
    width = parseInt(arr_wh[0]);
    height = parseInt(arr_wh[1]);
  }

  if (arr_wh.length == 2) {
    x = parseInt(arr_wz[1]);
    y = parseInt(arr_wz[0]);
  }

  desktopWindow = new BrowserWindow({
    useContentSize: true,
    width: width,
    height: height,
    resizable: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    y: x,
    x: y,
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

  desktopWindow.setTouchBar(createTouchBarButton())

  desktopWindow.on('closed', () => {
    desktopWindow = null
  })

  desktopWindow.on('resize', () => {
    var size = desktopWindow.getSize();
    db.set("desktop_wh", size[0].toString() + "," + size[1].toString());
  })

  desktopWindow.on('move', () => {
    var position = desktopWindow.getPosition();
    db.set("desktop_wz", position[0].toString() + "," + position[1].toString());
  })
}

function createWindownBarDesktop() {
  /**
   * Initial window options
   */
  desktopBarWindow = new BrowserWindow({
    useContentSize: true,
    width: 88,
    height: 23,
    resizable: true,
    frame: false,
    transparent: true,
    // maximizable: false
    // y: 600,
    // x: 300
  })

  desktopBarWindow.setTouchBar(createTouchBarText())

  let webContents = desktopBarWindow.webContents;
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(1);
    webContents.setVisualZoomLevelLimits(1, 1);
    webContents.setLayoutZoomLevelLimits(0, 0);
  })

  desktopBarWindow.loadURL(desktopURL)

  desktopBarWindow.setAlwaysOnTop(true);

  desktopBarWindow.setSkipTaskbar(true);

  desktopBarWindow.on('closed', () => {
    desktopBarWindow = null
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
      let text = db.get('moyu_text');
      setText(text);
      desktopWindow.webContents.send('text', 'boss');
    }, 2000);
  }
}

let autoPageTime;

function AutoPage() {
  if (db.get('auto_page') === '1') {
    clearInterval(autoPageTime);
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

let autoStockTime;

function AutoStock() {
  let display_model = db.get('display_model');
  let display_shares_list = db.get('display_shares_list');

  if (display_model === '2') {
    clearInterval(autoStockTime);

    autoStockTime = setInterval(function () {
      stock.getData(display_shares_list, function (text) {
        updateText(text);
      })
    }, parseInt(5) * 1000);
  } else {
    clearInterval(autoStockTime);
  }
}

function updateText(text) {
  let curr_model = db.get('curr_model');

  if (curr_model === '1') {
    tray.setTitle(text);
  } else if (curr_model === '2') {
    tray.setTitle("");
    setText(text);
    if (desktopWindow != null) {
      desktopWindow.webContents.send('text', 'ping');
    }
  } else if (curr_model === '3') {
    tray.setTitle("");

    if (desktopBarWindow != null) {
      setText(osUtil.getCpu());
      desktopBarWindow.webContents.send('text', 'ping');
    }

    touchBarText.label = text;
  }
}

function NextPage() {
  let display_model = db.get('display_model');
  let display_shares_list = db.get('display_shares_list');

  if (display_model === '2') {
    stock.getData(display_shares_list, function (text) {
      updateText(text);
    })
  } else {
    let text = book.getNextPage();
    updateText(text);
  }
}

function PreviousPage() {
  let display_model = db.get('display_model');
  let display_shares_list = db.get('display_shares_list');

  if (display_model === '2') {
    stock.getData(display_shares_list, function (text) {
      updateText(text);
    })
  } else {
    let text = book.getPreviousPage();
    updateText(text);
  }
}

function BossKey(type) {
  let text = db.get('moyu_text');
  let curr_model = db.get('curr_model');

  if (curr_model === '1') {
    tray.setTitle(text);
  } else if (curr_model === '2') {
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
  } else if (curr_model === '3') {
    tray.setTitle("");

    if (desktopBarWindow != null) {
      setText(osUtil.getCpu());
      desktopBarWindow.webContents.send('text', 'ping');
    }
    // TouchBar 模式
    touchBarText.label = '🚄=[😘🐶🐱🐭🐹🐸🐯🐵🐙🐼🐨🐮🐥🦉🐍🦞🦙🐉🦂🦀🦐🐍🐢🐄🦍🦏🐓🐇🐷]';
  }
}


function checkUpdate() {
  request({
    url: "https://gitee.com/lauix/public_version/raw/master/version.txt",
    method: "GET"
  }, function (err, res, body) {
    console.log(body);
    var newVersion = parseFloat(body);

    var currVersion = 3.0
    if (newVersion > currVersion) {
      const options = {
        type: 'info',
        title: '检查更新',
        message: "发现新版本，是否更新？",
        buttons: ['是', '否']
      }
      dialog.showMessageBox(options, function (index) {
        if (index == 0) {
          shell.openExternal('https://github.com/cteamx/Thief-Book/releases')
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

var key_previousx = null;
var key_nextx = null;
var key_bossx = null;
var key_autox = null;

function createKey() {
  try {
    let xkey_previous = db.get('key_previous');
    // 如果指令有问题，则不注册
    if (!xkey_previous || xkey_previous.indexOf('+') < 0) {
      return
    }
    // 注册之前删除上一次注册的全局快捷键
    if (key_previousx != null) {
      globalShortcut.unregister(key_previousx)
    }

    key_previousx = xkey_previous
    globalShortcut.register(xkey_previous, function () {
      PreviousPage();
    })

    let xkey_next = db.get('key_next');
    // 如果指令有问题，则不注册
    if (!xkey_next || xkey_next.indexOf('+') < 0) {
      return
    }
    // 注册之前删除上一次注册的全局快捷键
    if (key_nextx != null) {
      globalShortcut.unregister(key_nextx)
    }
    key_nextx = xkey_next
    globalShortcut.register(xkey_next, function () {
      NextPage();
    })

    let xkey_boss = db.get('key_boss');
    // 如果指令有问题，则不注册
    if (!xkey_boss || xkey_boss.indexOf('+') < 0) {
      return
    }
    // 注册之前删除上一次注册的全局快捷键
    if (key_bossx != null) {
      globalShortcut.unregister(key_bossx)
    }
    key_bossx = xkey_boss
    globalShortcut.register(xkey_boss, function () {
      BossKey(2);
    })

    let xkey_auto = db.get('key_auto');
    // 如果指令有问题，则不注册
    if (!xkey_auto || xkey_auto.indexOf('+') < 0) {
      return
    }
    // 注册之前删除上一次注册的全局快捷键
    if (key_autox != null) {
      globalShortcut.unregister(key_autox)
    }
    key_autox = xkey_auto
    globalShortcut.register(xkey_auto, function () {
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
        shell.openExternal('https://github.com/cteamx/Thief-Book/blob/master/README.md')
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
        shell.openExternal('https://github.com/cteamx/Thief-Book')
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
        label: '任务栏模式',
        type: 'radio',
        checked: db.get('curr_model') === '1',
        click() {
          db.set("curr_model", "1")

          if (desktopWindow != null) {
            desktopWindow.close();
          }

          if (desktopBarWindow != null) {
            desktopBarWindow.close();
          }

          BossKey(1);
        }
      },
      {
        label: '桌面模式',
        type: 'radio',
        checked: db.get('curr_model') === '2',
        click() {
          db.set("curr_model", "2")

          if (desktopBarWindow != null) {
            desktopBarWindow.close();
          }

          if (desktopWindow === "null" || desktopWindow === "undefined" || typeof (desktopWindow) === "undefined") {
            createWindownDesktop();
          } else {

            try {
              desktopWindow.show();
            } catch (error) {
              createWindownDesktop();
            }
          }

          setTimeout(() => {
            BossKey(1);
          }, 1000);
        }
      },
      {
        label: 'TouchBar模式',
        type: 'radio',
        checked: db.get('curr_model') === '3',
        click() {
          db.set("curr_model", "3")

          if (desktopWindow != null) {
            desktopWindow.close();
          }

          if (desktopBarWindow === "null" || desktopBarWindow === "undefined" || typeof (desktopBarWindow) === "undefined") {
            createWindownBarDesktop();
          } else {

            try {
              desktopBarWindow.show();
            } catch (error) {
              createWindownBarDesktop();
            }
          }

          setTimeout(() => {
            BossKey(2);
          }, 1000);
        }
      },
    );
  } else {
  }

  menuList.push(
    {
      type: "separator"
    },
    {
      label: '小说摸鱼',
      type: 'radio',
      checked: db.get('display_model') === '1',
      click() {
        clearInterval(autoStockTime);
        db.set("display_model", "1");
        BossKey(1);
      }
    },
    {
      label: '股票摸鱼',
      type: 'radio',
      checked: db.get('display_model') === '2',
      click() {
        db.set("display_model", "2");
        let display_shares_list = db.get('display_shares_list');

        stock.getData(display_shares_list, function (text) {
          updateText(text);
          AutoStock();
        })
      }
    },
    {
      type: "separator"
    },
    {
      label: '鼠标翻页',
      type: 'checkbox',
      click(e) {
        MouseModel(e);
      }
    },
    {
      label: '自动翻页',
      type: 'checkbox',
      accelerator: db.get('key_auto'),
      checked: db.get('auto_page') === '1',
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
      label: '搜索',
      click() {
        if (soWindow === "null" || soWindow === "undefined" || typeof (soWindow) === "undefined") {
          createSoSetting();
        } else {
          try {
            soWindow.show();
          } catch (error) {
            createSoSetting();
          }
        }
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


  // tray = new Tray(nativeImage.createEmpty())
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
  tray.destroy();
  createKey();
  createTray();

  if (desktopWindow != null) {
    desktopWindow.webContents.send('bg_text_color', 'ping');
  }

  if (desktopBarWindow != null) {
    desktopBarWindow.webContents.send('bg_text_color', 'ping');
  }
})

ipcMain.on('jump_page', function () {
  NextPage();
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
  db.set("auto_page", "0");
  db.set("is_mouse", "0");

  if (isMac) {
    db.set("curr_model", "1")
  }

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