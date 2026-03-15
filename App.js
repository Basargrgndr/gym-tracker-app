import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import GeneratedWorkoutScreen from './src/screens/GeneratedWorkoutScreen';
import ProgramsScreen from './src/screens/ProgramsScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import MeasurementsScreen from './src/screens/MeasurementsScreen';
import { styles } from './src/utils/styles';
import ExerciseAPI from './src/services/ExerciseAPI';
import FirestoreService from './src/services/FirestoreService';

const DEFAULT_PROFILE = {
  fitnessLevel: 'beginner',
  equipment: ['body only'],
  goals: ['strength'],
  workoutDuration: 'medium',
};

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    ExerciseAPI.preloadExercises();

    let unsubscribe = () => {};

    try {
      // Try Firebase Auth — falls back to AsyncStorage if Firebase isn't configured
      unsubscribe = auth().onAuthStateChanged(async (user) => {
        if (user) {
          setIsAuthenticated(true);
          setUid(user.uid);

          // Load profile: AsyncStorage first (fast), then Firestore in background
          try {
            const localProfile = await AsyncStorage.getItem('user_profile');
            if (localProfile) setUserProfile(JSON.parse(localProfile));
          } catch (_) {}

          FirestoreService.getUserProfile(user.uid).then(remoteProfile => {
            if (remoteProfile) {
              setUserProfile(remoteProfile);
              AsyncStorage.setItem('user_profile', JSON.stringify(remoteProfile)).catch(() => {});
            }
          });

          setCurrentScreen('workout');
        } else {
          // Check for guest session (AsyncStorage only)
          await checkLocalSession();
        }
      });
    } catch (firebaseError) {
      // Firebase not configured — fall back to AsyncStorage-only mode
      console.warn('Firebase unavailable, using local storage:', firebaseError.message);
      checkLocalSession();
    }

    return () => unsubscribe();
  }, []);

  const checkLocalSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.isLoggedIn || parsed.isGuest) {
          setIsAuthenticated(true);
          setUid(null);
          const profileData = await AsyncStorage.getItem('user_profile');
          if (profileData) setUserProfile(JSON.parse(profileData));
          setCurrentScreen('workout');
          return;
        }
      }
    } catch (_) {}
    setIsAuthenticated(false);
    setUid(null);
    setCurrentScreen('login');
  };

  const logout = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      const isGuest = userData ? JSON.parse(userData).isGuest : false;

      if (!isGuest) {
        try { await auth().signOut(); } catch (_) {}
      }
      await AsyncStorage.multiRemove(['user_data', 'user_profile', 'user_info']);
      setIsAuthenticated(false);
      setUid(null);
      setCurrentScreen('login');
      setUserProfile(DEFAULT_PROFILE);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const saveProfile = async (profile) => {
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      setUserProfile(profile);
      if (uid) {
        FirestoreService.saveUserProfile(uid, profile).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  // Navigation functions
  const navigate = (screen) => {
    setCurrentScreen(screen);
  };

  // Screen props object
  const screenProps = {
    navigate,
    userProfile,
    setUserProfile,
    saveProfile,
    currentWorkout,
    setCurrentWorkout,
    logout,
    isAuthenticated,
    uid,
  };

  // Show loading screen briefly
  if (currentScreen === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonTitle}>Loading...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  // Main render logic
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen {...screenProps} />;
      case 'welcome':
        return <WelcomeScreen {...screenProps} />;
      case 'profile':
        return <ProfileScreen {...screenProps} />;
      case 'workout':
        return <WorkoutScreen {...screenProps} />;
      case 'generated_workout':
        return <GeneratedWorkoutScreen {...screenProps} />;
      case 'programs':
        return <ProgramsScreen {...screenProps} />;
      case 'ai_chat':
        return <AIChatScreen {...screenProps} />;
      case 'progress':
        return <ProgressScreen {...screenProps} />;
      case 'measurements':
        return <MeasurementsScreen {...screenProps} />;
      default:
        return isAuthenticated ? <WorkoutScreen {...screenProps} /> : <LoginScreen {...screenProps} />;
    }
  };

  return (
    <SafeAreaProvider>
      {renderCurrentScreen()}
    </SafeAreaProvider>
  );
};

export default App;