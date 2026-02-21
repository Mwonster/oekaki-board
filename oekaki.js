// oekaki.js

const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let color = document.getElementById("colorPicker").value;
let width = document.getElementById("penWidth").value;

let undoStack = [];
let submitConfirm = false;

let userId = localStorage.getItem("oekakiUserId");
if (!userId) {
    userId = "user_" + Math.random().toString(36).slice(2);
    localStorage.setItem("oekakiUserId", userId);
}

// Load saved brush size or default to 10
let savedWidth = localStorage.getItem("brushWidth");
width = savedWidth ? Number(savedWidth) : 10;

// Apply it to the slider and display
document.getElementById("penWidth").value = width;
document.getElementById("brushSizeDisplay").textContent = width;


function saveState() {
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 50) undoStack.shift();
}

canvas.addEventListener("mousedown", (e) => {
    saveState();
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
    document.getElementById("brushSizeDisplay").textContent = width;
});

canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
});

canvas.addEventListener("mouseleave", () => {
    drawing = false;
});

document.getElementById("colorPicker").addEventListener("change", (e) => {
    color = e.target.value;
});

document.getElementById("penWidth").addEventListener("input", (e) => {
    width = Number(e.target.value);
    document.getElementById("brushSizeDisplay").textContent = width;
    localStorage.setItem("brushWidth", width);
});


document.getElementById("undoBtn").addEventListener("click", () => {
    if (undoStack.length > 0) {
        const img = new Image();
        img.src = undoStack.pop();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

document.getElementById("clearBtn").addEventListener("click", () => {
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("submitBtn").addEventListener("click", () => {
    if (!submitConfirm) {
        submitConfirm = true;
        showMessage("Click again to submit.");

        setTimeout(() => {
            submitConfirm = false;
        }, 5000);

        return;
    }

    submitConfirm = false;

    const dataURL = canvas.toDataURL("image/png");
    const author = document.getElementById("authorInput").value.trim();

    // Firebase Storage upload
    const timestamp = Date.now();
    const filename = `oekaki/canvas_${timestamp}_${Math.floor(Math.random() * 100000)}.png`;
    const storageRef = storage.ref().child(filename);

    showMessage("Uploading...");

    storageRef.putString(dataURL, "data_url")
        .then(() => {
            // Save metadata to Firestore
            return db.collection("oekaki").add({
                path: filename,
                timestamp: timestamp,
                author: author || null
            });
        })
        .then(() => {
            showMessage("Image submitted successfully!");
            loadGallery();
        })
        .catch((err) => {
            console.error(err);
            showMessage("Upload failed.");
        });
});




function loadGallery() {
    const container = document.getElementById("submittedImages");
    if (!container) return;

    container.innerHTML = "Loading...";

    db.collection("oekaki")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get()
        .then((snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.textContent = "No images yet.";
                parent.postMessage({ type: "resize-iframe", height: document.body.scrollHeight }, "*");
                return;
            }

            function notifyParentHeight() {
                parent.postMessage({
                    type: "resize-iframe",
                    height: document.body.scrollHeight
                }, "*");
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const ts = data.timestamp || 0;
                const path = data.path;

                const date = new Date(ts);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const year = date.getFullYear().toString().slice(2);
                const hours = String(date.getHours()).padStart(2, "0");
                const mins = String(date.getMinutes()).padStart(2, "0");
                const timestampText = `${month}.${day}.${year} @ ${hours}:${mins}`;

                const wrapper = document.createElement("div");
                wrapper.className = "gallery-item";

                const label = document.createElement("div");
                label.className = "timestamp";

                label.innerHTML = `
                    <span class="date">${timestampText}</span>
                    ${data.author ? `<span class="author">${data.author}</span>` : ""}
                `;

                const img = document.createElement("img");

                img.addEventListener("load", notifyParentHeight);

                storage.ref().child(path).getDownloadURL()
                    .then((url) => {
                        img.src = url;
                    })
                    .catch(() => {
                        img.alt = "Failed to load image";
                    });

                wrapper.appendChild(img);
                wrapper.appendChild(label);
                container.appendChild(wrapper);
            });

            // Initial height update
            notifyParentHeight();
        })
        .catch((err) => {
            console.error(err);
            container.textContent = "Failed to load gallery.";
        });
}


function notifyParentHeight() {
    const height = document.body.scrollHeight;
    parent.postMessage({ type: "resize-iframe", height }, "*");
}


function showMessage(text, duration = 3000) {
    const msg = document.getElementById("message");
    if (!msg) return;

    msg.textContent = text;
    msg.style.display = "block";
    msg.style.opacity = "1";

    setTimeout(() => {
        msg.style.transition = "opacity 0.5s";
        msg.style.opacity = "0";
        msg.style.display = "none";
    }, duration);
}

window.addEventListener("load", loadGallery);
