const getPrice = require('./speed/stockPrice');
    (async () => {
        const price =await getPrice('159928');
        console.log(price)
    })()
