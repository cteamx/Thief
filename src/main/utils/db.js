'use strict';

import path from 'path'
import fsExtra from 'fs-extra'
import { app } from 'electron'

const EXTERNAL_STORAGE_KEYS = {
  stock_code_mapping: 'thief_stock_cache.json'
}

const defaultConfig = {
  current_page: 1,
  page_size: 20,
  is_english: false,
  line_break: ' ',
  current_file_path: '',
  bg_color: 'rgba(0, 0, 0, 0.5)',
  txt_color: '#fff',
  font_size: '14',
  second: '5',
  auto_page: '0',
  key_next: 'Alt+2',
  key_previous: 'Alt+1',
  key_boss: 'Alt+3',
  key_auto: 'Alt+P',
  errCodeChecked: false,
  is_mouse: '0',
  is_display_page: true,
  is_display_buy1_amount: true,
  is_display_stock_item_data: true,
  is_display_stock_today_profit: true,
  is_display_stock_holding_profit: true,
  is_display_stock_profit_label: true,
  stock_profit_separator: '/',
  is_display_stock_total_today_profit: false,
  is_display_stock_total_holding_profit: false,
  stock_color_mode: 'red_up_green_down',
  display_model: '1',
  display_shares_list: [],
  moyu_text: 'Hello',
  desktop_wh: '',
  desktop_wz: '',
  is_ad: 0,
  limit_up_alert_enabled: true,
  dingtalk_webhook: 'https://oapi.dingtalk.com/robot/send?access_token=075525de2be812c31c727e4ac783ed2969cf9c8e05974aa2db0d630ac88e95e2',
  at_phone_numbers: ['17195252748'],
  curr_model: process.platform === 'darwin' ? '1' : '2',
  stock_code_mapping: {},
  stock_cache_update_time: null
}

function cloneDefaultValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.parse(JSON.stringify(value))
  }
  return value
}

function isExternalStorageKey(key) {
  return Object.prototype.hasOwnProperty.call(EXTERNAL_STORAGE_KEYS, key)
}

function getElectronApp() {
  if (process.type === 'renderer') {
    const remote = require('@electron/remote')
    return remote.app
  }
  return app
}

function safeReadJson(filePath) {
  try {
    if (!fsExtra.existsSync(filePath)) return null
    return JSON.parse(fsExtra.readFileSync(filePath, 'utf8'))
  } catch (_) {
    return null
  }
}

