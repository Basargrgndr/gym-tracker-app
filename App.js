import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import GeneratedWorkoutScreen from './src/screens/GeneratedWorkoutScreen';
import ProgramsScreen from './src/screens/ProgramsScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import { styles } from './src/utils/styles';
import ExerciseAPI from './src/services/ExerciseAPI';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [userProfile, setUserProfile] = useState({
    fitnessLevel: 'beginner',
    equipment: ['body only'], 
    goals: ['strength'],
    workoutDuration: 'medium'
  });
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    ExerciseAPI.preloadExercises(); // Preload exercises in background
    try {
      const userData = await AsyncStorage.getItem('user_data');
      const profileData = await AsyncStorage.getItem('user_profile');
      
      if (userData) {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        
        if (profileData) {
          setUserProfile(JSON.parse(profileData));
        }
        
        // If user is authenticated, go to workout screen
        setCurrentScreen('workout');
      } else {
        // No user data, show login screen
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setCurrentScreen('login');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['user_data', 'user_profile', 'user_info']);
      setIsAuthenticated(false);
      setCurrentScreen('login');
      setUserProfile({
        fitnessLevel: 'beginner',
        equipment: ['body only'], 
        goals: ['strength'],
        workoutDuration: 'medium'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const saveProfile = async (profile) => {
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      setUserProfile(profile);
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