const width = 1920
const height = 1080
const normalRatio = width/height

const { ipcRenderer } = require('electron')

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
    document.getElementById("static").style.display = "none"
    document.getElementById("configured").style.display = "none"
    document.getElementById("loading").style.display = "none"
    document.getElementById("comm_fail").style.display = "none"
    document.getElementById("main").style.display = "none"
    document.getElementById("warning").style.display = "none"
}

async function initialize() {
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
        document.getElementById("static").style.display = "block"
        return
    }
    let manifest = await get("manifest");

    if (JSON.stringify(manifest) == "{}") {
        document.getElementById("configured").style.display = "block"
        return
    }
}

function update(value) {
    hideAll()
    document.getElementById("loadingProgress").innerHTML = value
    document.getElementById("loading").style.display = "block"
}

ipcRenderer.on("state", (event, msg) => {
    switch (msg[0]) {
        case "initialize":
            initialize()
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
