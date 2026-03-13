// Updated WorkoutScreen.js with AI Weekly Program Wizard
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
import LLMService from '../services/LLMService';
import FirestoreService from '../services/FirestoreService';
import { styles } from '../utils/styles';

// ─── Wizard config data ────────────────────────────────────────────────────────

const GOALS = [
  { key: 'bodybuilding',  label: 'Bodybuilding',     description: 'Muscle size & definition' },
  { key: 'calisthenics',  label: 'Calisthenics',     description: 'Bodyweight mastery' },
  { key: 'strength',      label: 'Strength',          description: 'Powerlifting & max lifts' },
  { key: 'weight_loss',   label: 'Weight Loss',       description: 'Burn fat & conditioning' },
  { key: 'general',       label: 'General Fitness',   description: 'Health & overall fitness' },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const SPLITS = {
  2: [
    { key: 'full_body',    label: 'Full Body',         description: 'Both sessions hit everything' },
    { key: 'upper_lower',  label: 'Upper / Lower',     description: 'Day A upper, Day B lower' },
  ],
  3: [
    { key: 'full_body',         label: 'Full Body',           description: 'A / B / C variation' },
    { key: 'push_pull_legs',    label: 'Push / Pull / Legs',  description: 'Classic PPL' },
    { key: 'upper_lower',       label: 'Upper / Lower / Full', description: 'Mixed split' },
  ],
  4: [
    { key: 'upper_lower',       label: 'Upper / Lower',       description: '2× each per week' },
    { key: 'push_pull_legs',    label: 'Push / Pull / Legs',  description: 'PPL + Full Body' },
    { key: 'bro_split',         label: 'Body-Part Split',     description: 'Chest, Back, Legs, Shoulders' },
  ],
  5: [
    { key: 'push_pull_legs',    label: 'Push / Pull / Legs',  description: 'PPL + 2 extras' },
    { key: 'bro_split',         label: 'Body-Part Split',     description: 'One muscle group / day' },
    { key: 'upper_lower',       label: 'Upper / Lower',       description: '2–3× each per week' },
  ],
  6: [
    { key: 'push_pull_legs',    label: 'Push / Pull / Legs',  description: 'PPL × 2 (classic 6-day)' },
    { key: 'bro_split',         label: 'Body-Part Split',     description: 'Dedicated daily focus' },
  ],
};

// ─── Inline styles for wizard (keeps main styles.js untouched) ─────────────────

const wiz = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  stepLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#1F1F26',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#1e1433',
  },
  optionLabel: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  dayChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F1F26',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#1e1433',
  },
  dayChipText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#A78BFA',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#1F1F26',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#374151',
  },
  progressDotActive: {
    backgroundColor: '#8B5CF6',
  },
  resultCard: {
    backgroundColor: '#1F1F26',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  resultDayTitle: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultDayName: {
    color: '#F9FAFB',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultFocus: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 10,
  },
  resultExercise: {
    color: '#D1D5DB',
    fontSize: 14,
    paddingVertical: 3,
  },
  resultTips: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dismissBtnText: {
    color: '#6B7280',
    fontSize: 15,
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

const WorkoutScreen = ({
  navigate,
  userProfile,
  currentWorkout,
  setCurrentWorkout,
  logout,
  isAuthenticated,
  uid,
}) => {
  const [todayWorkout, setTodayWorkout] = useState([]);
  const [workoutPrograms, setWorkoutPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingAIWorkout, setGeneratingAIWorkout] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);

  // Exercise picker states
  const [availableExercises, setAvailableExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);

  const [currentExercise, setCurrentExercise] = useState({ name: '', sets: '', reps: '', weight: '' });

  // ─── Wizard state ───────────────────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 | 2 | 3 | 'result'
  const [wizardGoal, setWizardGoal] = useState(null);
  const [wizardDays, setWizardDays] = useState(null);
  const [wizardSplit, setWizardSplit] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState(null);

  useEffect(() => {
    loadTodayWorkout();
    loadWorkoutPrograms();
    loadAvailableExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchTerm, availableExercises]);

  // ─── Exercise loading ───────────────────────────────────────────────────────

  const loadAvailableExercises = async () => {
    if (availableExercises.length > 0) return;
    setLoadingExercises(true);
    try {
      const exercises = await ExerciseAPI.getExercisesForWorkout(userProfile);
      if (exercises && exercises.length > 0) {
        setAvailableExercises(exercises);
        setFilteredExercises(exercises.slice(0, 50));
      } else {
        const fb = getFallbackExercises();
        setAvailableExercises(fb);
        setFilteredExercises(fb);
      }
    } catch (error) {
      const fb = getFallbackExercises();
      setAvailableExercises(fb);
      setFilteredExercises(fb);
    } finally {
      setLoadingExercises(false);
    }
  };

  const getFallbackExercises = () => [
    { id: 'push_ups_fallback',     name: 'Push-ups',       primaryMuscles: ['chest', 'triceps'],      equipment: 'body only', level: 'beginner', category: 'strength' },
    { id: 'squats_fallback',       name: 'Squats',         primaryMuscles: ['quadriceps', 'glutes'],  equipment: 'body only', level: 'beginner', category: 'strength' },
    { id: 'plank_fallback',        name: 'Plank',          primaryMuscles: ['core'],                  equipment: 'body only', level: 'beginner', category: 'strength' },
    { id: 'lunges_fallback',       name: 'Lunges',         primaryMuscles: ['quadriceps', 'glutes'],  equipment: 'body only', level: 'beginner', category: 'strength' },
    { id: 'jumping_jacks_fallback',name: 'Jumping Jacks',  primaryMuscles: ['full body'],             equipment: 'body only', level: 'beginner', category: 'cardio'   },
  ];

  const filterExercises = () => {
    if (!availableExercises || availableExercises.length === 0) return;
    if (!searchTerm.trim()) {
      setFilteredExercises(availableExercises.slice(0, 50));
      return;
    }
    const filtered = availableExercises.filter(exercise =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.primaryMuscles && exercise.primaryMuscles.some(m =>
        m.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
    setFilteredExercises(filtered.slice(0, 50));
  };

  // ─── Today workout ──────────────────────────────────────────────────────────

  const loadTodayWorkout = async () => {
    try {
      const today = new Date().toDateString();
      const saved = await AsyncStorage.getItem(`today_workout_${today}`);
      if (saved) setTodayWorkout(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load today workout:', error);
    }
  };

  const loadWorkoutPrograms = async () => {
    try {
      const saved = await AsyncStorage.getItem('workout_programs');
      if (saved) setWorkoutPrograms(JSON.parse(saved));
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
    const newExercise = { ...currentExercise, id: Date.now().toString() };
    const updatedWorkout = [...todayWorkout, newExercise];
    setTodayWorkout(updatedWorkout);
    saveTodayWorkout(updatedWorkout);
    setCurrentExercise({ name: '', sets: '', reps: '', weight: '' });
    setShowAddExerciseModal(false);
  };

  const addExerciseFromPicker = (exercise) => {
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
    Alert.alert('Added', `${exercise.name} added to today's workout.`);
  };

  const removeExerciseFromToday = (exerciseId) => {
    const updatedWorkout = todayWorkout.filter(e => e.id !== exerciseId);
    setTodayWorkout(updatedWorkout);
    saveTodayWorkout(updatedWorkout);
  };

  // ─── Rule-based quick generate ──────────────────────────────────────────────

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

  // ─── Single AI workout (legacy) ─────────────────────────────────────────────

  const generateAIWorkout = async () => {
    setGeneratingAIWorkout(true);
    try {
      const response = await LLMService.generatePersonalizedWorkout();
      if (response.success) {
        const aiWorkout = {
          exercises: response.workout.exercises.map((ex, index) => ({
            id: `ai_${Date.now()}_${index}`,
            name: ex.name,
            targetSets: ex.sets || 3,
            targetReps: ex.reps || '10-12',
            restTime: ex.rest || '60 seconds',
            notes: ex.notes || '',
            primaryMuscles: ex.primaryMuscles || ['Full Body'],
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
          'AI Workout Ready',
          `${aiWorkout.workoutName} created based on your profile.`,
          [
            { text: 'Start Workout', onPress: () => navigate('generated_workout') },
            { text: 'Later', style: 'cancel' }
          ]
        );
        await LLMService.saveWorkoutHistory(response.workout);
      } else {
        Alert.alert('Failed', response.error || 'Could not generate AI workout.');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Please check your internet connection.');
    } finally {
      setGeneratingAIWorkout(false);
    }
  };

  // ─── AI Assistant ───────────────────────────────────────────────────────────

  function handleAIAssistant() {
    navigate('ai_chat');
  }

  // ─── Wizard logic ───────────────────────────────────────────────────────────

  function openWizard() {
    setWizardStep(1);
    setWizardGoal(null);
    setWizardDays(null);
    setWizardSplit(null);
    setGeneratedProgram(null);
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    setGeneratingAIWorkout(false);
  }

  async function handleWizardNext() {
    if (wizardStep === 1) {
      if (!wizardGoal) return;
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!wizardDays) return;
      // auto-pick first available split
      setWizardSplit(null);
      setWizardStep(3);
    } else if (wizardStep === 3) {
      if (!wizardSplit) return;
      await runWizardGeneration();
    }
  }

  async function runWizardGeneration() {
    setGeneratingAIWorkout(true);
    setWizardStep('loading');
    try {
      const userProf = await LLMService.getUserProfile();
      const response = await LLMService.generateWeeklyProgram({
        goal: wizardGoal,
        daysPerWeek: wizardDays,
        splitType: wizardSplit,
        userProfile: userProf,
      });

      if (response.success) {
        setGeneratedProgram(response.program);
        setWizardStep('result');
      } else {
        Alert.alert('Generation Failed', response.error || 'Please try again.');
        setWizardStep(3);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to AI. Please try again.');
      setWizardStep(3);
    } finally {
      setGeneratingAIWorkout(false);
    }
  }

  async function saveGeneratedProgram() {
    if (!generatedProgram) return;
    try {
      const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const weeklySchedule = DAY_KEYS.reduce((acc, k) => ({ ...acc, [k]: [] }), {});

      (generatedProgram.days || []).forEach((day, index) => {
        const key = DAY_KEYS[index];
        if (!key) return;
        weeklySchedule[key] = (day.exercises || []).map((ex, i) => ({
          id: 'ai_' + Date.now() + '_' + index + '_' + i,
          name: ex.name,
          sets: String(ex.sets || 3),
          reps: String(ex.reps || '10-12'),
          weight: '',
          notes: ex.notes || '',
          primaryMuscles: ex.primaryMuscles || [],
        }));
      });

      const programEntry = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        type: 'weekly',
        source: 'AI_WEEKLY',
        name: generatedProgram.programName || 'AI Program',
        description: generatedProgram.goal + ' · ' + generatedProgram.splitType + ' · ' + generatedProgram.daysPerWeek + ' days/week',
        weeklySchedule,
        aiMeta: {
          goal: generatedProgram.goal,
          splitType: generatedProgram.splitType,
          daysPerWeek: generatedProgram.daysPerWeek,
          estimatedSessionTime: generatedProgram.estimatedSessionTime,
          generalTips: generatedProgram.generalTips,
        },
      };

      const existing = await AsyncStorage.getItem('workout_programs_v2');
      const programs = existing ? JSON.parse(existing) : [];
      programs.unshift(programEntry);
      await AsyncStorage.setItem('workout_programs_v2', JSON.stringify(programs.slice(0, 20)));
      setWorkoutPrograms(programs.slice(0, 20));

      // Save to Firestore (non-blocking)
      if (uid) {
        FirestoreService.saveProgram(uid, programEntry);
      }

      closeWizard();
      Alert.alert('Saved', programEntry.name + ' saved to My Programs.');
    } catch (err) {
      console.error('saveGeneratedProgram error:', err);
      Alert.alert('Error', 'Could not save the program.');
    }
  }

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const getCurrentDate = () =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const renderTodayWorkout = () => {
    if (todayWorkout.length === 0) {
      return <Text style={styles.todayContent}>No exercises added yet. Tap to add your first exercise!</Text>;
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
            <TouchableOpacity style={styles.removeButton} onPress={() => removeExerciseFromToday(exercise.id)}>
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderExerciseItem = ({ item: exercise }) => (
    <View style={{ backgroundColor: '#1F1F26', padding: 16, margin: 8, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{exercise.name}</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
          {exercise.primaryMuscles ? exercise.primaryMuscles.join(', ') : 'Full Body'} • {exercise.equipment}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 12 }}>{exercise.level} • {exercise.category}</Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 12 }}
        onPress={() => addExerciseFromPicker(exercise)}
        activeOpacity={0.7}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Wizard render ──────────────────────────────────────────────────────────

  const renderWizard = () => {
    const stepCount = 3;
    const currentStepNum = typeof wizardStep === 'number' ? wizardStep : stepCount;

    const ProgressBar = () => (
      <View style={wiz.progressBar}>
        {[1, 2, 3].map(n => (
          <View key={n} style={[wiz.progressDot, n <= currentStepNum && wiz.progressDotActive]} />
        ))}
      </View>
    );

    // Step 1 — Goal
    if (wizardStep === 1) {
      return (
        <View>
          <ProgressBar />
          <Text style={wiz.stepLabel}>Step 1 of 3</Text>
          <Text style={wiz.title}>What's your goal?</Text>
          <Text style={wiz.subtitle}>Your program will be tailored around this.</Text>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.key}
              style={[wiz.optionCard, wizardGoal === g.key && wiz.optionCardActive]}
              onPress={() => setWizardGoal(g.key)}
              activeOpacity={0.7}
            >
              <Text style={wiz.optionLabel}>{g.label}</Text>
              <Text style={wiz.optionDesc}>{g.description}</Text>
            </TouchableOpacity>
          ))}
          <View style={wiz.footer}>
            <TouchableOpacity style={wiz.backBtn} onPress={closeWizard}>
              <Text style={wiz.backBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wiz.nextBtn, !wizardGoal && wiz.nextBtnDisabled]}
              onPress={handleWizardNext}
              disabled={!wizardGoal}
            >
              <Text style={wiz.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Step 2 — Days per week
    if (wizardStep === 2) {
      return (
        <View>
          <ProgressBar />
          <Text style={wiz.stepLabel}>Step 2 of 3</Text>
          <Text style={wiz.title}>How many days?</Text>
          <Text style={wiz.subtitle}>Training days per week.</Text>
          <View style={wiz.daysRow}>
            {DAYS_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[wiz.dayChip, wizardDays === d && wiz.dayChipActive]}
                onPress={() => { setWizardDays(d); setWizardSplit(null); }}
                activeOpacity={0.7}
              >
                <Text style={[wiz.dayChipText, wizardDays === d && wiz.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {wizardDays && (
            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 8 }}>
              {wizardDays} training days + {7 - wizardDays} rest days
            </Text>
          )}
          <View style={wiz.footer}>
            <TouchableOpacity style={wiz.backBtn} onPress={() => setWizardStep(1)}>
              <Text style={wiz.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wiz.nextBtn, !wizardDays && wiz.nextBtnDisabled]}
              onPress={handleWizardNext}
              disabled={!wizardDays}
            >
              <Text style={wiz.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Step 3 — Split type
    if (wizardStep === 3) {
      const availableSplits = SPLITS[wizardDays] || SPLITS[3];
      return (
        <View>
          <ProgressBar />
          <Text style={wiz.stepLabel}>Step 3 of 3</Text>
          <Text style={wiz.title}>Choose your split</Text>
          <Text style={wiz.subtitle}>How to distribute muscle groups across days.</Text>
          {availableSplits.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[wiz.optionCard, wizardSplit === s.key && wiz.optionCardActive]}
              onPress={() => setWizardSplit(s.key)}
              activeOpacity={0.7}
            >
              <Text style={wiz.optionLabel}>{s.label}</Text>
              <Text style={wiz.optionDesc}>{s.description}</Text>
            </TouchableOpacity>
          ))}
          <View style={wiz.footer}>
            <TouchableOpacity style={wiz.backBtn} onPress={() => setWizardStep(2)}>
              <Text style={wiz.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wiz.nextBtn, !wizardSplit && wiz.nextBtnDisabled]}
              onPress={handleWizardNext}
              disabled={!wizardSplit}
            >
              <Text style={wiz.nextBtnText}>Generate Program</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Loading
    if (wizardStep === 'loading') {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 20, textAlign: 'center' }}>
            Building your {wizardDays}-day program...
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            This usually takes 10–20 seconds.
          </Text>
        </View>
      );
    }

    // Result
    if (wizardStep === 'result' && generatedProgram) {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={wiz.stepLabel}>Your Program</Text>
          <Text style={wiz.title}>{generatedProgram.programName}</Text>
          <Text style={wiz.subtitle}>
            {generatedProgram.daysPerWeek} days/week • {generatedProgram.estimatedSessionTime}
          </Text>

          {generatedProgram.days && generatedProgram.days.map((day) => (
            <View key={day.dayNumber} style={wiz.resultCard}>
              <Text style={wiz.resultDayTitle}>Day {day.dayNumber}</Text>
              <Text style={wiz.resultDayName}>{day.dayName}</Text>
              <Text style={wiz.resultFocus}>{day.focus}</Text>
              {day.exercises && day.exercises.map((ex, idx) => (
                <Text key={idx} style={wiz.resultExercise}>
                  • {ex.name} — {ex.sets}×{ex.reps} ({ex.rest})
                </Text>
              ))}
            </View>
          ))}

          {generatedProgram.generalTips ? (
            <Text style={wiz.resultTips}>{generatedProgram.generalTips}</Text>
          ) : null}

          <TouchableOpacity style={wiz.saveBtn} onPress={saveGeneratedProgram}>
            <Text style={wiz.saveBtnText}>Save to My Programs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={wiz.dismissBtn} onPress={closeWizard}>
            <Text style={wiz.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return null;
  };

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.workoutHeader}>
          <View>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
            <Text style={styles.welcomeBack}>Ready to{'\n'}<Text style={{ color: '#60a5fa' }}>Lift.</Text></Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigate('profile')}>
            <Text style={styles.profileButtonText}>P</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Workout Card */}
        <TouchableOpacity style={styles.todayCard} onPress={() => setShowTodayModal(true)}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Today's Workout</Text>
            <Text style={styles.addText}>Tap to manage</Text>
          </View>
          {renderTodayWorkout()}
        </TouchableOpacity>

        {/* Main Action Buttons */}
        <View style={styles.mainButtons}>
          {/* Generate Weekly Program — Wizard entry point */}
          <TouchableOpacity
            style={[styles.generateButton, generatingAIWorkout && { opacity: 0.7 }]}
            onPress={openWizard}
            disabled={generatingAIWorkout}
          >
            <Text style={styles.generateButtonText}>Generate AI Program</Text>
            <Text style={styles.generateSubtext}>Weekly plan — personalized by AI</Text>
          </TouchableOpacity>

          {/* AI Chat */}
          <TouchableOpacity style={styles.llmButton} onPress={handleAIAssistant}>
            <Text style={styles.llmButtonText}>AI Fitness Assistant</Text>
            <Text style={styles.llmSubtext}>Ask questions, get advice</Text>
          </TouchableOpacity>

          {/* My Programs */}
          <TouchableOpacity style={styles.programsButton} onPress={() => navigate('programs')}>
            <Text style={styles.programsButtonText}>My Programs</Text>
            <Text style={styles.programsSubtext}>Custom workout plans</Text>
          </TouchableOpacity>

          {/* Progress */}
          <TouchableOpacity
            style={[styles.programsButton, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}
            onPress={() => navigate('progress')}
          >
            <Text style={[styles.programsButtonText, { color: '#f59e0b' }]}>My Progress</Text>
            <Text style={styles.programsSubtext}>PRs, charts & history</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workoutPrograms.length}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { fontSize: 13, textTransform: 'capitalize' }]} numberOfLines={1} adjustsFontSizeToFit>
              {userProfile?.fitnessLevel || 'Beginner'}
            </Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayWorkout.length}</Text>
            <Text style={styles.statLabel}>Today's Exercises</Text>
          </View>
        </View>

        {/* Last Generated Workout */}
        {currentWorkout && (
          <TouchableOpacity style={styles.lastWorkoutCard} onPress={() => navigate('generated_workout')}>
            <Text style={styles.lastWorkoutTitle}>
              {currentWorkout.generatedBy === 'AI' ? 'Last AI Workout' : 'Last Generated Workout'}
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

        {/* Profile Setup */}
        <TouchableOpacity style={styles.profileSetupButton} onPress={() => navigate('profile')}>
          <Text style={styles.profileSetupText}>Setup Workout Preferences</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ── AI WEEKLY PROGRAM WIZARD MODAL ── */}
      <Modal visible={showWizard} transparent animationType="slide" onRequestClose={closeWizard}>
        <View style={wiz.overlay}>
          <View style={wiz.sheet}>
            <View style={wiz.handle} />
            {renderWizard()}
          </View>
        </View>
      </Modal>

      {/* ── Today's Workout Management Modal ── */}
      <Modal visible={showTodayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <Text style={styles.modalTitle}>Today's Workout</Text>
            <ScrollView style={styles.todayModalContent}>
              {todayWorkout.map((exercise) => (
                <View key={exercise.id} style={styles.todayExerciseCard}>
                  <View style={styles.exerciseCardHeader}>
                    <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeExerciseFromToday(exercise.id)}>
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
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={styles.addExerciseButton} onPress={() => setShowAddExerciseModal(true)}>
                <Text style={styles.addExerciseText}>+ Add Custom Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={() => { setShowTodayModal(false); setShowExercisePickerModal(true); }}
              >
                <Text style={styles.addExerciseText}>+ Browse Exercise Database</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowTodayModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Exercise Picker Modal ── */}
      <Modal visible={showExercisePickerModal} transparent animationType="slide">
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
              onPress={() => { setShowExercisePickerModal(false); setSearchTerm(''); }}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add Custom Exercise Modal ── */}
      <Modal visible={showAddExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Exercise Name *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.name}
                onChangeText={(text) => setCurrentExercise({ ...currentExercise, name: text })}
                placeholder="e.g. Push-ups, Squats, etc."
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Sets *</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.sets}
                onChangeText={(text) => setCurrentExercise({ ...currentExercise, sets: text })}
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
                onChangeText={(text) => setCurrentExercise({ ...currentExercise, reps: text })}
                placeholder="e.g. 12 or 30 seconds"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileLabel}>Weight (kg) — Optional</Text>
              <TextInput
                style={styles.profileInput}
                value={currentExercise.weight}
                onChangeText={(text) => setCurrentExercise({ ...currentExercise, weight: text })}
                placeholder="e.g. 20"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShowAddExerciseModal(false); setCurrentExercise({ name: '', sets: '', reps: '', weight: '' }); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={addExerciseToToday}>
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