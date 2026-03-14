import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FirestoreService from '../services/FirestoreService';
import { styles } from '../utils/styles';

const DEFAULT_PROFILE = {
  fitnessLevel: 'beginner',
  equipment: ['body only'],
  goals: ['strength'],
  workoutDuration: 'medium',
};

const getAuthErrorMessage = (code) => {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

const LoginScreen = ({ navigate, setUserProfile }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!isLogin && !formData.name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      // Try Firebase Auth first
      let firebaseAvailable = true;
      try { auth(); } catch (_) { firebaseAvailable = false; }

      if (firebaseAvailable) {
        if (isLogin) {
          await auth().signInWithEmailAndPassword(formData.email, formData.password);
          await AsyncStorage.removeItem('user_data');
          // onAuthStateChanged in App.js handles navigation
        } else {
          const { user } = await auth().createUserWithEmailAndPassword(
            formData.email,
            formData.password
          );

          await FirestoreService.saveUserMeta(user.uid, {
            email: formData.email,
            name: formData.name,
            signupDate: firestore.FieldValue.serverTimestamp(),
          });

          await FirestoreService.saveUserProfile(user.uid, {
            ...DEFAULT_PROFILE,
            name: formData.name,
          });

          setUserProfile(DEFAULT_PROFILE);
          await AsyncStorage.setItem('user_profile', JSON.stringify(DEFAULT_PROFILE));
          FirestoreService.migrateFromLocalStorage(user.uid);
          // onAuthStateChanged in App.js handles navigation
        }
      } else {
        // Firebase unavailable — local-only auth
        const userData = {
          email: formData.email,
          name: isLogin ? formData.email.split('@')[0] : formData.name,
          isLoggedIn: true,
          loginDate: new Date().toISOString(),
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        setUserProfile(DEFAULT_PROFILE);
        await AsyncStorage.setItem('user_profile', JSON.stringify(DEFAULT_PROFILE));
        navigate('workout');
      }
    } catch (error) {
      Alert.alert('Error', getAuthErrorMessage(error.code));
    }

    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  const skipLogin = async () => {
    try {
      const guestData = {
        isGuest: true,
        loginDate: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('user_data', JSON.stringify(guestData));
      
      const defaultProfile = {
        fitnessLevel: 'beginner',
        equipment: ['body only'],
        goals: ['strength'],
        workoutDuration: 'medium'
      };
      
      setUserProfile(defaultProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(defaultProfile));
      
      navigate('workout');
    } catch (error) {
      console.error('Skip login error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView contentContainerStyle={styles.loginScrollContainer}>
          <View style={styles.loginContainer}>
            {/* Header */}
            <View style={styles.loginHeader}>
              <Text style={styles.loginTitle}>Gym Tracker</Text>
              <Text style={styles.loginSubtitle}>
                {isLogin ? 'Welcome back!' : 'Create your account'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.loginForm}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.loginInput}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    placeholder="Enter your full name"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.loginInput}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.loginInput}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Enter your password"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                />
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.loginInput}
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    placeholder="Confirm your password"
                    placeholderTextColor="#6B7280"
                    secureTextEntry
                  />
                </View>
              )}
            </View>

            {/* Auth Button */}
            <TouchableOpacity 
              style={styles.authButton}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isLogin ? 'Login' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Auth Mode */}
            <TouchableOpacity 
              style={styles.toggleAuthButton}
              onPress={toggleAuthMode}
            >
              <Text style={styles.toggleAuthText}>
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Login"
                }
              </Text>
            </TouchableOpacity>

            {/* Forgot Password (only show on login) */}
            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={async () => {
                  if (!formData.email) {
                    Alert.alert('Reset Password', 'Enter your email above, then tap Forgot Password.');
                    return;
                  }
                  try {
                    await auth().sendPasswordResetEmail(formData.email);
                    Alert.alert('Reset Email Sent', `A password reset link has been sent to ${formData.email}.`);
                  } catch (error) {
                    Alert.alert('Error', getAuthErrorMessage(error.code));
                  }
                }}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Skip Login */}
            <View style={styles.skipSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={skipLogin}
              >
                <Text style={styles.skipButtonText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.loginFooter}>
              <Text style={styles.footerText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;