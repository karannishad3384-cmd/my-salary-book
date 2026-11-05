import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD1Fe_Vli4Ww16vfL0NcJrPGLN8KhJ3PnI",
  authDomain: "my-salary-book-15788.firebaseapp.com",
  projectId: "my-salary-book-15788",
  storageBucket: "my-salary-book-15788.firebasestorage.app",
  messagingSenderId: "234888494436",
  appId: "1:234888494436:web:1a111d9395d6d13ee54e71"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
