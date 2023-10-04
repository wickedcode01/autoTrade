const puppeteer = require('puppeteer');
const fs = require("fs");
const login = require('./login');
const { init,  tradeByTimeQ, tradeByPriceQ } = require('./trade/trade');
const strategy=require('./strategy/base')
//read config
const config = require('../config.json')
const { dev, qqbrowser, index } = config

!async function () {
  const browser = await puppeteer.launch(dev ? { headless: false, devtools: true } : {});
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(60000);
  //设置userAgent躲避检测
  await page.setUserAgent(qqbrowser);
  await page.setViewport({ width: 1000, height: 500 });
  //登陆
  await login(page, config)
  page.on('load', async () => {
    let url = page.url()
    if (url.indexOf(index) >= 0) {
      console.log("进入主页")
      //get cookie
      page.cookies().then((data => {



        fs.writeFile('./cookie.json', JSON.stringify(data), () => { console.log("cookie successful saved") })
        page.evaluate(() => Object.assign({}, window.localStorage)).then(data => {
          fs.writeFile('./localstorage.json', JSON.stringify(data), () => console.log("ls successful saved"))
        })

        init(page,data)

        // tradeByTimeQ(2,'600000',2,100,'2022-01-17 15:00:00')
        // tradeByPriceQ(2,'600000',1,{flag:1,flagPrice:9},100)

        //策略模块
        strategy()



      }))


    }
  })

}()
