const { responseOrder,preAuth,test } = require('../../config.json')
const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment')
let page = null, cookies = '', obj = {}, search = '';
exports.init = function init(newPage, cookie) {
    page = newPage
    cookie.forEach((data, index) => {
        cookies += data.name + '=' + data.value + (index === cookie.length - 1 ? '' : '; ')
    })
    const url = page.url()
    let [main, search] = url.split('?');
    search = search;
    const params = search.split('&')
    params.forEach((data) => {
        const [name, value] = data.split('=')
        obj[name] = value
    })
    console.log("交易模块初始化完成")
}

//兼容模式
function tradeByTime(direction = 0, code, date = null, type = 0, amount = 100) {
    if (page) {
        (async () => {
            //进入相关页面
            const url = await getUrl('时间条件单')
            console.log(url)
            if (url) {
                await page.goto(url)
                // 输入证券代码
                await (await page.$('.select2-selection.select2-selection--single')).click()
                const input = await page.$('.select2-search input')
                await input.type(code)
                await new Promise((resolve) => setTimeout(() => {
                    console.log("等待1s")
                    resolve()
                }, 1000))

                const targetCode = await page.$('.select2-results__option.select2-results__option--highlighted')
                if (targetCode) {
                    await targetCode.click()
                } else {
                    throw new Error("无法获取code")
                    return 0
                }


                //date
                if (date) {
                    await (await page.$('.form-control.datetimepicker-input')).type(date)
                } else {
                    await (await page.$('.custom-control.custom-switch')).click()
                }

                //direction
                const checkbox = await page.$$('.mr-4')
                checkbox[direction].click()

                //type
                checkbox[2].click()

                //amount
                const amountInput = await page.$('#input_size')
                amountInput.type(amount + '')
                //
                await (await page.$$('.custom-control.custom-switch'))[1].click()
                await new Promise((resolve) => setTimeout(() => {
                    console.log("等待1s")
                    resolve()
                }, 1000))
                await (await page.$('.modal-footer button')).click();
                await new Promise((resolve) => setTimeout(() => {
                    console.log("等待1s")
                    resolve()
                }, 1000))
                await (await page.$('#agree_id')).click();
                (await page.$('button.btn.btn-primary.btn-block')).click()

                //回调
                page.on('load', async () => {
                    const url = page.url()
                    if (url.indexOf(responseOrder) >= 0) {
                        const title = await page.title()
                        if (title === "错误") {
                            console.warn("下单失败！")
                            const info = await page.$eval('p', (data) => data.innerText)
                            console.log("原因：" + info)
                            return 0
                        } else if (title === "成功") {
                            console.log("下单成功")
                            return 1
                        }
                    }
                })
            } else {
                console.error("not found")
                return 0
            }


        })()

    } else {
        console.error("page 未实例化")
        return 0
    }

}


//快速模式



/**
 *根据时间下单接口
 *
 * @param {*} direction 交易方向 2：买入 1：卖出
 * @param {string} code 股票代码
 * @param {*} type 交易类型 1：智能追价 2：市价 3:限价
 * @param {*} amount
 * @param {string} date eg. 2022-01-17 15:00:00 不传代表立即下单
 * @param {*} price 限价
 */
exports.tradeByTimeQ = function tradeByTimeQ(direction, code, type, amount = 100, date, price = '') {
    if(test){
        console.log("模拟下单成功")
        return 
    }
    const data = {
        code: code,
        //立即下单
        excnow: date ? undefined : 2,
        action: direction,
        entrust: type,
        entrust_price: price,
        size: amount,
        //预授权
        pre_auth: preAuth?2:undefined,
        agree_name: 'on',
        subtype: 'time',
        accid: obj['accid'],
        key: obj['key'],
        orid: '',
        //下单日期
        deadline: date
    };

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,ja;q=0.5',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Host': 'www.yuncaijing.com',
        'Origin': 'https://www.yuncaijing.com',
        'Pragma': 'no-cache',
        'Referer': 'https://www.yuncaijing.com/jatweb/set_order_time?' + search,
        'sec-ch-ua': '"Google Chrome"; v = "89", "Chromium"; v = "89", ";Not A Brand"; v = "99"',
        'sec-ch-ua-mobile': '?0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 89.0.4389.114 Safari / 537.36'
    }

    request.post({ url: responseOrder, headers: headers, method: 'post', form: data, gzip: true }, function (err, res, body) {
        if (res.statusCode === 200) {
            const $ = cheerio.load(body)
            const title = $('title').text()
            if (title === '成功') {
                console.log('条件单下单成功')
            }
            else if (title === '错误') {
                console.warn("下单失败！")
                const info = $('p').text()
                console.warn(info)
            }
        } else {
            console.error("网络错误", res.statusCode, res.statusMessage)
        }
    })
}


