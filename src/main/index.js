import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, shell, dialog, nativeImage, TouchBar } from 'electron'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import db from './utils/db'
import book from './utils/book'
import osUtil from './utils/osUtil'
import stock from './utils/stock'
import ad from './utils/ad'
import stockMonitor from './utils/stockMonitor'
import { stripDisplayHtml, formatTrayTitle } from './utils/displayText'
import axios from 'axios'
const remoteMain = require('@electron/remote/main')

const { TouchBarButton, TouchBarSpacer } = TouchBar
const APP_USER_MODEL_ID = 'c.team.thief'

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
let webWindow;
let videoWindow;
let pdfWindow;
const isDev = process.env.NODE_ENV === 'development'

const isMac = 'darwin' === process.platform;

function resolveRendererURL(routePath) {
    if (isDev) {
        return `http://localhost:9080/#/${routePath}`
    }

    const candidates = [
        path.resolve(__dirname || '.', 'index.html'),
        path.join(process.resourcesPath || '', 'app.asar', 'dist', 'electron', 'index.html'),
        path.join(process.resourcesPath || '', 'app', 'dist', 'electron', 'index.html'),
        path.join(process.cwd(), 'dist', 'electron', 'index.html')
    ]

    for (const filePath of candidates) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                return `${pathToFileURL(filePath).toString()}#/${routePath}`
            }
        } catch (_) {}
    }

    return `file://${path.resolve('index.html')}#/${routePath}`
}

const soURL = resolveRendererURL('so')

const settingURL = resolveRendererURL('setting')

const desktopURL = resolveRendererURL('desktop')

const webURL = resolveRendererURL('web')

const videoURL = resolveRendererURL('video')

const pdfURL = resolveRendererURL('pdf')

function resolveStaticAsset(fileName) {
    const candidates = [
        typeof __static !== 'undefined' ? path.join(__static, fileName) : null,
        path.join(__dirname, 'static', fileName),
        path.join(process.cwd(), 'static', fileName),
        path.join(process.resourcesPath || '', 'app', 'dist', 'electron', 'static', fileName),
        path.join(process.resourcesPath || '', 'app.asar', 'dist', 'electron', 'static', fileName),
        path.join(process.resourcesPath || '', 'static', fileName)
    ].filter(Boolean)

    for (const filePath of candidates) {
        try {
            if (fs.existsSync(filePath)) {
                return filePath
            }
        } catch (_) {}
    }
    return null
}

function loadAppIconImage() {
    const iconPath = resolveStaticAsset('icon.png')
    if (iconPath) {
        const image = nativeImage.createFromPath(iconPath)
        if (!image.isEmpty()) {
            return image
        }
    }
    return nativeImage.createEmpty()
}

function loadTrayImage() {
    const trayPath = resolveStaticAsset(process.platform === 'darwin' ? 'mac.png' : 'win.png') || resolveStaticAsset('icon.png')
    if (trayPath) {
        const image = nativeImage.createFromPath(trayPath)
        if (!image.isEmpty()) {
            return image
        }
    }
    return loadAppIconImage()
}

function withWindowIcon(options) {
    const icon = loadAppIconImage()
    if (!icon.isEmpty()) {
        return Object.assign({}, options, { icon })
    }
    return options
}

function setTrayTitleSafe(title = '') {
    if (!tray) {
        return
    }
    try {
        tray.setTitle(formatTrayTitle(title))
    } catch (_) {}
}

function normalizeAccelerator(value) {
    if (typeof value !== 'string') {
        return undefined
    }
    const x = value.trim()
    return x.includes('+') ? x : undefined
}

function attachWindowDebug(windowName, win) {
    const debugEnabled = process.env.NODE_ENV === 'development' || process.env.THIEF_DEBUG === '1'
    if (!debugEnabled || !win || !win.webContents) {
        return
    }

    win.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
        console.error(`[${windowName}] did-fail-load`, { errorCode, errorDescription, validatedURL })
    })

    win.webContents.on('render-process-gone', (_, details) => {
        console.error(`[${windowName}] render-process-gone`, details)
    })

    win.webContents.on('console-message', (_, level, message, line, sourceId) => {
        console.log(`[${windowName}] console-message`, { level, message, line, sourceId })
    })
}

