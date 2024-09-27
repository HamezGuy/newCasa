"use client"; // Ensures the component is rendered on the client-side

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../config/firebase'; // Ensure this is correctly set up

const TestFirestorePage = () => {
  const [testResult, setTestResult] = useState<string>('Testing Firestore...');

  useEffect(() => {
    // Function to add and then test Firestore connection
    const addAndTestFirestore = async () => {
      try {
        console.log("Adding document to Firestore...");

        const docRef = doc(db, 'users', '123'); // Use a test user ID or random one for each test

        await setDoc(docRef, {
          name: "John Doe",    // Fields you want to add
          email: "johndoe@example.com",
          age: 30
        });

        console.log("Document added! Attempting to fetch document from Firestore...");

        // Fetch the document after adding it
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('Document data:', docSnap.data()); // Logs the document data
          setTestResult('Document fetched successfully. Data: ' + JSON.stringify(docSnap.data()));
        } else {
          console.log('No such document!');
          setTestResult('No document found in Firestore.');
        }
      } catch (error) {
        console.error('Error connecting to Firestore:', error);
        
        // Type assertion to check if error has a message property
        const errorMessage = (error as Error).message || "An unknown error occurred";
        setTestResult('Error connecting to Firestore: ' + errorMessage);
      }
    };

    addAndTestFirestore(); 
  }, []);

  return (
    <div>
      <h1>Firestore Add and Fetch Test</h1>
      <p>{testResult}</p>
      <p>Check the console for detailed results.</p>
    </div>
  );
};

export default TestFirestorePage;
