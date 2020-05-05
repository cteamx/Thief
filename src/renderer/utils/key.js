'use strict';

import { remote } from 'electron'


const isMac = 'darwin' === process.platform;

const commands = ['Command', 'Control', 'Shift', 'Capslock', 'Alt', 'Tap', 'Enter', 'Delete', 'Backspace']

const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

const symbolKeys = ['-', '=', '[', ']', '\\', ';', "'", ',', '.', '.', '/']

const letterKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

const _MATCH_DIGIT_ = /^(Digit)(.*)/

const _MATCH_kEY_ = /^(Key)(.*)/

const _MATCH_NUMBER_ = /^(Numpad)(.*)/

const _MATCH_RESOLVE_ = {
    MetaLeft: isMac ? 'Command' : 'Meta',
    MetaRight: isMac ? 'Command' : 'Meta',
    ControlLeft: 'Control',
    ControlRight: 'Control',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    Minus: '-',
    Equal: '=',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Add: '+',
    Subtract: '-',
    Multiply: '*',
    Divide: '/',
    Decimal: 'Delete'
}

export default {
    constructor(options = {}) {
        this.commands = options.command || commands
        this.attendDemand = options.attend || ['number', 'symbol', 'letter']
        this.ele = options.ele || document
        this.attends = []
        this.commandKeys = {}
        this.currentKeys = []
        this.attendKey = ''
        this.keyboardValue = ''
        this.focus = false
        this.onkeypressCallback = () => { }
        this.init()
    },
    init() {
        this.combination = this.Combination.bind(this)
        this.addEventKey()
        this.checkLocal()
    },
    checkLocal() {
        this.attendDemand.forEach(name => {
            if (name === 'number') {
                this.attends = [...this.attends, ...numberKeys]
            }
            if (name === 'symbol') {
                this.attends = [...this.attends, ...symbolKeys]
            }
            if (name === 'letter') {
                this.attends = [...this.attends, ...letterKeys]
            }
        })
    },
    matchKey(key) {
        if (_MATCH_DIGIT_.test(key)) {
            key = key.replace(_MATCH_DIGIT_, '$2')
        }
        if (_MATCH_kEY_.test(key)) {
            key = key.replace(_MATCH_kEY_, '$2')
        }
        if (_MATCH_NUMBER_.test(key)) {
            key = key.replace(_MATCH_NUMBER_, '$2')
        }
        if (_MATCH_RESOLVE_[key]) {
            key = _MATCH_RESOLVE_[key]
        }
        return key.toLowerCase().replace(/^[a-z]/, $1 => $1.toUpperCase());
    },
    Combination(event) {
        if (!this.focus) return
        event.preventDefault()
        event.returnValue = false
        const code = this.matchKey(event.code)
        const value = event.type === 'keydown'
        if (this.commands.includes(code)) {
            this.commandKeys[code] = value
        }
        if (this.attends.includes(code)) {
            this.attendKey = this.attendKey === code ? '' : code
        }
        value ? this.keydownEvent() : this.keyupEvent()
    },
    keydownEvent() {
        this.currentKeys = this.commands.filter(key => {
            if (this.commandKeys[key]) return true
            else return false
        })
        if (this.currentKeys.length > 0) {
            this.currentKeys.push(this.attendKey)
        }
        this.keyboardValue = this.currentKeys.join('+')
        this.onkeypressCallback(this.keyboardValue, this)
    },
    keyupEvent() {
        if (this.currentKeys[this.currentKeys.length - 1] === '') {
            this.clearKeyboard()
            this.onkeypressCallback(this.keyboardValue, this)
        }
    },
    clearKeyboard() {
        this.currentKeys = []
        this.commandKeys = {}
        this.attendKey = ''
        this.keyboardValue = ''
    },
    resetKeys(keys) {
        this.clearKeyboard()
        if (Array.isArray(keys)) {
            this.currentKeys = keys
            this.keyboardValue = this.currentKeys.join('+')
            this.onkeypressCallback(this.keyboardValue, this)
        }
    },
    addEventKey() {
        this.ele.addEventListener('keydown', this.combination)
        this.ele.addEventListener('keyup', this.combination)
    },
    onkeypress(fn) {
        if (typeof fn === 'function') {
            this.onkeypressCallback = fn
        }
    },
    destroy() {
        this.ele.removeEventListener('keydown', this.combination)
        this.ele.removeEventListener('keyup', this.combination)
    },
    onFocus() {
        this.focus = true
    },
    onBlur() {
        this.focus = false
    }
}