function lockWebContentsZoom(webContents, windowName) {
    if (!webContents) {
        return
    }

    try {
        if (typeof webContents.setZoomFactor === 'function') {
            webContents.setZoomFactor(1)
        }
        if (typeof webContents.setVisualZoomLevelLimits === 'function') {
            webContents.setVisualZoomLevelLimits(1, 1)
        }
        if (typeof webContents.setLayoutZoomLevelLimits === 'function') {
            webContents.setLayoutZoomLevelLimits(0, 0)
        } else if (isDev) {
            console.log(`[${windowName}] setLayoutZoomLevelLimits is unavailable on this Electron version`)
        }
    } catch (error) {
        console.error(`[${windowName}] lock zoom failed`, error)
    }
}

async function init() {
    remoteMain.initialize()
    if (process.platform === 'win32') {
        app.setAppUserModelId(APP_USER_MODEL_ID)
    }
    app.on('browser-window-created', (_, window) => {
        remoteMain.enable(window.webContents)
    })

    Menu.setApplicationMenu(null);

    // 初始化临时配置
    db.set("auto_page", "0");
    db.set("is_mouse", "0");

    // 初始化股票数据缓存
    (async () => {
        try {
            await stock.initializeStockCache();
            console.log('股票数据缓存初始化完成');
        } catch (error) {
            console.error('股票数据缓存初始化失败:', error);
        }
    })();

    // 启动股票监控
    if (await db.get("limit_up_alert_enabled")) {
        stockMonitor.startMonitoring();
    }

    if (isMac) {
        createSetting();

        if (await db.get('curr_model') === '2') {
            createWindownDesktop();

            setTimeout(() => {
                BossKey(1);
            }, 1000);
        } else if (await db.get('curr_model') === '3') {
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

    setTimeout(() => {
        if (!settingWindow) {
            createWindownSetting(false);
        }
    }, 1500);
}

function createVideo() {
    /**
     * Initial window options
     */
    var frame = true;
    if (isMac) {
        frame = false;
    }

    videoWindow = new BrowserWindow(withWindowIcon({
        useContentSize: true,
        width: 478,
        height: 28,
        maximizable: false,
        minimizable: false,
        transparent: true,
        resizable: true,
        frame: frame,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    }))

    let webContents = videoWindow.webContents;
    attachWindowDebug('videoWindow', videoWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'videoWindow')
    })

    videoWindow.loadURL(videoURL)

    videoWindow.setOpacity(1.0)

    videoWindow.setAlwaysOnTop(true);
    videoWindow.setSkipTaskbar(!isDev);

    videoWindow.on('closed', () => {
        videoWindow = null
    })
}

function createPdf() {
    /**
     * Initial window options
     */

    var frame = true;
    if (isMac) {
        frame = false;
    }

    pdfWindow = new BrowserWindow(withWindowIcon({
        useContentSize: true,
        width: 478,
        height: 28,
        maximizable: false,
        minimizable: false,
        transparent: true,
        resizable: true,
        frame: frame,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    }))

    let webContents = pdfWindow.webContents;
    attachWindowDebug('pdfWindow', pdfWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'pdfWindow')
    })

    pdfWindow.loadURL(pdfURL)

    pdfWindow.setOpacity(1.0)

    pdfWindow.setAlwaysOnTop(true);
    pdfWindow.setSkipTaskbar(!isDev);

    pdfWindow.on('closed', () => {
        pdfWindow = null
    })
}

function createWeb() {
    /**
     * Initial window options
     */

    var frame = true;
    if (isMac) {
        frame = false;
    }

    webWindow = new BrowserWindow(withWindowIcon({
        useContentSize: true,
        width: 478,
        height: 28,
        maximizable: false,
        minimizable: false,
        transparent: true,
        resizable: true,
        frame: frame,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        },
    }))

    let webContents = webWindow.webContents;
    attachWindowDebug('webWindow', webWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'webWindow')
    })

    webWindow.loadURL(webURL)

    webWindow.setOpacity(1.0)

    webWindow.setAlwaysOnTop(true);
    webWindow.setSkipTaskbar(!isDev);

    webWindow.on('closed', () => {
        webWindow = null
    })
}

