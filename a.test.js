const axios = require("axios").default;
const fs = require("fs");
const util = require("util");
const mongoose = require("mongoose");
const EventEmitter = require('events');
const { load } = require("cheerio");
const { Book } = require("./models/BookModel.js");
const readline = require("readline");

// Promise based fs.writeFile
const writeFile = util.promisify(fs.writeFile);

const BASE_URL_FOR_DOWNLOAD = "http://library.ziyonet.uz/uz/book/download/";
const BASE_URL_FOR_INDEX = "http://library.ziyonet.uz/uz/book/";
const MAX_REQUEST_INDEX = 120805;
const REQUEST_DELAY = 10000;
let doneRequestNumbers = [];

// get input from console via readline
const input = (question) => {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

// eventEmitter
const scrap = new EventEmitter();

scrap.on('scraping start', async () => {
    const first_nth = parseInt(await input("Enter the number of starting book: "));

    console.log('Scraping started from index: ' + first_nth);
    scrap.emit('new scrap', first_nth);
});

scrap.on('new scrap', (nth) => {
    console.log('Scraping started for book #' + nth);
    
    sendRequest(nth)
        .then(response => {
            console.log('\tFetching book #' + nth);
            scrap.emit('scrap end', nth, 'done', response.data);
        })
        .catch(error => {
            console.log('\tFetching book with error #' + nth);
            
            scrap.emit('scrap end', nth, 'error', error);
        });

});

scrap.on('scrap end', async (prev_nth, prev_state, prev_data) => {
    console.log('Scraping for ' + prev_nth + ' is finished with state ' + prev_state);

    if (prev_state === 'done') {
        doneRequestNumbers.push(prev_nth);
    }
    
    if ((prev_state === 'done') && prev_data) {

        try {
            const bookInfo = await scrapBookInfo(prev_nth);

            await writeFile('./data/bookInfo/' + prev_nth + '.json', JSON.stringify(bookInfo));
            await saveBinaryDataToFile(prev_data, prev_nth);
            
            console.log('\t\tScraping info for book #' + prev_nth + ' is finished and successfuly saved'); 
            
        } catch (ex) {
            console.log('\t\tScraping info for book #' + prev_nth + ' is failed');
            console.log(ex);
            scrap.emit('scraping end', prev_nth); 
        }

    }

    if (prev_nth === MAX_REQUEST_INDEX) {
        return scrap.emit('scraping end', prev_nth);
    }

    await delay(REQUEST_DELAY);

    scrap.emit('new scrap', prev_nth + 1);
});

scrap.on('scraping end', last_nth => {
    console.log('Scraping is finished for last book #' + last_nth);
    console.log('Done requests: ' + doneRequestNumbers);

    // await mongoose.disconnect();
    
    process.exit(0);
});

// set up mongoose connect to mongodb function
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log("Error connecting to MongoDB: ", error);
    }
};

// delay specified time
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// parse info about book
const scrapBookInfo = (nth) => {
    return new Promise(async (resolve, reject) => {
        const url = BASE_URL_FOR_INDEX + nth;
        let bookInfo = { zid: nth };

        try {
            const { data } = await axios.get(url);
            const $ = load(data);

            const tbody1 = $('#yw0').children('tbody')[0];
            const tbody2 = $('#yw0').next().children('tbody')[0];

            for (let value of tbody1.children) {
                bookInfo[$(value).children('th').text()] = $(value).children('td').text();
            }

            for (let value of tbody2.children) {
                bookInfo[$(value).children('th').text()] = $(value).children('td').text();
            }

            console.log('\t\t\tBook #' + nth + ' info is parsed');

            resolve(bookInfo);

        } catch (ex) {
            for (let key in bookInfo) delete bookInfo[key];
            console.log('\t\tError while parsing book info: #' + nth);
            console.log(ex);
            reject(ex);
        }
    });
};

// save binary data to file

const saveBinaryDataToFile = (data, nth) => {
    const fileName = './data/bookData/' + nth + '.pdf';

    return new Promise(async (resolve, reject) => {
        try {
            await writeFile(fileName, data);
            console.log('\t\t\tSaved file #' + nth);
            resolve();
        } catch (ex) {
            console.log('\t\t\tError while saving file #' + nth);
            reject(ex);
        }
    });
};

// Request sender Promise function
const sendRequest = (url) => {
    return new Promise((resolve, reject) => {
        axios.get(BASE_URL_FOR_DOWNLOAD + url, {
            responseType: 'arraybuffer'
        })
            .then(response => {
                console.log('\t\tRequest for book #' + url + ' is successfuly sent');
                resolve(response);
            })
            .catch(error => {
                console.log('\t\tRequest for book #' + url + ' is failed');
                reject(error);
            });
    });
};

// main function
(async () => {

    // await connectToMongoDB;
    scrap.emit('scraping start');

})();
