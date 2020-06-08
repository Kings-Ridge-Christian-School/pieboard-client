const express = require('express')
const md5 = require('md5');
const fs = require('fs');
const fetch = require('node-fetch')
require('dotenv').config()
const MAX_ACTIVE = process.env.MAX_ACTIVE || 10
const srv_app = express()


const { app, BrowserWindow, ipcMain } = require('electron')


const bodyParser = require('body-parser')
srv_app.use(bodyParser.json({limit: '2gb', extended: true}))
srv_app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))


function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        resolve(response.text());
    });
}

function post(url, data) {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });
            resolve(response.json());
        } catch(e) {
            reject(e)
        }
    });
}


const dir = __dirname + "/static/"
const port = process.env.GLOBAL_PORT || 3030
const auth = process.env.AUTH_CODE || ""
const img_path = __dirname + "/data/img/"
let manifest, lock
let currentlyProcessing = 0

function exists(path) {
    return new Promise(async (resolve, reject) => {
        fs.access(path, fs.F_OK, (err) => {
            if (err) {
                resolve(false)
            }
            resolve(true)
        });
    });
}
function delFile(path) { 
    return new Promise(async (resolve, reject) => {
        fs.unlink(path, (err) => {
            err ? reject(err) : resolve()
        })
    });
}
function cleanImages() {
    let tmp_hash = []
    for (image in manifest.data) {
        tmp_hash.push(manifest.data[image].hash + ".b64")
    }
    fs.readdir(img_path, async (err, files) => {
        for (file in files) {
            if (!tmp_hash.includes(files[file])) {
                await delFile(img_path + files[file])
                console.log(`Deleted ${files[file]}`)
            }
        }
    });
}
let wannaProcess = 0

function availableSlot() {
    return new Promise((resolve) => {
        if (wannaProcess >= MAX_ACTIVE) {
            setTimeout(() => resolve(availableSlot()), 1000)
        } else {
            resolve()
        }
    });
}

function slideDownload(slide, address, port) {
    return new Promise(async (resolve) => {
        await availableSlot()
        wannaProcess++
        let data = await get(`http://${address}:${port}/api/slide/get/${slide.id}`)
        if (md5(data) == slide.hash) {
            fs.writeFile(img_path + slide.hash + ".b64", data, (err) => {
                if (err) console.log(err)
                console.log("saved " + slide.hash)
                currentlyProcessing--
                wannaProcess-- // different from currentlyProcessing as currently is total and wanna is active
                resolve()
            });
        }
    });
}

async function processManifest(newManifest) {
    currentlyProcessing = 0
    let slideLoads = []
    for (slide in newManifest.data) {
        if (await exists(img_path + newManifest.data[slide].hash + ".b64")) {
            console.log(newManifest.data[slide].hash + " already saved")
        } else {
            currentlyProcessing++
            slideLoads.push(slideDownload(newManifest.data[slide], newManifest.address, newManifest.port));
        }
    }
    let wait = await Promise.all(slideLoads)
    fs.writeFileSync("data/manifest.json", JSON.stringify(manifest))
    manifest = newManifest
    lock = manifest.nonce
    await cleanImages()
    console.log("Done processing manifest")
    currentlyProcessing = 0
}

srv_app.get('/manifest', (req, res) => {
    res.send({"nonce": manifest.nonce})
});

srv_app.post("/manifest", async (req, res) => {
    if (req.body.auth == auth) {
        console.log("Loading new manifest");
        await processManifest(req.body)
        res.send({error: false})
    } else {
        console.log("Auth failed for manifest update")
        res.send({error: "auth"})
    }
});


function createWindow () {
    let win = new BrowserWindow({
      width: 1920,
      height: 1080,
      frame: false,
      webPreferences: {
        nodeIntegration: true
      }
    })

    win.loadFile('static/index.html')
}

function getFileContent(path) {
    return new Promise((resolve) => {
        fs.readFile(path, "utf-8", (err, cont) => {
            resolve(cont)
        });
    });
}

ipcMain.handle('ping', (event, arg) => {
    return {"nonce": lock}
})
ipcMain.handle('manifest', (event, arg) => {
    return manifest
})
ipcMain.handle('getImage', async (event, arg) => {
    return await getFileContent(img_path + arg + ".b64")
})
ipcMain.handle('warnings', (event, arg) => {
    let warnings = []
    if (manifest.nonce == 0) warnings.push("NOMANIFEST")
    if (auth == "") warnings.push("NOPASSWORD")
    if (currentlyProcessing != 0) warnings.push("CPROSSING")
    return warnings
})

ipcMain.handle("currentlyProcessing", (event, arg) => {
    return currentlyProcessing
})
app.whenReady().then(createWindow).then(async () => {
    srv_app.listen(3030)
    try {
        manifest = JSON.parse(fs.readFileSync("data/manifest.json"))
    } catch(e) {
        console.log("No manifest!")
        manifest = {
            "data": {},
            "nonce": 0,
            "id": null
        }
    }
    lock = manifest.nonce
    await fs.promises.mkdir('data/img', { recursive: true })
    await checkForUpdate()
});



async function checkForUpdate() {
    if (manifest.id != null) {
        let serverNonce = await get(`http://${manifest.address}:${manifest.port}/api/device/getnonce/${manifest.id}`)
        if (JSON.parse(serverNonce).nonce != manifest.nonce) {
            get(`http://${manifest.address}:${manifest.port}/api/device/refresh/${manifest.id}`);
            console.log("Refreshing manifest");
        } else {
            console.log("Manifest up to date");
        }
    } else {
        console.log("No manifest ID loaded, cannot refresh");
    }
}

