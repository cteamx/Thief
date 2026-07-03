function decodeBasicHtmlEntities(text) {
    return String(text)
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
}

function stripDisplayHtml(text = '') {
    return decodeBasicHtmlEntities(String(text)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ''))
}

function normalizeSingleLineText(text = '') {
    return String(text)
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function formatTrayTitle(text = '') {
    const ansiRed = '\u001b[31m'
    const ansiGreen = '\u001b[32m'
    const ansiReset = '\u001b[0m'

    const withAnsi = String(text)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<span\b([^>]*)>(.*?)<\/span>/gi, function(_match, attrs, content) {
            const plain = String(content)
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]*>/g, '')
            if (/\b(stock-color-red|profit-up)\b/.test(attrs)) {
                return ansiRed + plain + ansiReset
            }
            if (/\b(stock-color-green|profit-down)\b/.test(attrs)) {
                return ansiGreen + plain + ansiReset
            }
            return plain
        })

    return normalizeSingleLineText(stripDisplayHtml(withAnsi))
}

export {
    stripDisplayHtml,
    formatTrayTitle
}
