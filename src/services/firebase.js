// src/services/firebase.js
// Firebase configuration for React Native

// Import the main Firebase app and specific modules
import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Log to verify modules are loading
console.log('Firebase modules imported successfully');

// Export the modules
export { firebase, firestore, auth };

// Helper functions
export const FirebaseService = {
  // Test if Firebase app is initialized
  testApp: () => {
    try {
      const app = firebase.app();
      console.log('Firebase app initialized:', app.name);
      return true;
    } catch (error) {
      console.error('Firebase app test failed:', error);
      return false;
    }
  },

  // Test if modules are available
  testModules: () => {
    try {
      console.log('Testing Firebase modules...');
      console.log('Firebase app available:', typeof firebase);
      console.log('Firestore available:', typeof firestore);
      console.log('Auth available:', typeof auth);
      return true;
    } catch (error) {
      console.error('Firebase modules test failed:', error);
      return false;
    }
  },

  // Test Firestore connection
  testFirestore: () => {
    try {
      const db = firestore();
      console.log('Firestore instance created');
      return true;
    } catch (error) {
      console.error('Firestore test failed:', error);
      return false;
    }
  },

  // Get current user
  getCurrentUser: () => {
    try {
      return auth().currentUser;
    } catch (error) {
      console.error('Get current user failed:', error);
      return null;
    }
  }
};