function createSoSetting() {
    /**
     * Initial window options
     */

    soWindow = new BrowserWindow(withWindowIcon({
        title: '搜 索',
        useContentSize: true,
        width: 334,
        height: 540,
        // resizable: false,
        maximizable: false,
        minimizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    }))

    let webContents = soWindow.webContents;
    attachWindowDebug('soWindow', soWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'soWindow')
    })

    soWindow.loadURL(soURL)

    soWindow.on('closed', () => {
        soWindow = null
    })
}


function createWindownSetting(showWhenReady = true) {
    /**
     * Initial window options
     */
    settingWindow = new BrowserWindow(withWindowIcon({
        show: false,
        title: '设 置',
        useContentSize: true,
        width: 780,
        height: 680,
        resizable: true,
        maximizable: false,
        minimizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    }))

    let webContents = settingWindow.webContents;
    attachWindowDebug('settingWindow', settingWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'settingWindow')
    })
    settingWindow.once('ready-to-show', () => {
        if (showWhenReady && settingWindow) {
            settingWindow.show()
        }
    })

    settingWindow.loadURL(settingURL)
    if (process.env.THIEF_DEBUG === '1') {
        settingWindow.webContents.openDevTools({ mode: 'detach' })
    }

    settingWindow.on('closed', () => {
        settingWindow = null
    })
}

