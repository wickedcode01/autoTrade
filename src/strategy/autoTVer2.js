//自动做T
const getPrice = require('../speed/stockPrice')
const { tradeByTimeQ } = require('../trade/trade')
const moment = require('moment')
const { select, insert, update } = require('../db/db')
const today = moment().format('YYYY-MM-DD')
const tablename = "tradeInfo"
const slog = require('single-line-log').stdout;
const amount = 100
module.exports = async function autoT(codeList, option) {
    let stockList = []
    stockList = codeList.map(data => new stockWatcher(data.code, data.height))
    //初始化条件单
    const info = await select("tradeInfo", { date: today })
    if (info && info.length) {
        //根据数据库中的条件初始化
        console.log("从数据库初始化完成")
        const position = info[0].position;
        let newPosition = position
        stockList.forEach((item) => {
            const target = position.find((val) => val.code === item.code)
            if (target) {
                const amount = target.amount || 0
                item.position = amount;
            } else {
                newPosition.push({ code: item.code, amount: 0, cash: 0, floor: item.floor, ceil: item.ceil })
            }
        })
        if (position.length !== newPosition.length) {
            console.log(position, newPosition)
            update(tablename, { date: today }, { position: newPosition })
        }
    } else {

        insert(tablename, {
            date: today, position: codeList.map((i) => {
                return { code: i.code, amount: 0, cash: 0, floor: -i.height, ceil: i.height }
            })
        })

    }


    //开始监测股价变化
    const timer = setInterval(() => {

        const time = moment().format('HHmm')
        if (time >= 925 && time <= 1130 || time >= 1300 && time < 1500) {
            trade(stockList)

        } else {
            console.log("非交易时间,自动停止...")
            clearInterval(timer)
        }

    }, 3000);

}

async function trade(stockList) {
    const codeList = stockList.map(data => data.code)
    let price = await getPrice(codeList)
    const now = moment().format('HH:mm:ss')
    slog(now, "当前价：", price.map(i => `${i.symbol} ${i.current}/${i.percent}%`))
    price.forEach((data, index) => {
        const stock = stockList.find((item) => item.code === data.code)
        let { position, cash, code } = stock
        let { percent, current, high, low, last_close } = data;
        if (percent <= stock.floor) {
            stock.nextFloor(percent)
            position += 100

            tradeByTimeQ(2, code, 1)

            stock.setPosition(position)
            stock.setCash(cash - current * 100 - 0.0002 * current * 100)
        } else if (percent >= stock.ceil) {
            stock.nextCeil(percent)
            position -= 100

            tradeByTimeQ(1, code, 1)

            stock.setPosition(position)
            stock.setCash(cash + current * 100 - 0.0012 * current * 100)
        }

        if (now.slice(0, 5) === '14:40' && position) {
            const direction = position > 0 ? 1 : 2
            const amount = Math.abs(position)
            tradeByTimeQ(direction, code, 3, amount, null, Math.abs(cash / position).toFixed(2))
            stock.setPosition(0)
        }

    })



}

class stockWatcher {
    constructor(code, height) {
        this.code = code
        this.ceil = height;
        this.floor = -height;
        this.height = height;
        this.position = 0;
        this.cash = 0;
    }

    nextFloor(base) {
        this.floor = base - this.height
        update("tradeInfo", { date: today }, { "position.$[i].floor": this.floor }, [{ "i.code": this.code }])
    }

    nextCeil(base) {
        this.ceil = base + this.height
        update("tradeInfo", { date: today }, { "position.$[i].ceil": this.ceil }, [{ "i.code": this.code }])
    }

    setPosition(position) {
        this.position = position
        update("tradeInfo", { date: today }, { "position.$[i].amount": position }, [{ "i.code": this.code }])

    }

    setCash(price) {
        this.cash = price;
        update("tradeInfo", { date: today }, { "position.$[i].cash": price }, [{ "i.code": this.code }])
    }

}