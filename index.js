const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');
const fs = require("fs");

let run = true;
let toLoad = "https://spigotmc.org/resources";

let lastToLoad = "";

(async () => {
    await start();
})();

async function start() {
    // console.log("Checking toLoad...");
    let exists = fs.existsSync("toload.txt");
    if (!exists) {
        setTimeout(() => start(), 30000);
        return;
    }
    run = true;

    console.log("Starting...");

    const browser = await puppeteer.launch();
    try {
        const page = await browser.newPage();
        let cookiesArr = JSON.parse(fs.readFileSync("./cookies.json").toString("utf8"));
        for (let c of cookiesArr) {
            await page.setCookie(c);
        }
        let ua = fs.readFileSync("./useragent.txt").toString("utf8");
        if (!ua || ua.length < 2) {
            ua = new UserAgent().toString()
        }
        console.log("Using User-Agent: " + ua);
        await page.setUserAgent(ua)

        let init = await tryGet(page, ua, "https://spigotmc.org");
        if (!init) {
            try {
                await page.close();
            } catch (e) {
            }
            await browser.close();
            setTimeout(() => start(), 10000);
        } else {
            while (run) {
                await sleep(500);
                if (toLoad) {
                    lastToLoad = toLoad;
                    let curr;
                    try {
                        curr = tryGet(page, ua, toLoad);
                    } catch (e) {
                        console.warn(e);
                    }
                    if (curr) {
                        toLoad = null;
                    } else {
                        await sleep(1000);
                    }
                    await sleep(1000);
                }
                let exists = fs.existsSync("toload.txt");
                if (exists) {
                    let newToLoad = fs.readFileSync("toload.txt").toString("utf8");
                    if (newToLoad !== lastToLoad) {
                        toLoad = newToLoad;
                        console.log("New toLoad: " + toLoad);
                    }
                } else {
                    console.log("toload.txt doesn't exist, pausing");
                    run = false;
                    toLoad = "";
                    lastToLoad = "";
                    setTimeout(() => start(), 30000);
                }
            }
            await browser.close();
        }
    } catch (e) {
        console.error(e);
        await browser.close();
    }
}

async function tryGet(page, ua, url) {
    let resp = await page.goto(url);
    // await page.screenshot({path: 'first.png'});
    let cookies = await page.cookies();
    console.log("Code: " + resp.status());
    let status = 0;
    let c = 0;
    while ((status = resp.status()) > 420) {
        await sleep(500);
        console.log("Waiting for navigation...")
        resp = await page.waitForNavigation({timeout: 0, waitUntil: "networkidle0"});
        // await page.screenshot({path: 'second' + (c++) + '.png'});
        console.log("Code: " + (status = resp.status()));
        cookies = await page.cookies();
        saveCookies(cookies);
        await sleep(1000);
    }
    console.log("Last Status: " + status);
    if (status < 400) {
        console.log("Waiting for xenforo selector...")
        // await page.waitForNavigation();
        await page.waitForSelector("div#navigation", {timeout: 0})
        // await page.screenshot({path: 'third.png'});
        console.log("Got xenforo page!")

        let content = await page.content();
        fs.writeFileSync("page.html", content);

        cookies = await page.cookies();
        saveCookies(cookies);
        saveUserAgent(ua)

        return true;
    } else {
        console.log("Resetting cookies");
        saveCookies([]);
        saveUserAgent("")

        return false;
    }
}

function sleep(t) {
    return new Promise(resolve => {
        setTimeout(resolve, t);
    })
}

function saveCookies(cookies) {
    fs.writeFileSync("./cookies.json", JSON.stringify(cookies))
}

function saveUserAgent(ua) {
    fs.writeFileSync("./useragent.txt", ua);
}