async function createWindownDesktop() {
    /**
     * Initial window options
     */

    var width = 856;
    var height = 47;
    var x = 356;
    var y = 429;

    var desktop_wh = await db.get('desktop_wh');
    var desktop_wz = await db.get('desktop_wz');

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

    desktopWindow = new BrowserWindow(withWindowIcon({
        useContentSize: true,
        width: width,
        height: height,
        resizable: true,
        frame: false,
        transparent: true,
        hasShadow: false,
        y: x,
        x: y,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    }))

    let webContents = desktopWindow.webContents;
    attachWindowDebug('desktopWindow', desktopWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'desktopWindow')
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
    desktopBarWindow = new BrowserWindow(withWindowIcon({
        useContentSize: true,
        width: 88,
        height: 23,
        resizable: true,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        // maximizable: false
        // y: 600,
        // x: 300
    }))

    desktopBarWindow.setTouchBar(createTouchBarText())

    let webContents = desktopBarWindow.webContents;
    attachWindowDebug('desktopBarWindow', desktopBarWindow)
    webContents.on('did-finish-load', () => {
        lockWebContentsZoom(webContents, 'desktopBarWindow')
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

function sendDesktopText(message = 'ping') {
    if (desktopWindow != null && desktopWindow.webContents) {
        const text = global.text && typeof global.text.text !== 'undefined' ? global.text.text : ''
        desktopWindow.webContents.send('text', { message, text })
    }
}

async function MouseModel(e) {
    if (desktopWindow != null) {
        if (e.checked == true) {
            db.set("is_mouse", "1")
        } else {
            db.set("is_mouse", "0")
        }

        desktopWindow.reload();

        setTimeout(async () => {
            let text = await db.get('moyu_text');
            setText(text);
            sendDesktopText('boss');
        }, 2000);
    }
}

let autoPageTime;

async function AutoPage() {
    if (await db.get('auto_page') === '1') {
        clearInterval(autoPageTime);
        db.set("auto_page", "0")
        var second = await db.get('second');
        autoPageTime = setInterval(function() {
            NextPage();
        }, parseInt(second) * 1000);
    } else if (await db.get('auto_page') === '0') {
        db.set("auto_page", "1")
        clearInterval(autoPageTime);
    }
}

let autoStockTime;

async function AutoStock() {
    // debugger;
    let display_model = await db.get('display_model');

    if (display_model === '2') {
        clearInterval(autoStockTime);
        autoStockTime = setInterval(function() {
            const display_shares_list = db.get('display_shares_list');
            stock.getData(display_shares_list, function(text) {
                updateText(text);
            })
        }, 500);
    } else {
        clearInterval(autoStockTime);
    }
}

async function refreshCurrentDisplay() {
    const display_model = await db.get('display_model');
    if (display_model === '2') {
        const display_shares_list = await db.get('display_shares_list');
        stock.getData(display_shares_list, function(text) {
            updateText(text);
            AutoStock();
        });
    } else {
        BossKey(1);
    }
}

async function updateText(text) {
    let curr_model = await db.get('curr_model');
    if (curr_model === '1') {
        setTrayTitleSafe(text);
    } else if (curr_model === '2') {
        setTrayTitleSafe("");
        setText(text);
        if (desktopWindow != null) {
            sendDesktopText('ping');
        }
    } else if (curr_model === '3') {
        setTrayTitleSafe("");

        if (desktopBarWindow != null) {
            setText(osUtil.getCpu());
            desktopBarWindow.webContents.send('text', 'ping');
        }

        touchBarText.label = stripDisplayHtml(text);
    }
}

async function NextPage() {
    let display_model = await db.get('display_model');
    let display_shares_list = await db.get('display_shares_list');

    if (display_model === '2') {
        stock.getData(display_shares_list, function(text) {
            updateText(text);
        })
    } else {
        let text = book.getNextPage();
        updateText(text);
    }
}

async function PreviousPage() {
    let display_model = await db.get('display_model');
    let display_shares_list = await db.get('display_shares_list');

    if (display_model === '2') {
        stock.getData(display_shares_list, function(text) {
            updateText(text);
        })
    } else {
        let text = book.getPreviousPage();
        updateText(text);
    }
}

async function BossKey(type) {
    let text = await db.get('moyu_text');
    let curr_model = await db.get('curr_model');
    let is_ad = await db.get('is_ad');

    if (curr_model === '1') {
        if (is_ad === "") {
            ad.getAd(function(x) {
                if (x === "err") {
                    setTrayTitleSafe(text);
                } else {
                    setTrayTitleSafe(x);
                    var timex = new Date().getTime()
                    db.set("is_ad", timex);
                }
            })
        } else {
            var timex = new Date().getTime()
            if (timex - is_ad >= 28800000) {
                ad.getAd(function(x) {
                    if (x === "err") {
                        setTrayTitleSafe(text);
                    } else {
                        setTrayTitleSafe(x);
                        var timex = new Date().getTime()
                        db.set("is_ad", timex);
                    }
                })
            } else {
                setTrayTitleSafe(text);
            }
        }

    } else if (curr_model === '2') {
        setTrayTitleSafe("");
        setText(text);

        if (is_ad === "") {
            ad.getAd(function(x) {
                if (x === "err") {
                    setText(text);
                    sendDesktopText(type === 1 ? 'boss' : 'ping');
                } else {
                    setText(x);
                    sendDesktopText(type === 1 ? 'boss' : 'ping');
                    var timex = new Date().getTime()
                    db.set("is_ad", timex);
                }
            })
        } else {
            var timex = new Date().getTime()
            if (timex - is_ad >= 28800000) {
                ad.getAd(function(x) {
                    if (x === "err") {
                        setText(text);
                        sendDesktopText(type === 1 ? 'boss' : 'ping');
                    } else {
                        setText(x);
                        sendDesktopText(type === 1 ? 'boss' : 'ping');
                        var timex = new Date().getTime()
                        db.set("is_ad", timex);
                    }
                })
            } else {
                setText(text);
                sendDesktopText(type === 1 ? 'boss' : 'ping');
            }
        }

        if (desktopWindow != null) {
            if (type === 1) {
                sendDesktopText('boss');
            } else if (type === 2) {
                {
                    if (desktopWindow.isVisible()) {
                        desktopWindow.hide();
                    } else {
                        desktopWindow.show();
                    }
                }
            }
        }
    } else if (curr_model === '3') {
        setTrayTitleSafe("");

        if (desktopBarWindow != null) {
            setText(osUtil.getCpu());
            desktopBarWindow.webContents.send('text', 'ping');
        }
        // TouchBar 模式
        touchBarText.label = '🚄=[😘🐶🐱🐭🐹🐸🐯🐵🐙🐼🐨🐮🐥🦉🐍🦞🦙🐉🦂🦀🦐🐍🐢🐄🦍🦏🐓🐇🐷]';
    }

    if (webWindow != null) {
        {
            if (webWindow.isVisible()) {
                webWindow.hide();
            } else {
                webWindow.show();
            }
        }
    }

    if (pdfWindow != null) {
        {
            if (pdfWindow.isVisible()) {
                pdfWindow.hide();
            } else {
                pdfWindow.show();
            }
        }
    }

    if (videoWindow != null) {
        {
            if (videoWindow.isVisible()) {
                videoWindow.hide();
            } else {
                videoWindow.show();
            }
        }
    }
}


function checkUpdate() {
    axios.get("https://gitee.com/lauix/public_version/raw/master/version.txt", {
        timeout: 10000,
        responseType: 'text'
    }).then(function(response) {
        const body = typeof response.data === 'string' ? response.data : String(response.data)
        const image = loadAppIconImage()

        var newVersion = parseFloat(body);

        var currVersion = 4.0
        if (newVersion > currVersion) {
            const options = {
                type: 'info',
                title: '检查更新',
                message: "发现新版本，是否更新？",
                buttons: ['是', '否'],
                icon: image
            }
            dialog.showMessageBox(options, function(index) {
                if (index == 0) {
                    shell.openExternal('https://github.com/cteamx/Thief/releases')
                }
            })
        } else {
            const options = {
                type: 'info',
                title: '检查更新',
                message: "当前为最新版本",
                buttons: ['确认'],
                icon: image
            }
            dialog.showMessageBox(options)
        }
    }).catch(function() {
        // ignore update check errors
    })
}

function Exit() {
    app.quit();
}

var key_previousx = null;
var key_nextx = null;
var key_bossx = null;
var key_autox = null;

async function createKey() {
    try {
        let xkey_previous = await db.get('key_previous');
        // 如果指令有问题，则不注册
        if (!xkey_previous || xkey_previous.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_previousx != null) {
            globalShortcut.unregister(key_previousx)
        }

        key_previousx = xkey_previous
        globalShortcut.register(xkey_previous, function() {
            PreviousPage();
        })

        let xkey_next = await db.get('key_next');
        // 如果指令有问题，则不注册
        if (!xkey_next || xkey_next.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_nextx != null) {
            globalShortcut.unregister(key_nextx)
        }
        key_nextx = xkey_next
        globalShortcut.register(xkey_next, function() {
            NextPage();
        })

        let xkey_boss = await db.get('key_boss');
        // 如果指令有问题，则不注册
        if (!xkey_boss || xkey_boss.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_bossx != null) {
            globalShortcut.unregister(key_bossx)
        }
        key_bossx = xkey_boss
        globalShortcut.register(xkey_boss, function() {
            BossKey(2);
        })

        let xkey_auto = await db.get('key_auto');
        // 如果指令有问题，则不注册
        if (!xkey_auto || xkey_auto.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_autox != null) {
            globalShortcut.unregister(key_autox)
        }
        key_autox = xkey_auto
        globalShortcut.register(xkey_auto, function() {
            AutoPage();
        })
    } catch (error) {
        console.error('Global shortcut registration failed:', error);
        const image = loadAppIconImage()

        const options = {
            type: 'info',
            title: '快捷键异常',
            message: "设置快捷键错误，请看文档异常汇总！",
            buttons: ['打开文档', '否'],
            icon: image
        }
        dialog.showMessageBox(options, function(index) {
            if (index == 0) {
                shell.openExternal('https://thief.im/#/use?id=%e5%bc%82%e5%b8%b8%e6%b1%87%e6%80%bb')
            }
        })

        // Keep app running even if shortcuts fail to register.
        // User can still use tray menu to open settings and fix invalid shortcuts.
    }

    globalShortcut.register('CommandOrControl+Alt+X', function() {
        Exit();
    })
}

async function createTray(refreshDisplay = true) {
    if (tray) {
        try {
            tray.destroy()
        } catch (_) {}
        tray = null
    }

    var menuList = [];
    menuList.push({
        label: '关于',
        click() {
            const image = loadAppIconImage()

            const options = {
                type: 'info',
                title: '关于',
                message: "Thief 是一款真正的创新摸鱼神器\n\n版本：4.0\n\n作者：三斤\n\n邮箱：lauixData@gmail.com",
                buttons: ['确认'],
                icon: image
            }
            dialog.showMessageBox(options)
        }
    }, {
        label: 'Thief官网',
        click() {
            shell.openExternal('https://thief.im')
        }
    }, {
        label: '使用文档',
        click() {
            shell.openExternal('https://thief.im/docs')
        }
    }, {
        label: '检查更新',
        click() {
            checkUpdate();
        }
    });

    if (isMac) {
        menuList.push({
            type: "separator"
        }, {
            label: '任务栏模式',
            type: 'radio',
            checked: (await db.get('curr_model')) === '1',
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
        }, {
            label: '桌面模式',
            type: 'radio',
            checked: (await db.get('curr_model')) === '2',
            click() {
                db.set("curr_model", "2")

                if (desktopBarWindow != null) {
                    desktopBarWindow.close();
                }

                if (desktopWindow === "null" || desktopWindow === "undefined" || typeof(desktopWindow) === "undefined") {
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
        }, {
            label: 'TouchBar模式',
            type: 'radio',
            checked: (await db.get('curr_model')) === '3',
            click() {
                db.set("curr_model", "3")

                if (desktopWindow != null) {
                    desktopWindow.close();
                }

                if (desktopBarWindow === "null" || desktopBarWindow === "undefined" || typeof(desktopBarWindow) === "undefined") {
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
        }, );
    } else {}

    menuList.push({
        type: "separator"
    }, {
        label: '小说摸鱼',
        type: 'radio',
        checked: (await db.get('display_model')) === '1',
        click() {
            clearInterval(autoStockTime);
            db.set("display_model", "1");
            BossKey(1);
        }
    }, {
        label: '股票摸鱼',
        type: 'radio',
        checked: (await db.get('display_model')) === '2',
        click: async () => {
            db.set("display_model", "2");
            refreshCurrentDisplay();
        }
    }, {
        type: "separator"
    }, {
        label: '网页摸鱼',
        click() {
            if (webWindow === "null" || webWindow === "undefined" || typeof(webWindow) === "undefined") {
                createWeb();
            } else {
                try {
                    webWindow.show();
                } catch (error) {
                    createWeb();
                }
            }
        }
    }, {
        label: '视频摸鱼',
        click() {
            if (videoWindow === "null" || videoWindow === "undefined" || typeof(videoWindow) === "undefined") {
                createVideo();
            } else {
                try {
                    videoWindow.show();
                } catch (error) {
                    createVideo();
                }
            }
        }
    }, {
        label: 'PDF摸鱼',
        click() {
            if (pdfWindow === "null" || pdfWindow === "undefined" || typeof(pdfWindow) === "undefined") {
                createPdf();
            } else {
                try {
                    pdfWindow.show();
                } catch (error) {
                    createPdf();
                }
            }
        }
    }, {
        type: "separator"
    }, {
        label: '鼠标翻页',
        type: 'checkbox',
        click(e) {
            MouseModel(e);
        }
    }, {
        label: '自动翻页',
        type: 'checkbox',
        accelerator: normalizeAccelerator(await db.get('key_auto')),
        checked: (await db.get('auto_page')) === '1',
        click() {
            AutoPage();
        }
    }, {
        label: '上一页',
        accelerator: normalizeAccelerator(await db.get('key_previous')),
        click() {
            PreviousPage();
        }
    }, {
        label: '下一页',
        accelerator: normalizeAccelerator(await db.get('key_next')),
        click() {
            NextPage();
        }
    }, {
        label: '老板键',
        accelerator: normalizeAccelerator(await db.get('key_boss')),
        click() {
            BossKey(2);
        }
    }, {
        type: "separator"
    }, {
        label: '搜索内容',
        click() {
            if (soWindow === "null" || soWindow === "undefined" || typeof(soWindow) === "undefined") {
                createSoSetting();
            } else {
                try {
                    soWindow.show();
                } catch (error) {
                    createSoSetting();
                }
            }
        }
    }, {
        label: '设置',
        click() {
            if (settingWindow === "null" || settingWindow === "undefined" || typeof(settingWindow) === "undefined") {
                createWindownSetting();
            } else {
                try {
                    settingWindow.show();
                } catch (error) {
                    createWindownSetting();
                }
            }
        }
    }, {
        type: "separator"
    }, {
        accelerator: 'CommandOrControl+Alt+X',
        label: '退出',
        click() {
            Exit();
        }
    });

    try {
        tray = new Tray(loadTrayImage())
    } catch (error) {
        console.error('Failed to create tray with preferred icon:', error)
        try {
            tray = new Tray(loadAppIconImage())
        } catch (fallbackError) {
            console.error('Failed to create tray with fallback icon:', fallbackError)
            return
        }
    }
    tray.setToolTip('Thief')
    try {
        tray.setContextMenu(Menu.buildFromTemplate(menuList))
    } catch (error) {
        console.error('Failed to build tray menu template:', error)
    }
    if (refreshDisplay) {
        BossKey();
    }
}

function createSetting() {
    if (isMac) {
        app.dock.hide();
    } else {
        // 
    }
}

ipcMain.on('bg_text_color', async function() {
    console.log('主进程收到bg_text_color事件');
    
    // 读取最新的颜色配置
    const colorConfig = {
        bg_color: await db.get("bg_color"),
        txt_color: await db.get("txt_color"),
        font_size: await db.get("font_size")
    };
    
    console.log('读取到的最新颜色配置:', colorConfig);
    
    // Keep save fast: color/font updates do not need tray recreation.

    // 重新启动或停止股票监控

    if (desktopWindow != null) {
        console.log('向desktopWindow发送bg_text_color消息，携带颜色配置');
        desktopWindow.webContents.send('bg_text_color', colorConfig);
    } else {
        console.log('desktopWindow为null，无法发送消息');
    }

    if (desktopBarWindow != null) {
        console.log('向desktopBarWindow发送bg_text_color消息，携带颜色配置');
        desktopBarWindow.webContents.send('bg_text_color', colorConfig);
    } else {
        console.log('desktopBarWindow为null，无法发送消息');
    }
})

ipcMain.on('jump_page', function() {
    NextPage();
})

ipcMain.on('MouseAction', function(e, v) {
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

ipcMain.on('webOpacity', function(e, v) {
    if (webWindow != null) {
        var num = webWindow.getOpacity();

        if (v == "-") {
            if (num <= 0.2) {
                webWindow.setOpacity(0.1);
            } else {
                num = num - 0.1
                webWindow.setOpacity(num);
            }
        } else if (v == "+") {
            if (num >= 1.0) {
                webWindow.setOpacity(1.0);
            } else {
                num = num + 0.1
                webWindow.setOpacity(num);
            }
        } else if (v == "exit") {
            if (webWindow != null) {
                webWindow.close();
            }
        } else if (v === "change") {
            if (webWindow != null) {
                var x = webWindow.getSize();
                if (x[1] <= 100) {
                    webWindow.setSize(715, 500);
                    webWindow.center();
                }
            }
        }
    }
})

ipcMain.on('pdfOpacity', function(e, v) {
    if (pdfWindow != null) {
        var num = pdfWindow.getOpacity();

        if (v == "-") {
            if (num <= 0.2) {
                pdfWindow.setOpacity(0.1);
            } else {
                num = num - 0.1
                pdfWindow.setOpacity(num);
            }
        } else if (v == "+") {
            if (num >= 1.0) {
                pdfWindow.setOpacity(1.0);
            } else {
                num = num + 0.1
                pdfWindow.setOpacity(num);
            }
        } else if (v == "exit") {
            if (pdfWindow != null) {
                pdfWindow.close();
            }
        } else if (v === "change") {
            if (pdfWindow != null) {
                var x = pdfWindow.getSize();
                if (x[1] <= 100) {
                    pdfWindow.setSize(715, 500);
                    pdfWindow.center();
                }
            }
        }
    }
})

ipcMain.on('videoOpacity', function(e, v) {
    if (videoWindow != null) {
        var num = videoWindow.getOpacity();

        if (v == "-") {
            if (num <= 0.2) {
                videoWindow.setOpacity(0.1);
            } else {
                num = num - 0.1
                videoWindow.setOpacity(num);
            }
        } else if (v == "+") {
            if (num >= 1.0) {
                videoWindow.setOpacity(1.0);
            } else {
                num = num + 0.1
                videoWindow.setOpacity(num);
            }
        } else if (v == "exit") {
            if (videoWindow != null) {
                videoWindow.close();
            }
        } else if (v === "change") {
            if (videoWindow != null) {
                var x = videoWindow.getSize();
                if (x[1] <= 100) {
                    videoWindow.setSize(715, 500);
                    videoWindow.center();
                }
            }
        }
    }
})

// 配置导入导出处理
ipcMain.on('export-config', (event, path) => {
    const result = db.exportConfig(path);
    event.sender.send('export-config-result', result);
});

ipcMain.on('import-config', (event, path) => {
    const result = db.importConfig(path);
    event.sender.send('import-config-result', result);
});

// 处理股票监控更新
ipcMain.on('reload_shortcuts_and_tray', async () => {
    await createKey();
    await createTray(false);
});

ipcMain.handle('save_config', async (_event, configData) => {
    try {
        const success = await db.setBatchAsync(configData);
        return { success };
    } catch (error) {
        console.error('save_config failed:', error);
        return {
            success: false,
            message: error.message
        };
    }
});

ipcMain.on('update_stock_monitor', (event, enabled) => {
    console.log('更新股票监控状态:', enabled);
    
    // 使用重启方法来确保配置更新
    stockMonitor.restartMonitoring();
});

ipcMain.on('refresh_current_display', () => {
    console.log('刷新当前显示内容');
    refreshCurrentDisplay();
});

// 处理股票数据刷新
ipcMain.on('refresh_stock_data', async (event) => {
    try {
        console.log('开始刷新股票数据...');
        const count = await stock.refreshStockData();
        event.sender.send('refresh_stock_data_result', {
            success: true,
            count: count,
            message: `成功获取 ${count} 条股票数据`
        });
    } catch (error) {
        console.error('刷新股票数据失败:', error);
        event.sender.send('refresh_stock_data_result', {
            success: false,
            message: `刷新失败: ${error.message}`
        });
    }
});

// 获取股票缓存信息
ipcMain.on('get_stock_cache_info', async (event) => {
    try {
        const info = await stock.getStockCacheInfo();
        event.sender.send('get_stock_cache_info_result', {
            success: true,
            data: info
        });
    } catch (error) {
        console.error('获取股票缓存信息失败:', error);
        event.sender.send('get_stock_cache_info_result', {
            success: false,
            message: error.message
        });
    }
});

ipcMain.handle('search_stock_codes', async (_event, query) => {
    try {
        await stock.initializeStockCache();
        const data = stock.searchStocks(typeof query === 'string' ? query : '');
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('search_stock_codes failed:', error);
        return {
            success: false,
            data: [],
            message: error.message
        };
    }
});



// const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
//   // Someone tried to run a second instance, we should focus our window.
//   if (desktopWindow) {
//     if (desktopWindow.isMinimized()) desktopWindow.restore()
//     desktopWindow.focus()
//   }
// })

// if (shouldQuit) {
//   app.quit()
// }

// 应用启动时初始化
app.on('ready', init)

app.on('window-all-closed', () => {
    try {
        // 重置临时配置
        db.set("auto_page", "0");
        db.set("is_mouse", "0");

        if (isMac) {
            db.set("curr_model", "1");
        }
        
        // 确保配置变更被保存并备份
        db.createBackup();
        
        console.log('Configuration saved successfully before exit');
    } catch (err) {
        console.error('Error saving configuration on exit:', err);
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
