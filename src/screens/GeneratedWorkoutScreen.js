// Updated GeneratedWorkoutScreen.js with video integration
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutService from '../services/WorkoutService';
import ExerciseVideoModal from '../components/ExerciseVideoModal';
import FirestoreService from '../services/FirestoreService';
import { styles } from '../utils/styles';

const GeneratedWorkoutScreen = ({
  navigate,
  userProfile,
  currentWorkout,
  setCurrentWorkout,
  uid,
}) => {
  const [completedSets, setCompletedSets] = useState({});
  const [showSetModal, setShowSetModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetData, setCurrentSetData] = useState({ reps: '', weight: '' });
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    loadWorkoutState();
  }, []);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // All existing methods remain the same...
  const loadWorkoutState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('current_workout_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        setCompletedSets(state.completedSets || {});
        setWorkoutStarted(state.workoutStarted || false);
        setWorkoutTimer(state.workoutTimer || 0);
        setIsTimerRunning(state.isTimerRunning || false);
      }

      if (currentWorkout && Object.keys(completedSets).length === 0) {
        const initialSets = {};
        currentWorkout.exercises.forEach((exercise, index) => {
          initialSets[index] = [];
        });
        setCompletedSets(initialSets);
      }
    } catch (error) {
      console.error('Error loading workout state:', error);
    }
  };

  const saveWorkoutState = async (state) => {
    try {
      await AsyncStorage.setItem('current_workout_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving workout state:', error);
    }
  };

  const generateNewWorkout = async () => {
    setCurrentWorkout(null);
    
    setTimeout(() => {
      const newWorkout = WorkoutService.generateWorkout(userProfile);
      setCurrentWorkout(newWorkout);
      
      const newCompletedSets = {};
      newWorkout.exercises.forEach((exercise, index) => {
        newCompletedSets[index] = [];
      });
      setCompletedSets(newCompletedSets);
      setWorkoutStarted(false);
      setWorkoutCompleted(false);
      setWorkoutTimer(0);
      setIsTimerRunning(false);
      
      saveWorkoutState({
        completedSets: newCompletedSets,
        workoutStarted: false,
        workoutTimer: 0,
        isTimerRunning: false
      });
    }, 1000);
  };

  const startWorkout = () => {
    setWorkoutStarted(true);
    setIsTimerRunning(true);
    saveWorkoutState({
      completedSets,
      workoutStarted: true,
      workoutTimer,
      isTimerRunning: true
    });
  };

  const pauseWorkout = () => {
    setIsTimerRunning(!isTimerRunning);
    saveWorkoutState({
      completedSets,
      workoutStarted,
      workoutTimer,
      isTimerRunning: !isTimerRunning
    });
  };

  const completeWorkout = async () => {
    setWorkoutCompleted(true);
    setIsTimerRunning(false);
    
    try {
      const completedWorkoutData = {
        ...currentWorkout,
        completedAt: new Date().toISOString(),
        duration: workoutTimer,
        completedSets: completedSets,
        totalSetsCompleted: Object.values(completedSets).flat().length
      };

      const workoutHistory = await AsyncStorage.getItem('workout_history');
      const history = workoutHistory ? JSON.parse(workoutHistory) : [];
      history.unshift(completedWorkoutData);
      
      if (history.length > 50) {
        history.splice(50);
      }
      
      await AsyncStorage.setItem('workout_history', JSON.stringify(history));
      await AsyncStorage.removeItem('current_workout_state');

      // Save to Firestore for cloud sync (non-blocking)
      if (uid) {
        FirestoreService.saveWorkoutToHistory(uid, completedWorkoutData);
      }
      
      Alert.alert(
        'Workout Complete!',
        `Great job! You completed your workout in ${formatTime(workoutTimer)}.`,
        [
          { text: 'View Summary', onPress: () => {} },
          { text: 'Back to Home', onPress: () => navigate('workout') }
        ]
      );
    } catch (error) {
      console.error('Error saving completed workout:', error);
    }
  };

  const addSetToExercise = () => {
    if (!currentSetData.reps) {
      Alert.alert('Error', 'Please enter reps completed');
      return;
    }

    const newSet = {
      reps: currentSetData.reps,
      weight: currentSetData.weight || '0',
      timestamp: new Date().toISOString()
    };

    const updatedSets = { ...completedSets };
    updatedSets[currentExerciseIndex].push(newSet);
    
    setCompletedSets(updatedSets);
    setCurrentSetData({ reps: '', weight: '' });
    setShowSetModal(false);
    
    saveWorkoutState({
      completedSets: updatedSets,
      workoutStarted,
      workoutTimer,
      isTimerRunning
    });
  };

  const removeSetFromExercise = (exerciseIndex, setIndex) => {
    const updatedSets = { ...completedSets };
    updatedSets[exerciseIndex].splice(setIndex, 1);
    setCompletedSets(updatedSets);
    
    saveWorkoutState({
      completedSets: updatedSets,
      workoutStarted,
      workoutTimer,
      isTimerRunning
    });
  };

  // New function to show exercise video
  const showExerciseVideo = (exercise) => {
    setSelectedExercise(exercise);
    setShowVideoModal(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExerciseProgress = (exerciseIndex) => {
    const completedCount = completedSets[exerciseIndex]?.length || 0;
    const targetSets = currentWorkout.exercises[exerciseIndex].sets;
    return { completed: completedCount, target: targetSets };
  };

  if (!currentWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.comingSoonTitle}>Generating Workout...</Text>
          <Text style={styles.comingSoonText}>
            Creating a personalized workout based on your preferences
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (workoutCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonIcon}>🎉</Text>
          <Text style={styles.comingSoonTitle}>Workout Complete!</Text>
          <Text style={styles.comingSoonText}>
            Duration: {formatTime(workoutTimer)}
            {'\n'}Sets completed: {Object.values(completedSets).flat().length}
            {'\n\n'}Great job on crushing your workout!
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigate('workout')}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Your Workout</Text>
            {workoutStarted && (
              <Text style={styles.screenSubtitle}>
                Time: {formatTime(workoutTimer)}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigate('workout')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.workoutHeaderStats}>
          <View style={styles.workoutStat}>
            <Text style={styles.workoutStatValue}>{currentWorkout.totalExercises}</Text>
            <Text style={styles.workoutStatLabel}>Exercises</Text>
          </View>
          <View style={styles.workoutStat}>
            <Text style={styles.workoutStatValue}>{currentWorkout.estimatedTime}</Text>
            <Text style={styles.workoutStatLabel}>Duration</Text>
          </View>
          <View style={styles.workoutStat}>
            <Text style={styles.workoutStatValue}>{currentWorkout.difficulty}</Text>
            <Text style={styles.workoutStatLabel}>Level</Text>
          </View>
        </View>

        <Text style={styles.workoutFocus}>Focus: {currentWorkout.focus}</Text>

        <View style={styles.exercisesList}>
          {currentWorkout.exercises.map((exercise, index) => {
            const progress = getExerciseProgress(index);
            const isComplete = progress.completed >= progress.target;
            
            return (
              <View key={index} style={[styles.exerciseCard, isComplete && { borderColor: '#10B981', borderWidth: 2 }]}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseNumber, isComplete && { backgroundColor: '#10B981', color: 'white' }]}>
                    {index + 1}
                  </Text>
                  <View style={styles.exerciseInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      {/* Video button */}
                      {exercise.video && (
                        <TouchableOpacity
                          onPress={() => showExerciseVideo(exercise)}
                          style={{
                            marginLeft: 8,
                            backgroundColor: '#FF0000',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                            📹 Video
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.exerciseTarget}>
                      {exercise.primaryMuscles.join(', ')}
                    </Text>
                  </View>
                  <View style={styles.exerciseStats}>
                    <Text style={styles.exerciseStatText}>{progress.completed}/{progress.target} sets</Text>
                    <Text style={styles.exerciseStatText}>{exercise.reps}</Text>
                    <Text style={styles.exerciseStatText}>Rest: {exercise.rest}</Text>
                  </View>
                </View>
                
                {/* Completed Sets Display */}
                {completedSets[index] && completedSets[index].length > 0 && (
                  <View style={{ marginTop: 12, marginBottom: 12 }}>
                    <Text style={styles.instructionsTitle}>Completed Sets:</Text>
                    {completedSets[index].map((set, setIndex) => (
                      <View key={setIndex} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        padding: 8,
                        borderRadius: 8,
                        marginBottom: 4
                      }}>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>
                          Set {setIndex + 1}: {set.reps} reps {set.weight !== '0' ? `@ ${set.weight}kg` : ''}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeSetFromExercise(index, setIndex)}
                          style={{ padding: 4 }}
                        >
                          <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Set Button */}
                {workoutStarted && !isComplete && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#10B981',
                      padding: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginTop: 8
                    }}
                    onPress={() => {
                      setCurrentExerciseIndex(index);
                      setShowSetModal(true);
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600' }}>+ Add Set</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.instructions}>
                  <Text style={styles.instructionsTitle}>Instructions:</Text>
                  {(exercise.instructions || []).map((instruction, i) => (
                    <Text key={i} style={styles.instructionText}>
                      • {instruction}
                    </Text>
                  ))}
                </View>

                <View style={styles.exerciseFooter}>
                  <Text style={styles.equipmentText}>Equipment: {exercise.equipment}</Text>
                  <Text style={styles.difficultyText}>{exercise.level}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.workoutActions}>
          {!workoutStarted ? (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={startWorkout}
            >
              <Text style={styles.primaryButtonText}>Start Workout</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: isTimerRunning ? '#F59E0B' : '#10B981' }]}
                onPress={pauseWorkout}
              >
                <Text style={styles.primaryButtonText}>
                  {isTimerRunning ? 'Pause Workout' : 'Resume Workout'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
                onPress={completeWorkout}
              >
                <Text style={styles.primaryButtonText}>Complete Workout</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: '#6366F1', marginTop: 12 }]}
            onPress={generateNewWorkout}
          >
            <Text style={styles.primaryButtonText}>Generate New Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Set Modal - unchanged */}
      <Modal
        visible={showSetModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Set</Text>
            
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Reps Completed *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentSetData.reps}
                onChangeText={(text) => setCurrentSetData({...currentSetData, reps: text})}
                placeholder="e.g. 12"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Weight (kg) - Optional</Text>
              <TextInput
                style={styles.profileInput}
                value={currentSetData.weight}
                onChangeText={(text) => setCurrentSetData({...currentSetData, weight: text})}
                placeholder="e.g. 20"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowSetModal(false);
                  setCurrentSetData({ reps: '', weight: '' });
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={addSetToExercise}
              >
                <Text style={styles.modalSaveText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Video Modal */}
      <ExerciseVideoModal
        visible={showVideoModal}
        exercise={selectedExercise}
        onClose={() => {
          setShowVideoModal(false);
          setSelectedExercise(null);
        }}
      />
    </SafeAreaView>
  );
};

export default GeneratedWorkoutScreen;