// general
let device = {}
let manifest, client, win
// file handling
const fs = require('fs')

function readJSON(path) {
    return new Promise((resolve, reject) => {
        fs.access(path, fs.F_OK, async (err) => {
            if (err) {
                resolve()
            } else {
                resolve(JSON.parse(await fs.promises.readFile(path, "utf8")))
            }
        })
    })
}


function writeJSON(path, data, remount) {
    return new Promise(async (resolve, reject) => {
        if (remount)     await execute("rw")
        fs.writeFile(path, JSON.stringify(data), async(err) => {
                if (err) {
                    reject(err)
                } else {
                    if (remount) await execute("ro")
                    resolve(err)
                }
            });
        });
}

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

// cryptography
const openpgp = require('openpgp')

async function getKeypair(name) {
    let keys = await openpgp.generateKey({curve: "ed25519", userIDs: [{"name": name}]})
    return {
        "private": keys.privateKeyArmored,
        "public": keys.publicKeyArmored,
        "revocation": keys.revocationCertificate
    }
}

async function encrypt(input, recvKey) {
    if (typeof input == "object") input = JSON.stringify(input)
    const privateKey = await openpgp.readKey({ armoredKey: device.keys.private })
    const publicKey = await openpgp.readKey({armoredKey: recvKey})

    let options = {
        message: await openpgp.createMessage({text: input}),
        encryptionKeys: publicKey,
        signingKeys: privateKey
    }

    const out = await openpgp.encrypt(options)

    return out
}

async function decrypt(message, recvKey) {
    const out = await openpgp.decrypt({
        message: await openpgp.readMessage({
            armoredMessage: message // parse armored message
        }),
        verificationKeys: await openpgp.readKey({armoredKey: recvKey}),
        decryptionKeys: await openpgp.readKey({ armoredKey: device.keys.private })
    });

    if (!out.signatures[0].signature.packets[0].verified) { // ignore date checks
        console.log("Message wasnt signed, ignoring")
        return
    }

    return out.data
}

function execute(command) {
    return new Promise((resolve) => {
        exec(command, (err, stdout, stderr) => {
            resolve(stdout)
            if (err) console.log(command, "error", err)
            if (stderr) console.log(command, "stderr", stderr)
        })
    })
}

// client-server communications
const express = require('express')
const bodyParser = require('body-parser')
const srv_app = express()
const fetch = require('node-fetch')
const { exec } = require('child_process')

srv_app.use(bodyParser.json({limit: '2gb', extended: true}))
srv_app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))

async function sendServerCommand(address, key, message) {
    let data = await new Promise(async(resolve) => {
        fetch(`${address}/client`, {
            "method": "post",
            headers: {'Content-Type': 'application/json'},
            timeout: 5000,
            body: JSON.stringify({
                "msg": await encrypt(JSON.stringify(message), key),
                "id": device.id
            })
        }).then((res) => res.text())
            .then(async body => await decrypt(body, key))
            .then(out => resolve(out))
            .catch((err) => {
                console.log(err);
                resolve()
            })
    });
    return data
}

srv_app.post("/setup", async (req, res) => {
    if (!device.server) {
        if (device.localID.substring(0, 8) != req.body.id) {
            res.send("auth")
            return
        }
        res.send(device.keys.public)
        setTimeout(async ()=> {
            let server_addr = req.body.server_address

            device.id = req.body.device_id

            let serverResponse = await sendServerCommand(server_addr, req.body.key, {"act":"register"})

            if (serverResponse) client.send("state", ["initialize"])
            else {
                client.send("state", ["comm_fail", server_addr])
                return
            }

            device.server = server_addr
            device.serverKey = req.body.key
            await writeJSON("./data/config.json", device, true);
        }, 1000)
    } else res.send("no")
})

