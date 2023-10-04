const fs = require("fs");
async function login(page, config) {
    const { accountUrl, checkVerifyUrl, main, loginUrl, username, password, index } = config
    let tag = 0;
    await new Promise((resolve) => {
        fs.readFile('./cookie.json', (err, data) => {
            if (err) {
                console.log("read error")
                resolve()
            } else {
                console.log('开始注入')
                data = JSON.parse(data)
                page.setCookie.apply(page, data).then(data => {
                    console.log("注入成功")
                    resolve()
                }).catch(err => {
                    console.log("注入失败")
                    resolve()
                })

            }
        })


    })



    await page.goto(accountUrl);
    let target = await page.$eval('title', (t) => t.innerHTML)
    if (target === '你当前的IP地址被限制访问-云财经') {
        console.log('need verify')
        await page.goto(checkVerifyUrl)
        await (await page.$('#code_img')).screenshot({ path: './code.png' })
        process.stdout.write("请输入验证码\n");
        process.stdin.on('data', (input) => {
            input = input.toString();
            !(async () => {
                const codeInput = await page.$("input");
                await codeInput.focus();
                //需要用真实键盘事件，不能用type
                await input.split('').forEach((item => {
                    page.keyboard.press(item, { delay: 100 });
                }))
            })()

            page.on('load', () => {
                let url = page.url()
                if (url === main) {
                    page.goto(accountUrl)
                } else if (url === loginUrl) {
                    page.cookies().then((data => {
                        fs.writeFile('./cookie.json', JSON.stringify(data), () => { console.log("cookie successful saved") })
                    }))
                }
            })


        })
    } else {

        console.log('无需验证码')
        page.goto(accountUrl)
        page.on('load', () => {
            let url = page.url()
            if (new RegExp(accountUrl).test(url) ) {
                console.log("登陆成功")
                page.$('a.btn').then(data => data.click())
            } else if (new RegExp(loginUrl).test(url) ) {
                console.log("开始登陆")

                fs.readFile('./localstorage.json', 'utf-8', async (err, data) => {
                    if (err) {
                        console.log('localStorage error')

                        const id = await page.$("input.id")
                        const pw = await page.$("input.psw")
                        //此处没有检测，无需延时
                        await id.type(username)
                        await pw.type(password)
                        await (await page.$("input[type=submit]")).click()

                    } else if (tag !== 1&&data!=='{}') {
                        console.log('ls 注入成功')
                        data = JSON.parse(data)
                        tag = 1
                        page.evaluate((data) => {
                            for (key in data) {
                                console.log(key, data[key])
                                window.localStorage.setItem(key, data[key])
                            }
                        }, data).then(() => page.goto(loginUrl))

                    } else if(data==='{}') {
                        //session失效,开启手动登录
                        console.log('session失效,开启手动登录')
                        const id = await page.$("input.id")
                        const pw = await page.$("input.psw")
                        //此处没有检测，无需延时
                        await id.type(username)
                        await pw.type(password)
                        await (await page.$("input[type=submit]")).click()
                    }else{
                        //ls存有账号密码
                        console.log("ls存有账号密码")
                        await (await page.$("input[type=submit]")).click()
                    }
                })

            }else{
                console.log('未命中任何分支,当前url:',url)
            }
        })
    }


}

module.exports = login