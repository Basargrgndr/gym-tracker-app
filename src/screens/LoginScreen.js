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
import { styles } from '../utils/styles';

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
    // Validation
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (isLogin) {
        // Login logic - for demo, any email/password works
        const userData = {
          email: formData.email,
          name: formData.email.split('@')[0], // Use email prefix as name
          isLoggedIn: true,
          loginDate: new Date().toISOString()
        };
        
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        // Set default profile
        const defaultProfile = {
          fitnessLevel: 'beginner',
          equipment: ['body only'],
          goals: ['strength'],
          workoutDuration: 'medium'
        };
        
        setUserProfile(defaultProfile);
        await AsyncStorage.setItem('user_profile', JSON.stringify(defaultProfile));
        
        // Go directly to workout page after login
        navigate('workout');
      } else {
        // Signup logic
        const userData = {
          email: formData.email,
          name: formData.name,
          isLoggedIn: true,
          signupDate: new Date().toISOString()
        };
        
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        // Set default profile for new users
        const defaultProfile = {
          fitnessLevel: 'beginner',
          equipment: ['body only'],
          goals: ['strength'],
          workoutDuration: 'medium'
        };
        
        setUserProfile(defaultProfile);
        await AsyncStorage.setItem('user_profile', JSON.stringify(defaultProfile));
        
        // New users go to workout page directly too
        navigate('workout');
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
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
                onPress={() => Alert.alert('Forgot Password', 'Password reset feature coming soon!')}
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