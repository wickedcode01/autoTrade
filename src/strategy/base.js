const autoT = require('./autoT')
const autoT2=require('./autoTVer2')
const moment =require('moment')
const schedule = require('node-schedule');
function strategy () {
    const callback=()=>{
        console.log("定时策略开始执行")
        const time=moment().format('HHmm')
        if (time>=925&&time<=1130||time>=1300&&time<1500) {
            // autoT([{code:'000708',height:1.5}])
            autoT2([{code:'159928',height:1},{code:'512800',height:1}])
        } else {
            console.log("非交易时间")
            return
        }
    }

    console.log("策略服务已启用...")
    const time=moment().format('HHmmss')
    if(time>=92500&&time<150000)callback()

    schedule.scheduleJob('59 24 9 * * *',callback); 
    
    schedule.scheduleJob('0 0 13 * * *',callback);
}


module.exports = strategy