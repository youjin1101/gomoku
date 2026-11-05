// Firebase SDK 가져오기
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue
} from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

// Firebase 프로젝트 설정
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYE9kkdT_8fYzr7x6resQ33fbEVgPYU3M",
  authDomain: "gomoku-3834e.firebaseapp.com",
  projectId: "gomoku-3834e",
  storageBucket: "gomoku-3834e.firebasestorage.app",
  messagingSenderId: "51749043317",
  appId: "1:51749043317:web:d41637a52d28794bac8c3c"
};

// Initialize Firebase(Firebase 초기화)
const app = initializeApp(firebaseConfig);

// Firebase 서비스 연결
const db = getDatabase(app);
const auth = getAuth(app);

// 다른 파일에서 사용할 수 있도록 내보내기
export {
  db,
  auth,
  ref,
  set,
  update,
  onValue,
  runTransaction,
  signInAnonymously
};