import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../utils/styles';

const WelcomeScreen = ({ navigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Gym Tracker</Text>
        <Text style={styles.welcomeSubtitle}>Your Personal Workout Generator</Text>
        <Text style={styles.welcomeDescription}>
          Get customized workouts based on your fitness level, available equipment, and goals.
        </Text>
        
        <View style={styles.features}>
          <Text style={styles.featureText}>✓ Personalized workout plans</Text>
          <Text style={styles.featureText}>✓ Equipment-based filtering</Text>
          <Text style={styles.featureText}>✓ AI workout assistance</Text>
          <Text style={styles.featureText}>✓ Custom workout programs</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => navigate('profile')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;