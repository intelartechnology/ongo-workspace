import { getFirestore } from 'firebase/firestore/lite';
import { initializeApp } from '@firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIkvBLF-Iq3G_KTFTeQ-2n6rpHW0mQvCk",
  authDomain: "ongo-51f62.firebaseapp.com",
  databaseURL: "https://ongo-51f62-default-rtdb.firebaseio.com",
  projectId: "ongo-51f62",
  storageBucket: "ongo-51f62.appspot.com",
  messagingSenderId: "175337592608",
  appId: "1:175337592608:web:4700275583141c17b76945",
  measurementId: "G-4WCHWG8Z8N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);