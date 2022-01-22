import { load } from "cheerio";

const url = "http://library.ziyonet.uz/uz/book/";

request(url, function (err, resp, body) {
    if(!err) {
        var $ = cheerio.load(body)

        var test = $('body table table table > tbody > tr > td > p');
        console.log(test.html())   
        test.each(function (ii, asdf) {
            var rr = $(asdf).find("table").find("tr").first().find('td:nth-child(2)').text();
            console.log(asdf);
        }) 
    } else {
        console.log("we encountered an error: " + err);
    }
});

console.log($.html());