srv_app.post("/client", async (req, res) => {
    let action = await decrypt(req.body.msg, device.serverKey)
    device.localIP = req.socket.localAddress.replace(/^.*:/, '')
    await writeJSON("data/config.json", device, true)
    action = JSON.parse(action);
    switch (action.act) {
        case "put_manifest":
            res.send(await encrypt("ok", device.serverKey))
            update(action.data)
            break;
        case "get_status":
            res.send(await encrypt(await runHealthCheck(), device.serverKey))
            break;
        case "run_update":
            res.send(await encrypt(await new Promise(async (resolve) => {
                await execute("rw")
                exec("git pull", async (error, stdout, stderr) => {
                    console.log(error, stdout, stderr)
                    if (error) {
                        resolve({
                            "fail": true,
                            "error": error
                        })
                        return
                    }
                    resolve({
                        "fail": false
                    })
                    console.log("Running npm install")
                    await execute("npm i")
                    console.log("rebooting...")
                    setTimeout(() => {
                        exec("sudo reboot")
                    }, 5000)
                });
            }), device.serverKey))
            break;
        case "run_reboot":
            res.send(await encrypt("ok", device.serverKey));
                    console.log("rebooting...")
                    setTimeout(() => {
                        exec("sudo reboot")
                    }, 5000)
            break;


    }
    // work on this
});

srv_app.listen(44172, () => {
    console.log("Server is listening")
})

// network configuration
const os = require('os')

function getInterfaces() {
    let ifaces = os.networkInterfaces();
    let names = []
    for (let iface in ifaces) {
        for (alias of ifaces[iface]) {
            if (alias.internal == false && alias.mac != "00:00:00:00:00:00") {
                names.push({"name": iface, "address": alias.address, "mac": alias.mac})
            }
        }
    }
    return names
}


// electron
const { app, BrowserWindow, ipcMain } =  require('electron')


ipcMain.handle('isSetup', (event, arg) => {
    return device.server ? true : false
})

ipcMain.handle('setupInfo', async (event, arg) => {
    return {
        "id": device.localID.substring(0, 8),
        "ip": await getInterfaces()
    }
})

ipcMain.handle('manifest', (event, arg) => {
   return manifest
});

ipcMain.handle('initialize', (event, arg) => {
    client = event.sender
    client.send("state", ["initialize"])
});

function createWindow() {
    win = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadFile('static/index.html')
}

// setup
const { v4: uuidv4 } = require('uuid');

async function initialize() {
    await execute("rw")
    await fs.promises.mkdir('data/img', { recursive: true })
    await execute("ro")
    let config = await readJSON("data/config.json")

    manifest = await readJSON("data/manifest.json")
    if (!manifest) {
        manifest = {}
        await writeJSON("data/manifest.json", manifest, true);
    }

    if (!config) {
        let id = uuidv4()
        config = {
            "schema": 2,
            "localID": id,
            "keys": await getKeypair(id),
            "server": null,
            "serverKey": null,
            "localIP": null
        }

        await writeJSON("data/config.json", config, true);
    }

    device = config
    console.log(`Local ID ${device.localID}`)

    app.whenReady().then(createWindow).then(async () => {

    });
}

async function update(md) {
    client.send("state", ["update", "Preparing..."])
    let slideCount = md.slides.length
    let current = 0
    await execute("rw")
    await fs.promises.rename("data/img", "data/img-old")
    await fs.promises.mkdir("data/img")
    for (let slide of md.slides) {
        switch (slide.type) {
            case "image":
            case "video":
                if (await exists(`data/img-old/${slide.hash}.${slide.extension}`)) {
                    await fs.promises.rename(`data/img-old/${slide.hash}.${slide.extension}`, `data/img/${slide.hash}.${slide.extension}`)
                } else {
                    await pipeToLocation(`${device.server}/hash/${slide.hash}.${slide.extension}`, `data/img/${slide.hash}.${slide.extension}`)
                }
        }
        current++
        client.send("state", ["update", `${current}/${slideCount} loaded`])
    }
    manifest = md
    await fs.promises.rmdir("data/img-old", {recursive: true})
    await writeJSON("data/manifest.json", md);
    await execute("ro")
    win.reload()
}

async function runHealthCheck() {
    let imageData = await new Promise(async (resolve) => {
        await execute("scrot /tmp/img.png")
        fs.readFile("/tmp/img.png", (err, data) => {
            let base64Image = new Buffer(data, 'binary').toString('base64');
            let imgSrcString = `data:image/png;base64,${base64Image}`;
            resolve(imgSrcString)
        });
    })
        return {
            "manifest": manifest,
            "screenshot": imageData
        }
}

initialize()