// Fixed ProgramsScreen.js with working Add Exercise functionality
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services with error handling
let WorkoutService, ExerciseAPI;
try {
  WorkoutService = require('../services/WorkoutService').default;
  ExerciseAPI = require('../services/ExerciseAPI').default;
} catch (error) {
  console.warn('Import error in ProgramsScreen:', error);
}

import { styles } from '../utils/styles';

const ProgramsScreen = ({ navigate, userProfile, setCurrentWorkout }) => {
  const [programs, setPrograms] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('programs');
  const [programType, setProgramType] = useState('daily');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);
  
  // Program creation states
  const [newProgram, setNewProgram] = useState({
    name: '',
    description: '',
    type: 'daily',
    exercises: [],
    weeklySchedule: {}
  });
  
  const [currentDay, setCurrentDay] = useState('monday');

  const weekDays = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  useEffect(() => {
    loadPrograms();
    loadWorkoutHistory();
  }, []);

  useEffect(() => {
    if (availableExercises.length > 0) {
      filterExercises();
    }
  }, [searchTerm, availableExercises]);

  const loadPrograms = async () => {
    try {
      const savedPrograms = await AsyncStorage.getItem('workout_programs_v2');
      if (savedPrograms) {
        setPrograms(JSON.parse(savedPrograms));
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadWorkoutHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('workout_history');
      if (savedHistory) {
        setWorkoutHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading workout history:', error);
    }
  };

  const loadAvailableExercises = async () => {
    if (availableExercises.length > 0) {
      return;
    }
    
    setLoadingExercises(true);
    try {
      console.log('Loading exercises from API for Programs...');
      
      let exercises = [];
      
      if (ExerciseAPI) {
        try {
          exercises = await ExerciseAPI.getExercisesForWorkout(userProfile);
          console.log(`Successfully loaded ${exercises.length} exercises from API`);
        } catch (apiError) {
          console.error('API error:', apiError);
          exercises = [];
        }
      }
      
      if (!exercises || exercises.length === 0) {
        console.log('Using fallback exercises for Programs');
        exercises = getFallbackExercises();
      }
      
      setAvailableExercises(exercises);
      setFilteredExercises(exercises.slice(0, 50));
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
        category: 'strength',
        level: 'beginner',
        equipment: 'body only',
        primaryMuscles: ['chest', 'triceps'],
        secondaryMuscles: ['shoulders'],
        instructions: ['Start in plank position', 'Lower chest to floor', 'Push back up']
      },
      {
        id: 'squats_fallback',
        name: 'Squats',
        category: 'strength',
        level: 'beginner',
        equipment: 'body only',
        primaryMuscles: ['quadriceps', 'glutes'],
        secondaryMuscles: ['hamstrings'],
        instructions: ['Stand with feet shoulder-width apart', 'Lower into sitting position', 'Stand back up']
      },
      {
        id: 'plank_fallback',
        name: 'Plank',
        category: 'strength',
        level: 'beginner',
        equipment: 'body only',
        primaryMuscles: ['core'],
        secondaryMuscles: ['shoulders'],
        instructions: ['Hold push-up position', 'Keep body straight', 'Hold for time']
      },
      {
        id: 'lunges_fallback',
        name: 'Lunges',
        category: 'strength',
        level: 'beginner',
        equipment: 'body only',
        primaryMuscles: ['quadriceps', 'glutes'],
        secondaryMuscles: ['hamstrings'],
        instructions: ['Step forward', 'Lower back knee', 'Push back to start']
      },
      {
        id: 'jumping_jacks_fallback',
        name: 'Jumping Jacks',
        category: 'cardio',
        level: 'beginner',
        equipment: 'body only',
        primaryMuscles: ['full body'],
        secondaryMuscles: ['cardiovascular'],
        instructions: ['Jump feet apart', 'Raise arms overhead', 'Jump back together']
      },
      {
        id: 'mountain_climbers_fallback',
        name: 'Mountain Climbers',
        category: 'cardio',
        level: 'intermediate',
        equipment: 'body only',
        primaryMuscles: ['core', 'shoulders'],
        secondaryMuscles: ['legs'],
        instructions: ['Start in plank', 'Alternate bringing knees to chest', 'Keep fast pace']
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

  const savePrograms = async (updatedPrograms) => {
    try {
      await AsyncStorage.setItem('workout_programs_v2', JSON.stringify(updatedPrograms));
      setPrograms(updatedPrograms);
    } catch (error) {
      console.error('Error saving programs:', error);
    }
  };

  const startCreateProgram = (type) => {
    setNewProgram({
      name: '',
      description: '',
      type: type,
      exercises: [],
      weeklySchedule: type === 'weekly' ? {
        monday: [], tuesday: [], wednesday: [], thursday: [],
        friday: [], saturday: [], sunday: []
      } : {}
    });
    setCurrentDay('monday');
    setShowCreateModal(true);
  };

  const openExercisePicker = async () => {
    console.log('Opening exercise picker for Programs...');
    await loadAvailableExercises();
    setShowExercisePicker(true);
  };

  const addExerciseToProgram = (exercise) => {
    console.log('Adding exercise to program:', exercise.name);
    
    const exerciseWithParams = {
      ...exercise,
      sets: exercise.level === 'beginner' ? 3 : 4,
      reps: exercise.category === 'cardio' ? '30 seconds' : '10-12',
      rest: '60 seconds',
      id: `${exercise.id}_${Date.now()}`
    };

    if (newProgram.type === 'daily') {
      setNewProgram(prev => ({
        ...prev,
        exercises: [...prev.exercises, exerciseWithParams]
      }));
    } else {
      setNewProgram(prev => ({
        ...prev,
        weeklySchedule: {
          ...prev.weeklySchedule,
          [currentDay]: [...prev.weeklySchedule[currentDay], exerciseWithParams]
        }
      }));
    }
    
    setShowExercisePicker(false);
    setSearchTerm('');
    Alert.alert('Success', `${exercise.name} added to program!`);
  };

  const removeExerciseFromProgram = (exerciseIndex) => {
    if (newProgram.type === 'daily') {
      setNewProgram(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, index) => index !== exerciseIndex)
      }));
    } else {
      setNewProgram(prev => ({
        ...prev,
        weeklySchedule: {
          ...prev.weeklySchedule,
          [currentDay]: prev.weeklySchedule[currentDay].filter((_, index) => index !== exerciseIndex)
        }
      }));
    }
  };

  const saveNewProgram = async () => {
    if (!newProgram.name.trim()) {
      Alert.alert('Error', 'Please enter a program name');
      return;
    }

    if (newProgram.type === 'daily' && newProgram.exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    if (newProgram.type === 'weekly') {
      const hasExercises = Object.values(newProgram.weeklySchedule).some(dayExercises => dayExercises.length > 0);
      if (!hasExercises) {
        Alert.alert('Error', 'Please add exercises to at least one day');
        return;
      }
    }

    const programToSave = {
      id: Date.now().toString(),
      name: newProgram.name.trim(),
      description: newProgram.description.trim() || 'Custom program',
      type: newProgram.type,
      exercises: newProgram.exercises,
      weeklySchedule: newProgram.weeklySchedule,
      createdAt: new Date().toISOString(),
      estimatedTime: newProgram.type === 'daily' 
        ? `${Math.max(15, newProgram.exercises.length * 3)} minutes`
        : 'Varies by day'
    };

    const updatedPrograms = [programToSave, ...programs];
    await savePrograms(updatedPrograms);
    setShowCreateModal(false);
    Alert.alert('Success', 'Program created successfully!');
  };

  const startProgram = (program, selectedDay = null) => {
    let exercisesToUse = [];
    let workoutName = program.name;

    if (program.type === 'daily') {
      exercisesToUse = program.exercises;
    } else if (program.type === 'weekly') {
      if (selectedDay) {
        exercisesToUse = program.weeklySchedule[selectedDay] || [];
        workoutName = `${program.name} - ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}`;
      } else {
        showDaySelector(program);
        return;
      }
    }

    if (exercisesToUse.length === 0) {
      Alert.alert('No Exercises', 'No exercises scheduled for this day');
      return;
    }

    const workoutFromProgram = {
      exercises: exercisesToUse,
      estimatedTime: `${Math.max(15, exercisesToUse.length * 3)} minutes`,
      difficulty: userProfile.fitnessLevel,
      focus: 'Custom Program',
      totalExercises: exercisesToUse.length,
      date: new Date().toDateString(),
      fromProgram: workoutName
    };

    setCurrentWorkout(workoutFromProgram);
    navigate('generated_workout');
  };

  const showDaySelector = (program) => {
    const dayOptions = weekDays.map(day => ({
      text: day.label,
      onPress: () => startProgram(program, day.key)
    }));

    Alert.alert(
      'Select Day',
      'Which day would you like to start?',
      [
        ...dayOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const deleteProgram = (programId) => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedPrograms = programs.filter(program => program.id !== programId);
            await savePrograms(updatedPrograms);
          }
        }
      ]
    );
  };

  const getCurrentExercises = () => {
    if (newProgram.type === 'daily') {
      return newProgram.exercises;
    } else {
      return newProgram.weeklySchedule[currentDay] || [];
    }
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
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          {exercise.name}
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
          {exercise.primaryMuscles ? exercise.primaryMuscles.join(', ') : 'Full Body'} • {exercise.equipment}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 12 }}>
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
        onPress={() => addExerciseToProgram(exercise)}
        activeOpacity={0.7}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgramCard = (program) => (
    <View key={program.id} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{program.name}</Text>
          <Text style={styles.exerciseTarget}>{program.description}</Text>
          <Text style={styles.exerciseDetails}>
            {program.type.charAt(0).toUpperCase() + program.type.slice(1)} Program • {program.estimatedTime}
          </Text>
          {program.type === 'weekly' && (
            <Text style={[styles.exerciseDetails, { color: '#10B981', marginTop: 4 }]}>
              {Object.keys(program.weeklySchedule).filter(day => program.weeklySchedule[day].length > 0).length} days scheduled
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => deleteProgram(program.id)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseFooter}>
        <Text style={styles.equipmentText}>
          Created {new Date(program.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#8B5CF6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12
          }}
          onPress={() => startProgram(program)}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrograms = () => (
    <View style={styles.exercisesList}>
      {/* Program Type Filter */}
      <View style={{ 
        flexDirection: 'row', 
        marginHorizontal: 20, 
        marginBottom: 20,
        backgroundColor: '#1F1F26',
        borderRadius: 16,
        padding: 4
      }}>
        <TouchableOpacity
          style={[
            { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
            programType === 'daily' && { backgroundColor: '#8B5CF6' }
          ]}
          onPress={() => setProgramType('daily')}
        >
          <Text style={[
            { fontWeight: '600', color: '#9CA3AF' },
            programType === 'daily' && { color: 'white' }
          ]}>
            Daily Programs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
            programType === 'weekly' && { backgroundColor: '#8B5CF6' }
          ]}
          onPress={() => setProgramType('weekly')}
        >
          <Text style={[
            { fontWeight: '600', color: '#9CA3AF' },
            programType === 'weekly' && { color: 'white' }
          ]}>
            Weekly Programs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Program Buttons */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <TouchableOpacity 
          style={[styles.generateButton, { marginBottom: 12 }]}
          onPress={() => startCreateProgram('daily')}
        >
          <Text style={styles.generateButtonText}>+ Create Daily Program</Text>
          <Text style={styles.generateSubtext}>Single workout routine</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.generateButton, { backgroundColor: '#059669' }]}
          onPress={() => startCreateProgram('weekly')}
        >
          <Text style={styles.generateButtonText}>+ Create Weekly Program</Text>
          <Text style={styles.generateSubtext}>7-day workout schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Programs List */}
      {programs.filter(p => programType === 'all' || p.type === programType).length === 0 ? (
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonIcon}>📋</Text>
          <Text style={styles.comingSoonTitle}>No {programType.charAt(0).toUpperCase() + programType.slice(1)} Programs</Text>
          <Text style={styles.comingSoonText}>
            Create your first {programType} program using exercises from our database!
          </Text>
        </View>
      ) : (
        programs
          .filter(p => programType === 'all' || p.type === programType)
          .map(renderProgramCard)
      )}
    </View>
  );

  const renderHistory = () => (
    <View style={styles.exercisesList}>
      {workoutHistory.length === 0 ? (
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonIcon}>📈</Text>
          <Text style={styles.comingSoonTitle}>No Workout History</Text>
          <Text style={styles.comingSoonText}>
            Complete your first workout to see your progress here!
          </Text>
        </View>
      ) : (
        workoutHistory.map((workout, index) => (
          <View key={index} style={[styles.exerciseCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseNumber}>✓</Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>
                  {workout.fromProgram || 'Generated Workout'}
                </Text>
                <Text style={styles.exerciseTarget}>
                  {workout.totalExercises} exercises • Focus: {workout.focus}
                </Text>
                <Text style={styles.exerciseDetails}>
                  Duration: {Math.floor(workout.duration / 60)}m • {workout.totalSetsCompleted} sets completed
                </Text>
              </View>
              <View style={styles.exerciseStats}>
                <Text style={styles.exerciseStatText}>{new Date(workout.completedAt).toLocaleDateString()}</Text>
                <Text style={[styles.exerciseStatText, { color: '#10B981' }]}>Completed</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>My Programs</Text>
            <Text style={styles.screenSubtitle}>Create custom daily & weekly routines</Text>
          </View>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigate('workout')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={{ 
          flexDirection: 'row', 
          marginHorizontal: 20, 
          marginBottom: 20,
          backgroundColor: '#1F1F26',
          borderRadius: 16,
          padding: 4
        }}>
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
              activeTab === 'programs' && { backgroundColor: '#8B5CF6' }
            ]}
            onPress={() => setActiveTab('programs')}
          >
            <Text style={[
              { fontWeight: '600', color: '#9CA3AF' },
              activeTab === 'programs' && { color: 'white' }
            ]}>
              Programs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
              activeTab === 'history' && { backgroundColor: '#8B5CF6' }
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[
              { fontWeight: '600', color: '#9CA3AF' },
              activeTab === 'history' && { color: 'white' }
            ]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'programs' ? renderPrograms() : renderHistory()}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Program Modal */}
      <Modal visible={showCreateModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              Create {newProgram.type.charAt(0).toUpperCase() + newProgram.type.slice(1)} Program
            </Text>
            
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Program Name *</Text>
              <TextInput
                style={styles.profileInput}
                value={newProgram.name}
                onChangeText={(text) => setNewProgram(prev => ({...prev, name: text}))}
                placeholder="e.g. Morning Strength Routine"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Description</Text>
              <TextInput
                style={[styles.profileInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={newProgram.description}
                onChangeText={(text) => setNewProgram(prev => ({...prev, description: text}))}
                placeholder="Brief description..."
                placeholderTextColor="#6B7280"
                multiline
              />
            </View>

            {newProgram.type === 'weekly' && (
              <View style={styles.profileInfoSection}>
                <Text style={styles.profileLabel}>Select Day</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {weekDays.map(day => (
                    <TouchableOpacity
                      key={day.key}
                      style={{
                        backgroundColor: currentDay === day.key ? '#8B5CF6' : '#1F1F26',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: currentDay === day.key ? '#8B5CF6' : '#374151',
                        minWidth: 50,
                        alignItems: 'center'
                      }}
                      onPress={() => setCurrentDay(day.key)}
                    >
                      <Text style={{
                        color: currentDay === day.key ? 'white' : '#9CA3AF',
                        fontWeight: '600',
                        fontSize: 12
                      }}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

          <TouchableOpacity 
           style={styles.addExerciseButton}
           onPress={() => {
            console.log('Opening Programs exercise picker...');
            setShowExercisePicker(true);
            }}
          >
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>

            <ScrollView style={{ maxHeight: 200 }}>
              {getCurrentExercises().map((exercise, index) => (
                <View key={index} style={styles.todayExerciseCard}>
                  <View style={styles.exerciseCardHeader}>
                    <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                    <TouchableOpacity onPress={() => removeExerciseFromProgram(index)}>
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exerciseCardDetails}>
                    {exercise.sets} sets × {exercise.reps} • Rest: {exercise.rest}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveNewProgram}
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal visible={showExercisePicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            
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
                setShowExercisePicker(false);
                setSearchTerm('');
              }}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProgramsScreen;