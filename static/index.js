let nonce, manifest
let img = document.getElementById("main")
const width = 1920
const height = 1080
const normalRatio = width/height
let current = Math.random()

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

async function runLoop() {
    warningCheck()
    let tmp_current = current
    let changes = 0;
    let delay = 0;
    for (frame in manifest) {
        if (tmp_current == current) {
            if (new Date(manifest[frame].expiration) > new Date() || manifest[frame].expiration == 0) {
                changes++
                let data = (await get('getImage', manifest[frame].hash))
                var i = new Image(); 
                i.onload = async () => {
                    ratio = i.width/i.height
                    if (normalRatio <= ratio) {
                        img.style.width = "100%";
                        img.style.height = "auto";
                    } else {
                        img.style.width = "auto";
                        img.style.height = "100%";
                    }
                    document.getElementById("main").src =  data
                }
                i.src =  data
                await sleep(manifest[frame].screentime*1000)
            }
        }
    }
    if (changes == 0) {
        document.getElementById("main").src  = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D"
        delay = 1000
    }

    if (tmp_current == current) {
        setTimeout(runLoop, delay);
    } else {
        console.log("Changed current, not restarting");
    }
}
async function warningCheck() {
    let warnings = await get('warnings')
    let warner = document.getElementById("warning")
    let addTo = ""
    for (let warning of warnings) {
        switch (warning) {
            case "NOPASSWORD": 
                addTo += "<b>WARNING:</b> The default password is still set, anyone can change device configuration<br>";
                break;
            case "NOMANIFEST":
                addTo += "<b>WARNING:</b> No manifest is loaded. Please add this device to a server.<br> <b>Possible network addresses:</b><br><table><tr><td>Name</td><td>IP</td><td>MAC Address</td></tr></tr>"
                let interfaces = await get("interfaces")
                for (let interface of interfaces) {
                    console.log(interface);
                    addTo += `<tr><td>${interface.name}</td><td>${interface.address}</td><td>${interface.mac}</td></tr>`
                }
                addTo += "</table>"
                break;
            case "CPROC":
                let totals = await get("currentlyProcessing")
                addTo += `<span color='white' class='updater'>${totals[1]-totals[0]} of ${totals[1]} slides added</span>`
                break;
            case "NOSLIDES":
                addTo += "<b>WARNING:</b> This device has no slides to show"
                break;
        }
    }
    warner.innerHTML = addTo
}

async function init() {
    current = Math.random()
    manifest = await get("manifest", 0)
    if (manifest == "new manifest") {
        manifest = {}
    }
    nonce = manifest.nonce
    manifest = manifest.data
    runLoop();
}

init();

setInterval(async () => {
    warningCheck()
    if ((await get("ping", 0)).nonce != nonce) {
        init()
    }
}, 1000);