/**
 *
 *
 * @param {number} direction 交易方向 2：买入 1：卖出
 * @param {string} code
 * @param {*} type 交易类型 1：智能追价 2：市价 3:限价
 *  * @param {object} {flag,flagPrice} 条件 1：小于等于flagPrice 2:大于等于
 * @param {number} [amount=100]
 * @param {string} [date=moment().format('YYYY-MM-DD 15:00:00')]
 * @param {string} [price='']
 */
exports.tradeByPriceQ = function tradeByPriceQ(direction, code, type, { flag, flagPrice }, amount = 100, date = moment().format('YYYY-MM-DD 15:00:00'), price = '') {
    if(test){
        console.log("模拟下单成功")
        return 
    }   
    const data = {
        code: code,
        action: direction,
        entrust: type,
        entrust_price: price,
        size: amount,
        type1_flag: flag,
        type1_price: flagPrice,
        //预授权
        pre_auth: preAuth?2:undefined,
        agree_name: 'on',
        subtype: 'price',
        accid: obj['accid'],
        key: obj['key'],
        orid: '',
        deadline: date
    };

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,ja;q=0.5',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Host': 'www.yuncaijing.com',
        'Origin': 'https://www.yuncaijing.com',
        'Pragma': 'no-cache',
        'Referer': 'https://www.yuncaijing.com/jatweb/set_order_time?' + search,
        'sec-ch-ua': '"Google Chrome"; v = "89", "Chromium"; v = "89", ";Not A Brand"; v = "99"',
        'sec-ch-ua-mobile': '?0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 89.0.4389.114 Safari / 537.36'
    }
    request.post({ url: responseOrder, headers: headers, method: 'post', form: data, gzip: true }, function (err, res, body) {
        if (res.statusCode === 200) {
            const $ = cheerio.load(body)
            const title = $('title').text()
            if (title === '成功') {
                console.log('条件单下单成功')
            }
            else if (title === '错误') {
                console.warn("下单失败！")
                const info = $('p').text()
                console.warn(info)
            }
        } else {
            console.error("网络错误", res.statusCode, res.statusMessage)
        }
    })
}

/**
 *涨跌幅条件单
 *
 * @param {*} direction  交易方向 2：买入 1：卖出
 * @param {*} code
 * @param {*} type 交易类型 1：智能追价 2：市价 3:限价
 * @param {*} { flag, flagPercent } 条件 1：小于等于flagPercent 2:大于等于
 * @param {number} [amount=100]
 * @param {string} [date=moment().format('YYYY-MM-DD 15:00:00')]
 * @param {string} [price='']
 */
exports.tradeByPercentQ = function (direction, code, type, { flag, flagPercent }, amount = 100, date = moment().format('YYYY-MM-DD 15:00:00'), price = '') {
    if(test){
        console.log("模拟下单成功")
        return 
    }
    const data = {
        code: code,
        action: direction,
        entrust: type,
        entrust_price: price,
        size: amount,
        type1_flag: flag,
        type4_zdf: Number(flagPercent).toFixed(2),
        //预授权
        pre_auth:preAuth?2:undefined,
        agree_name: 'on',
        subtype: 'zdf',
        accid: obj['accid'],
        key: obj['key'],
        orid: '',
        deadline: date
    }

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,ja;q=0.5',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Host': 'www.yuncaijing.com',
        'Origin': 'https://www.yuncaijing.com',
        'Pragma': 'no-cache',
        'Referer': 'https://www.yuncaijing.com/jatweb/set_order_time?' + search,
        'sec-ch-ua': '"Google Chrome"; v = "89", "Chromium"; v = "89", ";Not A Brand"; v = "99"',
        'sec-ch-ua-mobile': '?0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 89.0.4389.114 Safari / 537.36'
    }
    request.post({ url: responseOrder, headers: headers, method: 'post', form: data, gzip: true }, function (err, res, body) {
        if (res.statusCode === 200) {
            const $ = cheerio.load(body)
            const title = $('title').text()
            if (title === '成功') {
                console.log('条件单下单成功')
            }
            else if (title === '错误') {
                console.warn("下单失败！")
                const info = $('p').text()
                console.warn(info)
            }
        } else {
            console.error("网络错误", res.statusCode, res.statusMessage)
        }
    })
}

// function tradeBy
async function getUrl(name) {
    let cache = {}
    if (cache[name]) {
        return cache[name]
    } else {
        const url = await page.evaluate((name) => {
            let list = document.querySelectorAll('.nav-item>a>p')
            list = Array.from(list).filter((ele) => ele.innerHTML.indexOf(name) >= 0)
            if (list[0]) {
                list = list[0].parentNode.href;
                return Promise.resolve(list)
            } else {
                return null
            }

        }, name)

        cache[name] = url;
        return url
    }
}

exports.tradeByTime = tradeByTime;