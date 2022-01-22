import express, { urlencoded } from "express";
import { config } from "dotenv";
import EventEmitter from 'events';
import { Book } from "./models/BookModel.js";
import { connectToMongoDB } from "./helpers/storage.js";
import { BASE_URL_FOR_DOWNLOAD, BASE_URL_FOR_INDEX, MAX_REQUEST_INDEX, REQUEST_DELAY } from "./constants/main.js";
import { sendRequest, input, scrapBookInfo, writeFile, saveBinaryDataToFile, delay } from "./helpers/utils/functions.js";

config();
const app = express();

app.use(urlencoded({ extended: true }));

let doneRequestNumbers = [];

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

    if (prev_state === 'done') doneRequestNumbers.push(prev_nth);

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


// main function
(async () => {

    console.log(await connectToMongoDB());
    scrap.emit('scraping start');

})();



app.get("/", (req, res) => {
    res.send("Hello from Express Server");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server listening on port: " + port);
});