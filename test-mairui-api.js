const request = require('superagent');

async function testMairuiAPI() {
    console.log('测试迈瑞API...');
    
    try {
        const response = await request
            .get('https://api.mairuiapi.com/hslt/list/LICENCE-66D8-9F96-0C7F0FBCD073')
            .timeout(30000)
            .buffer(true)
            .parse(request.parse.text); // 禁用自动JSON解析
        
        console.log('响应状态:', response.status);
        console.log('响应类型:', response.type);
        console.log('响应数据长度:', response.text ? response.text.length : 0);
        console.log('响应数据前200字符:', response.text ? response.text.substring(0, 200) : 'No text');
        console.log('响应数据后100字符:', response.text ? response.text.substring(response.text.length - 100) : 'No text');
        
        let stockData = null;
        
        if (response.text) {
            try {
                stockData = JSON.parse(response.text);
                console.log('JSON解析成功，数据条数:', stockData.length);
                console.log('前3条数据:', stockData.slice(0, 3));
            } catch (parseError) {
                console.warn('JSON解析失败:', parseError.message);
                
                // 尝试修复被截断的JSON
                let fixedText = response.text;
                if (!fixedText.endsWith(']')) {
                    const lastCompleteIndex = fixedText.lastIndexOf('}');
                    if (lastCompleteIndex > 0) {
                        fixedText = fixedText.substring(0, lastCompleteIndex + 1) + ']';
                        console.log('尝试修复JSON，修复后长度:', fixedText.length);
                        try {
                            stockData = JSON.parse(fixedText);
                            console.log('修复后JSON解析成功，数据条数:', stockData.length);
                            console.log('前3条数据:', stockData.slice(0, 3));
                            console.log('后3条数据:', stockData.slice(-3));
                        } catch (fixError) {
                            console.error('修复后仍无法解析:', fixError.message);
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('API请求失败:', error.message);
    }
}

testMairuiAPI();
