// src/services/FirestoreService.js
// Centralized Firestore operations for GymApp

import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FirestoreService = {
  // ─── User Profile ────────────────────────────────────────────

  saveUserProfile: async (uid, profileData) => {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('profile')
        .set(profileData, { merge: true });
    } catch (error) {
      console.error('FirestoreService.saveUserProfile failed:', error);
      throw error;
    }
  },

  getUserProfile: async (uid) => {
    try {
      const doc = await firestore()
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('profile')
        .get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('FirestoreService.getUserProfile failed:', error);
      return null;
    }
  },

  saveUserMeta: async (uid, metaData) => {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .set(metaData, { merge: true });
    } catch (error) {
      console.error('FirestoreService.saveUserMeta failed:', error);
      throw error;
    }
  },

  // ─── Workout History ─────────────────────────────────────────

  saveWorkoutToHistory: async (uid, workoutData) => {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .collection('workoutHistory')
        .add({
          ...workoutData,
          savedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('FirestoreService.saveWorkoutToHistory failed:', error);
      // Non-fatal — local AsyncStorage already saved it
    }
  },

  getWorkoutHistory: async (uid, limit = 50) => {
    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(uid)
        .collection('workoutHistory')
        .orderBy('completedAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('FirestoreService.getWorkoutHistory failed:', error);
      return null;
    }
  },

  // ─── Programs ────────────────────────────────────────────────

  saveProgram: async (uid, program) => {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .collection('programs')
        .doc(program.id)
        .set(program, { merge: true });
    } catch (error) {
      console.error('FirestoreService.saveProgram failed:', error);
      // Non-fatal — local AsyncStorage already saved it
    }
  },

  getPrograms: async (uid) => {
    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(uid)
        .collection('programs')
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('FirestoreService.getPrograms failed:', error);
      return null;
    }
  },

  deleteProgram: async (uid, programId) => {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .collection('programs')
        .doc(programId)
        .delete();
    } catch (error) {
      console.error('FirestoreService.deleteProgram failed:', error);
      // Non-fatal — local copy already deleted
    }
  },

  // ─── Migration ───────────────────────────────────────────────

  migrateFromLocalStorage: async (uid) => {
    try {
      const migrationKey = `firebase_migrated_${uid}`;
      const alreadyMigrated = await AsyncStorage.getItem(migrationKey);
      if (alreadyMigrated) return;

      const [historyRaw, programsRaw, userInfoRaw] = await Promise.all([
        AsyncStorage.getItem('workout_history'),
        AsyncStorage.getItem('workout_programs_v2'),
        AsyncStorage.getItem('user_info'),
      ]);

      const batch = firestore().batch();
      const userRef = firestore().collection('users').doc(uid);

      // Migrate user profile
      if (userInfoRaw) {
        const userInfo = JSON.parse(userInfoRaw);
        const profileRef = userRef.collection('settings').doc('profile');
        batch.set(profileRef, userInfo, { merge: true });
      }

      // Migrate programs
      if (programsRaw) {
        const programs = JSON.parse(programsRaw);
        programs.forEach(program => {
          const programRef = userRef.collection('programs').doc(program.id);
          batch.set(programRef, program, { merge: true });
        });
      }

      await batch.commit();

      // Migrate workout history separately (can be large, batch limit is 500)
      if (historyRaw) {
        const history = JSON.parse(historyRaw);
        for (const entry of history.slice(0, 50)) {
          await userRef.collection('workoutHistory').add({
            ...entry,
            savedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await AsyncStorage.setItem(migrationKey, 'true');
      console.log('FirestoreService: migration complete for uid', uid);
    } catch (error) {
      console.error('FirestoreService.migrateFromLocalStorage failed:', error);
      // Non-fatal — user can still use the app
    }
  },
};

export default FirestoreService;
