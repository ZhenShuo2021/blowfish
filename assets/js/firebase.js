import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

let app, db, auth, oids;
try {
  const configEl = document.getElementById("firebase-config");
  if (!configEl?.textContent) {
    throw new Error("Firebase config element not found");
  }

  const data = JSON.parse(configEl.textContent);
  app = initializeApp(data.config);

  oids = {
    views: configEl.getAttribute("data-views"),
    likes: configEl.getAttribute("data-likes"),
  };

  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase initialization failed:", e.message);
  document
    .querySelectorAll(
      '[id^="views_"], [id^="likes_"], #button_likes_heart, #button_likes_emtpty_heart, #button_likes_text',
    )
    .forEach((el) => el.remove());
  throw e;
}

const id = oids?.views?.replaceAll("/", "-");
const id_likes = oids?.likes?.replaceAll("/", "-");
let liked = false;
let authReady = false;

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateDisplay(collection, nodeId) {
  const node = document.getElementById(nodeId);
  if (!node) return;

  const docId = nodeId.replaceAll("/", "-");
  onSnapshot(
    doc(db, collection, docId),
    (snapshot) => {
      node.innerText = snapshot.exists() ? formatNumber(snapshot.data()[collection]) : 0;
      node.className = "";
    },
    (error) => {
      console.error("Firebase snapshot update failed:", error);
    },
  );
}

async function recordView(id) {
  if (!id || localStorage.getItem(id)) return;

  try {
    const ref = doc(db, "views", id);
    const snap = await getDoc(ref);

    snap.exists() ? await updateDoc(ref, { views: increment(1) }) : await setDoc(ref, { views: 1 });

    localStorage.setItem(id, true);
  } catch (e) {
    console.error("Record view operation failed:", e.message);
  }
}

function updateButton(isLiked) {
  const heart = document.getElementById("button_likes_heart");
  const empty = document.getElementById("button_likes_emtpty_heart");
  const text = document.getElementById("button_likes_text");

  if (heart) heart.style.display = isLiked ? "" : "none";
  if (empty) empty.style.display = isLiked ? "none" : "";
  if (text) text.innerText = isLiked ? "" : "\xa0Like";
}

async function toggleLike(add) {
  if (!id_likes || !authReady) return;

  try {
    const ref = doc(db, "likes", id_likes);
    const snap = await getDoc(ref);

    liked = add;
    add ? localStorage.setItem(id_likes, true) : localStorage.removeItem(id_likes);
    updateButton(add);

    snap.exists()
      ? await updateDoc(ref, { likes: increment(add ? 1 : -1) })
      : await setDoc(ref, { likes: add ? 1 : 0 });
  } catch (e) {
    console.error("Like operation failed:", e.message);
    liked = !add;
    add ? localStorage.removeItem(id_likes) : localStorage.setItem(id_likes, true);
    updateButton(!add);
  }
}

signInAnonymously(auth)
  .then(() => {
    authReady = true;

    document.querySelectorAll("span[id^='views_']").forEach((node) => {
      if (node.id) updateDisplay("views", node.id);
    });

    document.querySelectorAll("span[id^='likes_']").forEach((node) => {
      if (node.id) updateDisplay("likes", node.id);
    });

    recordView(id);

    if (id_likes && localStorage.getItem(id_likes)) {
      liked = true;
      updateButton(true);
    }
  })
  .catch((error) => {
    console.error("Firebase anonymous sign-in failed:", error.message);
    authReady = false;
  });

window.process_article = () => toggleLike(!liked);