export default {
  initialized: false,
  STORE_PATH: '',
  filePath: '',
  backupFilePath: '',
  externalFilePaths: {},
  externalData: {},
  data: {},
  defaultConfig,

  init() {
    if (this.initialized) return true

    try {
      const APP = getElectronApp()
      this.STORE_PATH = APP.getPath('userData')
      fsExtra.ensureDirSync(this.STORE_PATH)

      this.filePath = path.join(this.STORE_PATH, 'thief_data.json')
      this.backupFilePath = path.join(this.STORE_PATH, 'thief_data_backup.json')
      this.externalFilePaths = Object.fromEntries(
        Object.entries(EXTERNAL_STORAGE_KEYS).map(([key, fileName]) => [
          key,
          path.join(this.STORE_PATH, fileName)
        ])
      )

      let json = safeReadJson(this.filePath)
      if (!json) {
        json = safeReadJson(this.backupFilePath)
      }
      if (!json || typeof json !== 'object') {
        json = {}
      }

      const legacyExternalData = {}
      Object.keys(EXTERNAL_STORAGE_KEYS).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(json, key)) {
          legacyExternalData[key] = json[key]
          delete json[key]
        }
      })

      this.data = Object.assign({}, this.defaultConfig, json)

      Object.keys(EXTERNAL_STORAGE_KEYS).forEach((key) => {
        const externalJson = safeReadJson(this.externalFilePaths[key])
        if (externalJson !== null && externalJson !== undefined) {
          this.externalData[key] = externalJson
        } else if (Object.prototype.hasOwnProperty.call(legacyExternalData, key)) {
          this.externalData[key] = legacyExternalData[key]
          this.persistExternalKey(key)
        } else {
          this.externalData[key] = cloneDefaultValue(this.defaultConfig[key])
        }
      })

      this.persist()
      this.createBackup()
      this.initialized = true
      return true
    } catch (err) {
      console.error('Database initialization error:', err)
      return false
    }
  },

  createBackup() {
    try {
      if (this.filePath && fsExtra.existsSync(this.filePath)) {
        fsExtra.copyFileSync(this.filePath, this.backupFilePath)
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to create config backup:', err)
      return false
    }
  },

  serializeData() {
    const serialized = Object.assign({}, this.data)
    Object.keys(EXTERNAL_STORAGE_KEYS).forEach((key) => {
      delete serialized[key]
    })
    return serialized
  },

  persist() {
    fsExtra.writeFileSync(this.filePath, JSON.stringify(this.serializeData(), null, 2), 'utf8')
  },

  persistExternalKey(key) {
    if (!isExternalStorageKey(key)) {
      return
    }
    fsExtra.writeFileSync(this.externalFilePaths[key], JSON.stringify(this.externalData[key], null, 2), 'utf8')
  },

  get(key) {
    if (!this.initialized && !this.init()) {
      return this.defaultConfig[key]
    }
    if (isExternalStorageKey(key)) {
      return this.externalData[key] !== undefined ? this.externalData[key] : cloneDefaultValue(this.defaultConfig[key])
    }
    return this.data[key] !== undefined ? this.data[key] : this.defaultConfig[key]
  },

  set(key, value) {
    try {
      if (!this.initialized && !this.init()) return false
      if (isExternalStorageKey(key)) {
        this.externalData[key] = value
        this.persistExternalKey(key)
        return true
      }
      this.data[key] = value
      this.persist()
      this.createBackup()
      return true
    } catch (err) {
      console.error(`Error setting config '${key}':`, err)
      return false
    }
  },

  setBatch(configMap) {
    try {
      if (!this.initialized && !this.init()) return false
      let shouldPersistMain = false
      Object.entries(configMap).forEach(([key, value]) => {
        if (isExternalStorageKey(key)) {
          this.externalData[key] = value
          this.persistExternalKey(key)
        } else {
          this.data[key] = value
          shouldPersistMain = true
        }
      })
      if (shouldPersistMain) {
        this.persist()
        this.createBackup()
      }
      return true
    } catch (err) {
      console.error('Error setting batch config:', err)
      return false
    }
  },

  resetToDefault() {
    try {
      if (!this.initialized && !this.init()) return false
      this.data = Object.assign({}, this.defaultConfig)
      Object.keys(EXTERNAL_STORAGE_KEYS).forEach((key) => {
        this.externalData[key] = cloneDefaultValue(this.defaultConfig[key])
        this.persistExternalKey(key)
      })
      this.persist()
      this.createBackup()
      return true
    } catch (err) {
      console.error('Failed to reset config to defaults:', err)
      return false
    }
  },

  resetKeyToDefault(key) {
    if (key in this.defaultConfig) {
      return this.set(key, this.defaultConfig[key])
    }
    return false
  },

  exportConfig(targetPath) {
    try {
      if (!this.initialized && !this.init()) {
        return { success: false, message: '\u6570\u636e\u5e93\u521d\u59cb\u5316\u5931\u8d25' }
      }
      fsExtra.writeFileSync(targetPath, JSON.stringify(this.serializeData(), null, 2), 'utf8')
      return { success: true, message: '\u914d\u7f6e\u5bfc\u51fa\u6210\u529f' }
    } catch (err) {
      return { success: false, message: `\u5bfc\u51fa\u5931\u8d25: ${err.message}` }
    }
  },

  importConfig(sourcePath) {
    try {
      if (!this.initialized && !this.init()) {
        return { success: false, message: '\u6570\u636e\u5e93\u521d\u59cb\u5316\u5931\u8d25' }
      }
      const configContent = fsExtra.readFileSync(sourcePath, 'utf8')
      const config = JSON.parse(configContent)
      if (Object.prototype.hasOwnProperty.call(config, 'stock_code_mapping')) {
        this.externalData.stock_code_mapping = config.stock_code_mapping || cloneDefaultValue(this.defaultConfig.stock_code_mapping)
        this.persistExternalKey('stock_code_mapping')
        delete config.stock_code_mapping
      }
      this.data = Object.assign({}, this.defaultConfig, config)
      this.persist()
      this.createBackup()
      return { success: true, message: '\u914d\u7f6e\u5bfc\u5165\u6210\u529f' }
    } catch (err) {
      return { success: false, message: `\u5bfc\u5165\u5931\u8d25: ${err.message}` }
    }
  },

  reloadConfig() {
    this.initialized = false
    this.externalData = {}
    this.externalFilePaths = {}
    return this.init()
  }
}
