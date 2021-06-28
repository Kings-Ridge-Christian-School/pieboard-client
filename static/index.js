const width = 1920
const height = 1080
const normalRatio = width/height

const electron = window.require('electron');
const ipcRenderer  = electron.ipcRenderer;

import { define } from '../node_modules/synergy/dist/synergy.min.js'

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function get(message, content) {
    return new Promise((resolve) => {
        ipcRenderer.invoke(message, content).then((result) => {
            resolve(result)
        })
    });
}

function hideAll() {
    document.getElementById("configured").style.display = "none"
    document.getElementById("loading").style.display = "none"
    document.getElementById("comm_fail").style.display = "none"
    document.getElementById("main").style.display = "none"
    document.getElementById("warning").style.display = "none"
    document.getElementById("new").style.display = "none"
}

async function initializeFront() {
    hideAll()

    if (!await get("isSetup")) {
        let info = await get("setupInfo")
        document.getElementById("newInitCode").innerHTML = info.id
        let ipList = "<table style='width: 100%'>"
        for (let ip of info.ip) {
            ipList += `<tr><td>${ip.name}</td><td>${ip.address}</td><td>${ip.mac}</td></tr>`
        }
        ipList += "</table>"
        document.getElementById("newIPAddr").innerHTML = ipList
        document.getElementById("new").style.display = "block"
        return
    }
    let manifest = await get("manifest");

    if (JSON.stringify(manifest) == "{}") {
        document.getElementById("configured").style.display = "block"
        return
    }

    document.getElementById("main").style.display = 'block'
    id = manifest.id
    runner(manifest);
}

let id;

function replaceCurrent(elem) {

    function removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    removeAllChildNodes(document.getElementById("current"))
    document.getElementById("current").appendChild(elem)
}

async function runner(manifest) {
    let slide = 0
    let slideCount = 0
    for (let slide of manifest.slides) {
        if (id != manifest.id) return
        switch (slide.type) {
            case "image":
                let img = document.createElement("img")
                img.className = "insert"
                img.addEventListener('load', () => {
                    let ratio = img.width/img.height
                    if (normalRatio <= ratio) {
                        img.style.width = "100%";
                        img.style.height = "auto";
                    } else {
                        img.style.width = "auto";
                        img.style.height = "100%";
                    }
                    replaceCurrent(img)
                })
                img.addEventListener("error", (err) => console.log(err))
                img.src = `../data/img/${slide.hash}.${slide.extension}`
                await sleep(slide.screentime*1000)
                break;
            case "video":
                let vod = document.createElement("video")
                vod.className = "insert"
                vod.addEventListener("canplay", () => {
                    let ratio = vod.videoWidth/vod.videoHeight
                    if (normalRatio <= ratio) {
                        vod.style.width = "100%";
                        vod.style.height = "auto";
                    } else {
                        vod.style.width = "auto";
                        vod.style.height = "100%";
                    }

                    vod.volume = slide.volume/100
                    replaceCurrent(vod)
                    vod.play()
                });

                vod.src = `../data/img/${slide.hash}.${slide.extension}`
                await new Promise(r => {
                    vod.addEventListener("ended", ()=> {
                        r()
                    })
                })
                break;
        }
    }
    setImmediate(runner, manifest)
}

function update(value) {
    hideAll()
    document.getElementById("loadingProgress").innerHTML = value
    document.getElementById("loading").style.display = "block"
}

ipcRenderer.on("state", (event, msg) => {
    switch (msg[0]) {
        case "initialize":
            initializeFront()
            break;
        case "update":
            update(msg[1])
            break;
        case "comm_fail":
            hideAll()
            document.getElementById("comm_failIP").innerHTML = msg[1]
            document.getElementById("comm_fail").style.display = "block"
            break;
    }
});

let warnings = {}

function updateWarnings() {
    let out = ""
    for (let [name, data] of Object.entries(warnings)) {
        out += data
    }
    document.getElementById("warning").innerHTML = out
    if (out != "") document.getElementById("warning").style.display = ""
}

ipcRenderer.on("warning", async (event, msg) => {
    switch (msg[0]) {
        case "ip_change":
            if (msg[1] == false) {
                delete warnings.ip_change
                return
            }
            let info = await get("setupInfo")
            let ipList = "<div class='tt'><table style='width: 100%'>"
            for (let ip of info.ip) {
                ipList += `<tr><td>${ip.name}</td><td>${ip.address}</td><td>${ip.mac}</td></tr>`
            }
            ipList += "</table></div>"
            warnings.ip_change = `<b>The device IP has changed!</b>${ipList}`
    }

    updateWarnings()
})

get("initialize")