const request = require('request');
const { windUrl, snowUrl, speedSource } = require('../../config.json')
module.exports = function getStockPrice(code, date = null) {
    let codeList = ''

    switch (speedSource) {
        case 0:
            //todo...
            break;
        case 1:
            if (code instanceof Array) {
                code = code.map(i => {
                    const firstC = String(i)[0]
                    if (firstC == 0 || firstC == 1) i = 'SZ' + i;
                    else i = 'SH' + i;
                    return i
                })
                codeList = code.join(',')
            } else {
                const firstC = String(code)[0]
                if (firstC === '6' || firstC === '5') code = 'SH' + code;
                else code = 'SZ' + code;
                codeList = code
            }
    }


    return new Promise((resolve, reject) => {
        try {
            switch (speedSource) {
                case 0://wind 
                    request.get({ url: windUrl, qs: { cmdCode: 1000010, param: JSON.stringify({ windCodeList: codeList, tradeDate: date }) } }, function (err, res, body) {
                        body = JSON.parse(body)
                        if (res.statusCode === 200 && body.resultCode === '200') {
                            resolve(body.resultObject)
                        } else {
                            reject("network error " + res.statusCode + body)
                        }
    
                    }); break;
                case 1://snowball
                    request.get({ url: snowUrl, qs: { symbol: codeList }, gzip: true }, function (err, res, body) {
                        if (res.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.error_code === 0) {
                                let data = body.data.map(i => { return { ...i, 'code': i['symbol'].slice(2) } });
                                resolve(data)
                            } else {
                                reject(body.error_description)
                            }
    
                        } else {
                            reject("network error " + res.statusCode)
                        }
                    }); break;
            }
        } catch (error) {
            reject("inner error "+error)
        }





    })

}

