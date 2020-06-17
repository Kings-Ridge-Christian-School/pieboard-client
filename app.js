const express = require('express')
const md5 = require('md5');
const fs = require('fs');
const fetch = require('node-fetch')
require('dotenv').config()
const MAX_ACTIVE = process.env.MAX_ACTIVE || 10
const srv_app = express()
const NOSLIDE_WARNING = process.env.NOSLIDE_WARNING || true

const { app, BrowserWindow, ipcMain } = require('electron')


const bodyParser = require('body-parser')
srv_app.use(bodyParser.json({limit: '2gb', extended: true}))
srv_app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))


function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        resolve(response.text());
        response = null
    });
}

async function pipeToLocation(url, location) { 
    const res = await fetch(url);
    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(location);
      res.body.pipe(fileStream);
      res.body.on("error", (err) => {
        reject(err);
      });
      fileStream.on("finish", function() {
        resolve();
      });
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
let totalProcessing = 0

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

async function slideDownload(slide, address, port) {
     await pipeToLocation(`http://${address}:${port}/api/slide/get/${slide.id}`, img_path + slide.hash + ".b64")
     currentlyProcessing--
    console.log(`Saved ${slide.hash} (${(totalProcessing-currentlyProcessing)}/${totalProcessing})`)
}

async function processManifest(newManifest) {
    currentlyProcessing = newManifest.data.length
    totalProcessing = newManifest.data.length
    console.log(`Checking ${currentlyProcessing} slides`)
    let slideLoads = []
    for (slide in newManifest.data) {
        if (await exists(img_path + newManifest.data[slide].hash + ".b64")) {
            currentlyProcessing--
            console.log(newManifest.data[slide].hash + " already saved")
        } else {
            await slideDownload(newManifest.data[slide], newManifest.address, newManifest.port);
        }
    }
    fs.writeFileSync("data/manifest.json", JSON.stringify(newManifest))
    manifest = newManifest
    lock = manifest.nonce
    await cleanImages()
    console.log("Done processing manifest")
    currentlyProcessing = 0
    totalProcessing = 0
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
    if (currentlyProcessing != 0) warnings.push("CPROC")
    if (manifest.data.length == 0 && NOSLIDE_WARNING) warnings.push("NOSLIDE")
    return warnings
})

ipcMain.handle("currentlyProcessing", (event, arg) => {
    return [currentlyProcessing, totalProcessing]
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

