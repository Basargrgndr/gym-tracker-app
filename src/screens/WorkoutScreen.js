// Updated WorkoutScreen.js with LLM Integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutService from '../services/WorkoutService';
import ExerciseAPI from '../services/ExerciseAPI';
import LLMService from '../services/LLMService'; // Add LLM Service import
import { styles } from '../utils/styles';

const WorkoutScreen = ({ 
  navigate, 
  userProfile, 
  currentWorkout, 
  setCurrentWorkout,
  logout,
  isAuthenticated
}) => {
  const [todayWorkout, setTodayWorkout] = useState([]);
  const [workoutPrograms, setWorkoutPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingAIWorkout, setGeneratingAIWorkout] = useState(false); // Add AI workout loading state
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);
  
  // Exercise picker states
  const [availableExercises, setAvailableExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);
  
  const [currentExercise, setCurrentExercise] = useState({ name: '', sets: '', reps: '', weight: '' });

  useEffect(() => {
    loadTodayWorkout();
    loadWorkoutPrograms();
    loadAvailableExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchTerm, availableExercises]);

  const loadAvailableExercises = async () => {
    if (availableExercises.length > 0) return;

    setLoadingExercises(true);
    try {
      console.log('Loading exercises for Today\'s Workout...');
      const exercises = await ExerciseAPI.getExercisesForWorkout(userProfile);
      
      if (exercises && exercises.length > 0) {
        console.log(`Successfully loaded ${exercises.length} exercises`);
        setAvailableExercises(exercises);
        setFilteredExercises(exercises.slice(0, 50)); // Show first 50
      } else {
        console.log('No exercises returned, using fallback');
        const fallbackExercises = getFallbackExercises();
        setAvailableExercises(fallbackExercises);
        setFilteredExercises(fallbackExercises);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      const fallbackExercises = getFallbackExercises();
      setAvailableExercises(fallbackExercises);
      setFilteredExercises(fallbackExercises);
    } finally {
      setLoadingExercises(false);
    }
  };

  const getFallbackExercises = () => {
    return [
      {
        id: 'push_ups_fallback',
        name: 'Push-ups',
        primaryMuscles: ['chest', 'triceps'],
        equipment: 'body only',
        level: 'beginner',
        category: 'strength'
      },
      {
        id: 'squats_fallback',
        name: 'Squats',
        primaryMuscles: ['quadriceps', 'glutes'],
        equipment: 'body only',
        level: 'beginner',
        category: 'strength'
      },
      {
        id: 'plank_fallback',
        name: 'Plank',
        primaryMuscles: ['core'],
        equipment: 'body only',
        level: 'beginner',
        category: 'strength'
      },
      {
        id: 'lunges_fallback',
        name: 'Lunges',
        primaryMuscles: ['quadriceps', 'glutes'],
        equipment: 'body only',
        level: 'beginner',
        category: 'strength'
      },
      {
        id: 'jumping_jacks_fallback',
        name: 'Jumping Jacks',
        primaryMuscles: ['full body'],
        equipment: 'body only',
        level: 'beginner',
        category: 'cardio'
      }
    ];
  };

  const filterExercises = () => {
    if (!availableExercises || availableExercises.length === 0) {
      return;
    }
    
    if (!searchTerm.trim()) {
      setFilteredExercises(availableExercises.slice(0, 50));
      return;
    }

    const filtered = availableExercises.filter(exercise => 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.primaryMuscles && exercise.primaryMuscles.some(muscle => 
        muscle.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
    setFilteredExercises(filtered.slice(0, 50));
  };

  const loadTodayWorkout = async () => {
    try {
      const today = new Date().toDateString();
      const saved = await AsyncStorage.getItem(`today_workout_${today}`);
      if (saved) {
        setTodayWorkout(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load today workout:', error);
    }
  };

  const loadWorkoutPrograms = async () => {
    try {
      const saved = await AsyncStorage.getItem('workout_programs');
      if (saved) {
        setWorkoutPrograms(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load workout programs:', error);
    }
  };

  const saveTodayWorkout = async (workout) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(`today_workout_${today}`, JSON.stringify(workout));
      setTodayWorkout(workout);
    } catch (error) {
      console.error('Failed to save today workout:', error);
    }
  };

  const addExerciseToToday = () => {
    if (!currentExercise.name || !currentExercise.sets || !currentExercise.reps) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newExercise = {
      ...currentExercise,
      id: Date.now().toString()
    };

    const updatedWorkout = [...todayWorkout, newExercise];
    setTodayWorkout(updatedWorkout);
    saveTodayWorkout(updatedWorkout);
    setCurrentExercise({ name: '', sets: '', reps: '', weight: '' });
    setShowAddExerciseModal(false);
  };

  const addExerciseFromPicker = (exercise) => {
    console.log('Adding exercise from picker:', exercise.name);
    
    const exerciseToAdd = {
      id: Date.now().toString(),
      name: exercise.name,
      sets: exercise.level === 'beginner' ? '3' : '4',
      reps: exercise.category === 'cardio' ? '30 seconds' : '10-12',
      weight: ''
    };

    const updatedWorkout = [...todayWorkout, exerciseToAdd];
    setTodayWorkout(updatedWorkout);
    saveTodayWorkout(updatedWorkout);
    setShowExercisePickerModal(false);
    setSearchTerm('');
    
    Alert.alert('Success', `${exercise.name} added to today's workout!`);
  };

  const removeExerciseFromToday = (exerciseId) => {
    const updatedWorkout = todayWorkout.filter(exercise => exercise.id !== exerciseId);
    setTodayWorkout(updatedWorkout);
    saveTodayWorkout(updatedWorkout);
  };

  // Original generate workout function (rule-based)
  const generateWorkout = async () => {
    setLoading(true);
    try {
      const workout = await WorkoutService.generateWorkout(userProfile);
      setCurrentWorkout(workout);
      navigate('generated_workout');
    } catch (error) {
      console.error('Error generating workout:', error);
      Alert.alert('Error', 'Failed to generate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: AI-powered workout generation
  const generateAIWorkout = async () => {
    setGeneratingAIWorkout(true);
    
    try {
      console.log('Generating AI workout...');
      const response = await LLMService.generatePersonalizedWorkout();
      
      if (response.success) {
        // Convert LLM workout to your app's format - FIXED
        const aiWorkout = {
          exercises: response.workout.exercises.map((ex, index) => ({
            id: `ai_${Date.now()}_${index}`,
            name: ex.name,
            targetSets: ex.sets || 3,
            targetReps: ex.reps || '10-12',
            restTime: ex.rest || '60 seconds',
            notes: ex.notes || '',
            primaryMuscles: ex.primaryMuscles || ['Full Body'], // Fix: always array
            secondaryMuscles: ex.secondaryMuscles || [],
            equipment: ex.equipment || ['bodyweight'],
            category: ex.category || 'strength',
            instructions: ex.instructions || [],
            level: ex.level || 'intermediate',
            completed: false
          })),
          workoutName: response.workout.workoutName || 'AI Generated Workout',
          estimatedTime: response.workout.estimatedTime || '45 minutes',
          difficulty: response.workout.difficulty || 'moderate',
          focus: 'AI Personalized',
          totalExercises: response.workout.exercises.length,
          date: new Date().toISOString(),
          generatedBy: 'AI',
          warmup: response.workout.warmup,
          cooldown: response.workout.cooldown
        };
        
        setCurrentWorkout(aiWorkout);
        
        Alert.alert(
          '🤖 AI Workout Generated!',
          `${aiWorkout.workoutName} has been created based on your profile.`,
          [
            { 
              text: 'Start Workout', 
              onPress: () => navigate('generated_workout') 
            },
            { 
              text: 'View Details', 
              style: 'cancel' 
            }
          ]
        );
        
        // Save to workout history
        await LLMService.saveWorkoutHistory(response.workout);
        
      } else {
        Alert.alert(
          'Generation Failed',
          response.error || 'Could not generate AI workout. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('AI Workout generation error:', error);
      Alert.alert(
        'Connection Error',
        'Failed to generate AI workout. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingAIWorkout(false);
    }
  };

  // NEW: Handle AI Assistant (opens chat)
  const handleAIAssistant = () => {
    // Navigate to AI Chat Screen
    navigate('ai_chat');
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderTodayWorkout = () => {
    if (todayWorkout.length === 0) {
      return (
        <Text style={styles.todayContent}>
          No exercises added yet. Tap to add your first exercise!
        </Text>
      );
    }

    return (
      <View style={styles.todayExercisesList}>
        {todayWorkout.map((exercise) => (
          <View key={exercise.id} style={styles.todayExerciseItem}>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.sets} sets × {exercise.reps} reps
                {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeExerciseFromToday(exercise.id)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderExerciseItem = ({ item: exercise }) => (
    <View style={{
      backgroundColor: '#1F1F26',
      padding: 16,
      margin: 8,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600'
        }}>
          {exercise.name}
        </Text>
        <Text style={{
          color: '#9CA3AF',
          fontSize: 14
        }}>
          {exercise.primaryMuscles ? exercise.primaryMuscles.join(', ') : 'Full Body'} • {exercise.equipment}
        </Text>
        <Text style={{
          color: '#6B7280',
          fontSize: 12
        }}>
          {exercise.level} • {exercise.category}
        </Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: '#10B981',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          marginLeft: 12
        }}
        onPress={() => addExerciseFromPicker(exercise)}
        activeOpacity={0.7}
      >
        <Text style={{
          color: 'white',
          fontWeight: '600'
        }}>
          Add
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Profile Button */}
        <View style={styles.workoutHeader}>
          <View>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
            <Text style={styles.welcomeBack}>Ready to crush it!</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigate('profile')}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Workout Card - Enhanced */}
        <TouchableOpacity 
          style={styles.todayCard}
          onPress={() => setShowTodayModal(true)}
        >
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>📋 Today's Workout</Text>
            <Text style={styles.addText}>Tap to manage</Text>
          </View>
          {renderTodayWorkout()}
        </TouchableOpacity>

        {/* Main Action Buttons - UPDATED WITH LLM */}
        <View style={styles.mainButtons}>
          {/* AI Generate Workout Button - ENHANCED */}
          <TouchableOpacity 
            style={[styles.generateButton, generatingAIWorkout && { opacity: 0.7 }]}
            onPress={generateAIWorkout}
            disabled={generatingAIWorkout}
          >
            {generatingAIWorkout ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.generateButtonText, { marginLeft: 10 }]}>
                  AI Generating...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.generateButtonText}>🤖 Generate AI Workout</Text>
                <Text style={styles.generateSubtext}>Personalized by AI</Text>
              </>
            )}
          </TouchableOpacity>

          {/* AI Assistant Button - WORKING NOW */}
          <TouchableOpacity 
            style={styles.llmButton}
            onPress={handleAIAssistant}
          >
            <Text style={styles.llmButtonText}>💬 AI Fitness Assistant</Text>
            <Text style={styles.llmSubtext}>Ask questions, get advice</Text>
          </TouchableOpacity>

          {/* Quick Generate (Original Rule-based) */}
          <TouchableOpacity 
            style={[styles.programsButton, { backgroundColor: '#059669' }]}
            onPress={generateWorkout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.programsButtonText}>⚡ Quick Generate</Text>
                <Text style={styles.programsSubtext}>Rule-based workout</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Workout Programs Button */}
          <TouchableOpacity 
            style={styles.programsButton}
            onPress={() => navigate('programs')}
          >
            <Text style={styles.programsButtonText}>📚 My Programs</Text>
            <Text style={styles.programsSubtext}>Custom workout plans</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workoutPrograms.length}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userProfile?.fitnessLevel || 'Beginner'}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayWorkout.length}</Text>
            <Text style={styles.statLabel}>Today's Exercises</Text>
          </View>
        </View>

        {/* Last Generated Workout - ENHANCED FOR AI */}
        {currentWorkout && (
          <TouchableOpacity 
            style={styles.lastWorkoutCard}
            onPress={() => navigate('generated_workout')}
          >
            <Text style={styles.lastWorkoutTitle}>
              {currentWorkout.generatedBy === 'AI' ? '🤖 Last AI Workout' : '⚡ Last Generated Workout'}
            </Text>
            <Text style={styles.lastWorkoutInfo}>
              {currentWorkout.totalExercises} exercises • {currentWorkout.estimatedTime}
            </Text>
            <Text style={styles.lastWorkoutFocus}>Focus: {currentWorkout.focus}</Text>
            {currentWorkout.generatedBy === 'AI' && (
              <Text style={[styles.lastWorkoutFocus, { color: '#8B5CF6', fontSize: 12 }]}>
                Personalized with AI
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Profile Setup Button */}
        <TouchableOpacity 
          style={styles.profileSetupButton}
          onPress={() => navigate('profile')}
        >
          <Text style={styles.profileSetupText}>⚙️ Setup Workout Preferences</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Today's Workout Management Modal */}
      <Modal
        visible={showTodayModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <Text style={styles.modalTitle}>📋 Today's Workout</Text>
            
            <ScrollView style={styles.todayModalContent}>
              {todayWorkout.map((exercise) => (
                <View key={exercise.id} style={styles.todayExerciseCard}>
                  <View style={styles.exerciseCardHeader}>
                    <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeExerciseFromToday(exercise.id)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exerciseCardDetails}>
                    {exercise.sets} sets × {exercise.reps} reps
                    {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Add Exercise Options */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                style={styles.addExerciseButton}
                onPress={() => {
                  console.log('Opening Today workout modal...');
                  setShowAddExerciseModal(true);
                }}
              >
                <Text style={styles.addExerciseText}>+ Add Custom Exercise</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.addExerciseButton, { backgroundColor: '#059669' }]}
                onPress={() => {
                  setShowTodayModal(false);
                  setShowExercisePickerModal(true);
                }}
              >
                <Text style={styles.addExerciseText}>+ Browse Exercise Database</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowTodayModal(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePickerModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Browse Exercises</Text>
            
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Search Exercises</Text>
              <TextInput
                style={styles.profileInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search by name or muscle group..."
                placeholderTextColor="#6B7280"
              />
            </View>

            {loadingExercises ? (
              <View style={styles.comingSoonContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.comingSoonTitle}>Loading exercises...</Text>
              </View>
            ) : filteredExercises.length === 0 ? (
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonTitle}>No exercises found</Text>
                <Text style={styles.comingSoonText}>Try a different search term</Text>
              </View>
            ) : (
              <FlatList
                data={filteredExercises}
                renderItem={renderExerciseItem}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 400 }}
                nestedScrollEnabled={true}
              />
            )}

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => {
                setShowExercisePickerModal(false);
                setSearchTerm('');
              }}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Custom Exercise Modal */}
      <Modal
        visible={showAddExerciseModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>
            
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Exercise Name *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.name}
                onChangeText={(text) => setCurrentExercise({...currentExercise, name: text})}
                placeholder="e.g. Push-ups, Squats, etc."
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Sets *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.sets}
                onChangeText={(text) => setCurrentExercise({...currentExercise, sets: text})}
                placeholder="e.g. 3"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Reps *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.reps}
                onChangeText={(text) => setCurrentExercise({...currentExercise, reps: text})}
                placeholder="e.g. 12 or 30 seconds"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Weight (kg) - Optional</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.weight}
                onChangeText={(text) => setCurrentExercise({...currentExercise, weight: text})}
                placeholder="e.g. 20"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddExerciseModal(false);
                  setCurrentExercise({ name: '', sets: '', reps: '', weight: '' });
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={addExerciseToToday}
              >
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WorkoutScreen;