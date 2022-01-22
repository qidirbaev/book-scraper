import { get } from "axios";
import { load } from "cheerio";
import { writeFile as _writeFile } from "fs";
import { promisify } from "util";
import { BASE_URL_FOR_DOWNLOAD, BASE_URL_FOR_INDEX } from "../../constants/main";


const writeFile = promisify(_writeFile);



const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapBookInfo = (nth) => {
    return new Promise(async (resolve, reject) => {
        const url = BASE_URL_FOR_INDEX + nth;
        let bookInfo = { zid: nth };

        try {
            const { data } = await get(url);
            const $ = load(data);

            const tbody1 = $('#yw0').children('tbody')[0];
            const tbody2 = $('#yw0').next().children('tbody')[0];

            for (let value of tbody1.children) {
                const th = $(value).children('th').text();
                const td = $(value).children('td').text();

                if (th != '' && td != '') bookInfo[th] = td;

            }

            for (let value of tbody2.children) {
                const th = $(value).children('th').text();
                const td = $(value).children('td').text();

                if (th != '' && td != '') bookInfo[th] = td;
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

const input = (question) => {
    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

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

export default {
    delay,
    scrapBookInfo,
    saveBinaryDataToFile,
    sendRequest,
    input,
    writeFile
};