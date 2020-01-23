const express = require('express')
const md5 = require('md5');
const fs = require('fs');
const fetch = require('node-fetch')
require('dotenv').config()

const app = express()
const internal_app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json({limit: '2gb', extended: true}))
app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))


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
const port = 3030
const local_port = 3333
const auth = process.env.AUTH_CODE
const img_path = __dirname + "/data/img/"
let manifest, lock

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

async function processManifest() {
    for (slide in manifest.data) {
        if (await exists(img_path + manifest.data[slide].hash)) {
            console.log(manifest.data[slide].hash + " already saved")
        } else {
            let data = await get(`http://${manifest.address}:3000/api/slide/get/${manifest.data[slide].id}`)
            if (md5(data) == manifest.data[slide].hash) {
                fs.writeFile(img_path + manifest.data[slide].hash, data, (err) => {
                    if (err) console.log(err)
                    console.log("saved " + manifest.data[slide].hash)
                });
            }
        }
    }
    fs.writeFileSync("data/manifest.json", JSON.stringify(manifest))
}

app.get('/manifest', (req, res) => {
    res.send({"nonce": manifest.nonce})
});

app.post("/manifest", (req, res) => {
    console.log(req.body.auth, auth)
    if (req.body.auth == auth) {
        manifest = req.body
        console.log("Loaded new manifest");
        processManifest()
        res.send({res: 0})
    }
});

internal_app.get("/", (req, res) => res.sendFile(dir + "index.html"))
internal_app.get("/ping", (req, res) => res.send({"nonce": lock}));
internal_app.get("/manifest", (req, res) => res.send(manifest))
internal_app.get("/index.js", (req, res) => res.sendFile(dir + "index.js"))
internal_app.get("/image/:hash", (req, res) => res.sendFile(img_path + req.params.hash))


if (manifest.id != null) {
    get(`http://${manifest.address}:3000/dapi/refresh/${manifest.id}`);
    console.log("Refreshing manifest");
} else {
    console.log("No manifest ID loaded, cannot refresh");
}


app.listen(port, () => console.log(`PieBord Client listening on port ${port}!`))
internal_app.listen(local_port, 'localhost', () => console.log(`PieBoard Local Client listening on port ${local_port}!`))

