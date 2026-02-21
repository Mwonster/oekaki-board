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

// Load saved brush size or default to 5
let savedWidth = localStorage.getItem("brushWidth");
width = savedWidth ? Number(savedWidth) : 5;


// Shared lightbox elements
const lightboxGallery = document.getElementById('lightboxGallery');
const lightboxGalleryImg = document.getElementById('lightboxGallery-img');
const lightboxGalleryClose = document.getElementById('lightboxGallery-close');
const prevBtn = document.getElementById('previous-button-gallery');
const nextBtn = document.getElementById('next-button-gallery');
const autoplayBtn = document.getElementById('autoplay-btn');

let currentGallery = null;
let currentIndex = 0;
let autoplayInterval = null;

function initGallery(galleryId, playlistPath) {
const gallery = document.getElementById(galleryId);
if (!gallery) return;

let images = [];

fetch(playlistPath)
    .then(res => res.json())
    .then(data => {
    images = data.images || data;
    buildGallery(gallery, images);
    });

function buildGallery(gallery, images) {
    images.forEach((item, index) => {
    const cardOfGallery = document.createElement('article');
    cardOfGallery.className = 'cardOfGallery';

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.loading = 'lazy';

    cardOfGallery.appendChild(img);
    gallery.appendChild(cardOfGallery);

    cardOfGallery.addEventListener('click', () => openlightboxGallery(images, index));
    });
}
}

function openlightboxGallery(images, index) {
    currentGallery = images;
    currentIndex = index;
    const item = currentGallery[currentIndex];
    lightboxGalleryImg.src = item.src;
    lightboxGalleryImg.alt = item.alt;
    lightboxGallery.style.display = 'flex';

    parent.postMessage({ type: "expand-iframe" }, "*");


    if (autoplayInterval) {
        resetProgressBar();
    }

}

function closelightboxGallery() {
    lightboxGallery.style.display = 'none';
    lightboxGalleryImg.src = '';
    currentGallery = null;

    parent.postMessage({ type: "shrink-iframe" }, "*");

    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        autoplayBtn.textContent = "▶ Autoplay";
    }
}

function resetProgressBar() {
    const bar = document.getElementById("lightboxProgress");
    if (!bar) return;

    bar.style.display = "block";     // show it when autoplay is active
    bar.style.transition = "none";
    bar.style.width = "0%";

    void bar.offsetWidth;            // force reflow

    bar.style.transition = "width 3s linear";
    bar.style.width = "100%";
}


function showPrev() {
    if (!currentGallery) return;
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    openlightboxGallery(currentGallery, currentIndex);
    }

    function showNext() {
    if (!currentGallery) return;
    currentIndex = (currentIndex + 1) % currentGallery.length;
    openlightboxGallery(currentGallery, currentIndex);

    if (autoplayInterval) resetProgressBar();
}

function startAutoplay() {
    if (!currentGallery) return;

    const bar = document.getElementById("lightboxProgress");

    if (!autoplayInterval) {
        autoplayInterval = setInterval(showNext, 3000);
        autoplayBtn.textContent = "⏸ Stop";

        resetProgressBar(); // start bar animation
    } else {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        autoplayBtn.textContent = "▶ Autoplay";

        // Hide + freeze bar
        bar.style.display = "none";
        bar.style.transition = "none";
        bar.style.width = "0%";
    }
}


// Lightbox listeners
if (lightboxGallery && lightboxGalleryClose && prevBtn && nextBtn && autoplayBtn) {
    lightboxGalleryClose.addEventListener('click', closelightboxGallery);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);
    autoplayBtn.addEventListener('click', startAutoplay);

    lightboxGallery.addEventListener('click', (e) => {
        if (e.target === lightboxGallery) closelightboxGallery();
    });
}





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


let oekakiImages = [];

function loadGallery() {
    const container = document.getElementById("submittedImages");
    if (!container) return;

    oekakiImages = [];
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

                        // ⭐ Add to lightbox array
                        oekakiImages.push({
                            src: url,
                            alt: data.author ? `Drawing by ${data.author}` : "Oekaki drawing"
                        });

                        // ⭐ Make image clickable for lightbox
                        img.addEventListener("click", () => {
                            const index = oekakiImages.findIndex(i => i.src === url);
                            openlightboxGallery(oekakiImages, index);
                        });
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
    const height = document.body.scrollHeight + 20;
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


 
