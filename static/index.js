let nonce, manifest
let img = document.getElementById("main")
const width = 1920
const height = 1080
const normalRatio = width/height
let current = Math.random()

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        resolve(response.text());
    });
}

async function runLoop() {
    let tmp_current = current
    let changes = 0;
    let delay = 0;
    for (frame in manifest) {
        if (tmp_current == current) {
            if (new Date(manifest[frame].expiration) > new Date() || manifest[frame].expiration == 0) {
                changes++
                let data = await get(`/image/${manifest[frame].hash}`);
                var i = new Image(); 
                i.onload = async () => {
                    ratio = i.width/i.height
                    console.log(ratio, normalRatio)
                    if (normalRatio <= ratio) {
                        img.style.width = "100%";
                        img.style.height = "auto";
                    } else {
                        img.style.width = "auto";
                        img.style.height = "100%";
                    }
                    document.getElementById("main").src = data
                }
                i.src = data
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

async function init() {
    current = Math.random()
    manifest = JSON.parse(await get("/manifest"))
    nonce = manifest.nonce
    manifest = manifest.data
    runLoop();
}

init();

setInterval(async () => {
    if (JSON.parse(await get("/ping")).nonce != nonce) {
        console.log("new manifest");
        init()
    }
}, 1000);