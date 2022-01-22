const axios = require("axios").default;
const fs = require("fs");
const util = require("util");
const mongoose = require("mongoose");
const EventEmitter = require('events');
const { load } = require("cheerio");
const { Book } = require("./models/BookModel.js");

// Promise based fs.writeFile
const writeFile = util.promisify(fs.writeFile);

const BASE_URL_FOR_DOWNLOAD = "http://library.ziyonet.uz/uz/book/download/";
const BASE_URL_FOR_INDEX = "http://library.ziyonet.uz/uz/book/";
const MAX_REQUEST_INDEX = 120802;
const REQUEST_DELAY = 10000;
let doneRequestNumbers = [];

// eventEmitter
const scrap = new EventEmitter();

scrap.on('scraping start', first_nth => {
    console.log('Scraping started from index: ' + first_nth);
});

scrap.on('new scrap', async (nth) => {
    console.log('Scraping started for book #' + nth);
    
    sendRequest(nth)
        .then(response => {
            console.log('\tFetching book #' + nth);
            scrap.emit('scrap end', nth, 'done', response.data);
        })
        .catch(error => {
            console.log('\tFetching book with error #' + nth);
            console.log(error);
            scrap.emit('scrap end', nth, 'error', error);
        });

});

scrap.on('scrap end', async (prev_nth, prev_state, prev_data) => {
    console.log('Scraping for ' + prev_nth + ' is finished with state ' + prev_state);

    if (prev_state === 'done') {
        doneRequestNumbers.push(prev_nth);
    }
    
    if ((prev_state === 'done') && prev_data) {

        // scrap and save info about book
        try {
            const bookInfo = await scrapBookInfo(prev_nth);
            await writeFile('./data/bookInfo/' + prev_nth + '.json', JSON.stringify(bookInfo));
            console.log('\t\tScraping info for book #' + prev_nth + ' is finished and successfuly saved'); 

        } catch (ex) {
            console.log('\t\tError scraping book info: #' + prev_nth);
            console.log(ex);
        }

        // save binary data to file
        try {
            await saveBinaryDataToFile(prev_data, prev_nth);
        } catch (ex) {
            console.log('Error saving file: #' + prev_nth, ex);
        }

    }

    if (prev_nth === MAX_REQUEST_INDEX) {
        return scrap.emit('Scraping end', prev_nth);
    }

    await delay(REQUEST_DELAY);

    scrap.emit('new scrap', prev_nth + 1);
});

scrap.on('scraping end', async last_nth => {
    console.log('Scraping is finished for last book #' + last_nth);
    await mongoose.disconnect();
});

// set up mongoose connect to mongodb function
const connectToMongoDB = (async () => {
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
})();

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
        
            $.each(tbody1.children, (key, value) => {
                bookInfo[$(value).children('th').text()] = $(value).children('td').text();
            });
        
            $.each(tbody2.children, (key, value) => {
                bookInfo[$(value).children('th').text()] = $(value).children('td').text();
            });

            resolve(bookInfo);
    
        } catch (ex) {
            for (let key in bookInfo) delete bookInfo[key];
            console.log('\t\tError while scraping book info: #' + nth);
            console.log(ex);
            reject(ex);
        }
    });
};

// save binary data to file

const saveBinaryDataToFile = (data, nth) => {
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
}

// const saveBinaryDataToFile = async (data, nth) => {
//     const fileName = `./data/book-${nth}.pdf`;

//     try {
//         await writeFile(fileName, data);
//         console.log('\t\tSaved file #' + nth);
//     } catch (ex) {
//         console.log('\t\tError saving file #' + nth);
//         console.log(ex);
//     }
// };

// Request sender Promise function
const sendRequest = (url) => {
    return new Promise((resolve, reject) => {
        axios.get(BASE_URL_FOR_DOWNLOAD + url, {
            responseType: 'arraybuffer'
        })
            .then(response => {
                resolve(response);
            })
            .catch(error => {
                reject(error);
            });
    });
};
