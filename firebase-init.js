 // Your config
  const firebaseConfig = {
    apiKey: "AIzaSyCGeBapMI0SunDcaCXhi4xf8LXeK0ng0Qw",
    authDomain: "mwonster-master.firebaseapp.com",
    databaseURL: "https://mwonster-master-default-rtdb.firebaseio.com",
    projectId: "mwonster-master",
    storageBucket: "mwonster-master.appspot.com",
    messagingSenderId: "812863505828",
    appId: "1:812863505828:web:1430efb825951553662d31",
    measurementId: "G-90G2VEMZCZ"
  };

  firebase.initializeApp(firebaseConfig);

  const db = firebase.firestore();
  const storage = firebase.storage();
