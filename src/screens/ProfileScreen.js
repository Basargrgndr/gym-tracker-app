import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirestoreService from '../services/FirestoreService';
import { styles } from '../utils/styles';

const ProfileScreen = ({ navigate, userProfile, setUserProfile, saveProfile, logout, isAuthenticated, uid }) => {
  const [userInfo, setUserInfo] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    fitnessLevel: userProfile.fitnessLevel || 'beginner',
    equipment: userProfile.equipment || ['body only'],
    goals: userProfile.goals || ['strength'],
    workoutDuration: userProfile.workoutDuration || 'medium'
  });

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      // Load from AsyncStorage first (fast)
      const saved = await AsyncStorage.getItem('user_info');
      if (saved) {
        const savedInfo = JSON.parse(saved);
        setUserInfo(prev => ({
          ...prev,
          ...savedInfo,
          fitnessLevel: userProfile.fitnessLevel || savedInfo.fitnessLevel,
          equipment: userProfile.equipment || savedInfo.equipment,
          goals: userProfile.goals || savedInfo.goals,
          workoutDuration: userProfile.workoutDuration || savedInfo.workoutDuration
        }));
      }

      // Sync from Firestore in background (overwrites with latest)
      if (uid) {
        const remoteProfile = await FirestoreService.getUserProfile(uid);
        if (remoteProfile) {
          setUserInfo(prev => ({ ...prev, ...remoteProfile }));
          await AsyncStorage.setItem('user_info', JSON.stringify({ ...(saved ? JSON.parse(saved) : {}), ...remoteProfile }));
        }
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const saveUserInfo = async () => {
    try {
      await AsyncStorage.setItem('user_info', JSON.stringify(userInfo));

      const updatedProfile = {
        ...userInfo,
        fitnessLevel: userInfo.fitnessLevel,
        equipment: userInfo.equipment,
        goals: userInfo.goals,
        workoutDuration: userInfo.workoutDuration,
      };

      await saveProfile(updatedProfile); // updates App.js state + AsyncStorage + Firestore (via saveProfile)
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save user info:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    }
  };

  const updateProfile = (updates) => {
    const newInfo = { ...userInfo, ...updates };
    setUserInfo(newInfo);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            navigate('login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Profile</Text>
            <Text style={styles.screenSubtitle}>Manage your account & preferences</Text>
          </View>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigate('workout')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.profileInfoSection}>
            <Text style={styles.profileLabel}>Name</Text>
            <TextInput
              style={styles.profileInput}
              value={userInfo.name}
              onChangeText={(text) => setUserInfo({...userInfo, name: text})}
              placeholder="Enter your name"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.profileInfoSection}>
            <Text style={styles.profileLabel}>Age</Text>
            <TextInput
              style={styles.profileInput}
              value={userInfo.age}
              onChangeText={(text) => setUserInfo({...userInfo, age: text})}
              placeholder="Enter your age"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.profileInfoSection}>
            <Text style={styles.profileLabel}>Height (cm)</Text>
            <TextInput
              style={styles.profileInput}
              value={userInfo.height}
              onChangeText={(text) => setUserInfo({...userInfo, height: text})}
              placeholder="Enter your height"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.profileInfoSection}>
            <Text style={styles.profileLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.profileInput}
              value={userInfo.weight}
              onChangeText={(text) => setUserInfo({...userInfo, weight: text})}
              placeholder="Enter your weight"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Fitness Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Level</Text>
          <View style={styles.optionsGrid}>
            {[
              { key: 'beginner', label: 'Beginner', desc: 'New to fitness' },
              { key: 'intermediate', label: 'Intermediate', desc: '6+ months experience' },
              { key: 'advanced', label: 'Advanced', desc: '2+ years experience' }
            ].map(level => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.optionCard,
                  userInfo.fitnessLevel === level.key && styles.selectedOption
                ]}
                onPress={() => updateProfile({ fitnessLevel: level.key })}
              >
                <Text style={[
                  styles.optionLabel,
                  userInfo.fitnessLevel === level.key && styles.selectedOptionText
                ]}>
                  {level.label}
                </Text>
                <Text style={[
                  styles.optionDesc,
                  userInfo.fitnessLevel === level.key && styles.selectedOptionDesc
                ]}>
                  {level.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Equipment</Text>
          <Text style={styles.sectionDesc}>Select all that you have access to</Text>
          <View style={styles.optionsGrid}>
            {[
              { key: 'body only', label: 'Body Only', icon: '🤸' },
              { key: 'dumbbell', label: 'Dumbbells', icon: '🏋️' },
              { key: 'barbell', label: 'Barbell', icon: '🏋️‍♀️' },
              { key: 'pull-up bar', label: 'Pull-up Bar', icon: '🆙' }
            ].map(equipment => (
              <TouchableOpacity
                key={equipment.key}
                style={[
                  styles.optionCard,
                  userInfo.equipment.includes(equipment.key) && styles.selectedOption
                ]}
                onPress={() => {
                  const updated = userInfo.equipment.includes(equipment.key)
                    ? userInfo.equipment.filter(e => e !== equipment.key)
                    : [...userInfo.equipment, equipment.key];
                  updateProfile({ equipment: updated });
                }}
              >
                <Text style={styles.optionIcon}>{equipment.icon}</Text>
                <Text style={[
                  styles.optionLabel,
                  userInfo.equipment.includes(equipment.key) && styles.selectedOptionText
                ]}>
                  {equipment.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>
          <Text style={styles.sectionDesc}>What do you want to achieve?</Text>
          <View style={styles.optionsGrid}>
            {[
              { key: 'strength', label: 'Build Strength', icon: '💪' },
              { key: 'cardio', label: 'Improve Cardio', icon: '❤️' },
              { key: 'muscle building', label: 'Build Muscle', icon: '🦵' },
              { key: 'weight loss', label: 'Lose Weight', icon: '⚖️' }
            ].map(goal => (
              <TouchableOpacity
                key={goal.key}
                style={[
                  styles.optionCard,
                  userInfo.goals.includes(goal.key) && styles.selectedOption
                ]}
                onPress={() => {
                  const updated = userInfo.goals.includes(goal.key)
                    ? userInfo.goals.filter(g => g !== goal.key)
                    : [...userInfo.goals, goal.key];
                  updateProfile({ goals: updated });
                }}
              >
                <Text style={styles.optionIcon}>{goal.icon}</Text>
                <Text style={[
                  styles.optionLabel,
                  userInfo.goals.includes(goal.key) && styles.selectedOptionText
                ]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Duration</Text>
          <View style={styles.optionsGrid}>
            {[
              { key: 'short', label: 'Quick', desc: '15-20 min' },
              { key: 'medium', label: 'Standard', desc: '30-40 min' },
              { key: 'long', label: 'Extended', desc: '45-60 min' }
            ].map(duration => (
              <TouchableOpacity
                key={duration.key}
                style={[
                  styles.optionCard,
                  userInfo.workoutDuration === duration.key && styles.selectedOption
                ]}
                onPress={() => updateProfile({ workoutDuration: duration.key })}
              >
                <Text style={[
                  styles.optionLabel,
                  userInfo.workoutDuration === duration.key && styles.selectedOptionText
                ]}>
                  {duration.label}
                </Text>
                <Text style={[
                  styles.optionDesc,
                  userInfo.workoutDuration === duration.key && styles.selectedOptionDesc
                ]}>
                  {duration.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={saveUserInfo}
          >
            <Text style={styles.primaryButtonText}>Save Changes</Text>
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;