import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import FirestoreService from '../services/FirestoreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme (matches ProgramsScreen) ─────────────────────────────────────────
const T = {
  bg:       '#050508',
  card:     '#131320',
  lift:     '#181828',
  border:   'rgba(255,255,255,0.05)',
  borderHi: 'rgba(59,130,246,0.22)',
  blue:     '#3b82f6',
  blue2:    '#60a5fa',
  blueDim:  'rgba(59,130,246,0.12)',
  green:    '#22c55e',
  gold:     '#f59e0b',
  red:      '#ef4444',
  textPri:  '#e0eaff',
  textSec:  '#5a6a9a',
  textDim:  '#2a2a45',
};

const CHART_CONFIG = {
  backgroundColor: '#131320',
  backgroundGradientFrom: '#131320',
  backgroundGradientTo: '#0f0f1c',
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: () => T.textSec,
  strokeWidth: 2,
  propsForDots: { r: '4', strokeWidth: '2', stroke: T.blue2 },
  propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.04)' },
};

// ─── Data Helpers ────────────────────────────────────────────────────────────

function processHistory(history) {
  const exercisePRs = {};      // { name: { weight, reps, date } }
  const exerciseHistory = {};  // { name: [{ date, maxWeight }] }
  let totalVolume = 0;

  // Sort oldest → newest so chart points are in order
  const sorted = [...history].sort(
    (a, b) => new Date(a.completedAt) - new Date(b.completedAt)
  );

  sorted.forEach(workout => {
    const { exercises, completedSets, completedAt } = workout;
    if (!exercises || !completedSets) return;

    Object.entries(completedSets).forEach(([idxStr, sets]) => {
      const exercise = exercises[parseInt(idxStr)];
      if (!exercise || !sets || sets.length === 0) return;

      const name = exercise.name;
      const muscles = (exercise.primaryMuscles || []).join(', ');

      // Per-set volume
      sets.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        totalVolume += w * r;
      });

      // Max weight this session
      const maxWeight = Math.max(...sets.map(s => parseFloat(s.weight) || 0));
      const bestSet = sets.reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        return w >= (parseFloat(best.weight) || 0) ? s : best;
      }, sets[0]);

      // Track history per exercise
      if (!exerciseHistory[name]) exerciseHistory[name] = [];
      exerciseHistory[name].push({
        date: completedAt,
        maxWeight,
        muscles,
      });

      // Track PR
      if (!exercisePRs[name] || maxWeight > exercisePRs[name].weight) {
        exercisePRs[name] = {
          weight: maxWeight,
          reps: bestSet?.reps || '—',
          date: completedAt,
          muscles,
        };
      }
    });
  });

  return { exercisePRs, exerciseHistory, totalVolume };
}

function calculateStreak(history) {
  if (!history.length) return 0;

  const uniqueDays = [
    ...new Set(history.map(w => new Date(w.completedAt).toDateString())),
  ].map(d => new Date(d)).sort((a, b) => b - a); // newest first

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDays.length; i++) {
    const day = new Date(uniqueDays[i]);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - day) / (1000 * 60 * 60 * 24));
    if (diffDays === i || diffDays === i + 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatVolume(kg) {
  if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
  return Math.round(kg).toLocaleString() + ' kg';
}

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────────────

const ProgressScreen = ({ navigate, uid }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [exercisePRs, setExercisePRs] = useState({});
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [totalVolume, setTotalVolume] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Local first
      let h = [];
      const local = await AsyncStorage.getItem('workout_history');
      if (local) h = JSON.parse(local);

      // Firestore (more complete)
      if (uid) {
        const remote = await FirestoreService.getWorkoutHistory(uid);
        if (remote && remote.length > 0) h = remote;
      }

      setHistory(h);
      const { exercisePRs: prs, exerciseHistory: hist, totalVolume: vol } = processHistory(h);
      setExercisePRs(prs);
      setExerciseHistory(hist);
      setTotalVolume(vol);
      setStreak(calculateStreak(h));
    } catch (err) {
      console.error('ProgressScreen loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build chart data for a selected exercise
  const getChartData = (exerciseName) => {
    const points = (exerciseHistory[exerciseName] || []).slice(-8); // last 8 sessions
    if (points.length < 2) return null;
    return {
      labels: points.map(p => shortDate(p.date)),
      datasets: [{ data: points.map(p => p.maxWeight || 0) }],
    };
  };

  const prList = Object.entries(exercisePRs).sort(
    (a, b) => new Date(b[1].date) - new Date(a[1].date)
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={T.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View>
            <Text style={{ color: T.textPri, fontSize: 32, fontFamily: 'BebasNeue-Regular', letterSpacing: 2 }}>Progress</Text>
            <Text style={{ color: T.textSec, fontSize: 13, marginTop: 2, fontWeight: '500' }}>Strength & history</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigate('workout')}
            style={{ backgroundColor: T.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: T.border }}
          >
            <Text style={{ color: T.textSec, fontWeight: '700', fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Overall Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Workouts', value: history.length.toString() },
            { label: 'Volume', value: totalVolume > 0 ? formatVolume(totalVolume) : '—' },
            { label: 'Streak', value: streak > 0 ? `${streak}d` : '—' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: T.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border }}>
              <Text style={{ fontFamily: 'BebasNeue-Regular', fontSize: 26, color: T.blue2, letterSpacing: 1, marginBottom: 2 }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 9, color: T.textSec, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.5 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Empty state */}
        {prList.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🏋️</Text>
            <Text style={{ color: T.textPri, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>No workouts yet</Text>
            <Text style={{ color: T.textSec, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Complete your first workout to start tracking personal records and progress.
            </Text>
            <TouchableOpacity
              onPress={() => navigate('workout')}
              style={{ marginTop: 24, backgroundColor: T.blue, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Start a Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chart for selected exercise */}
        {selectedExercise && (() => {
          const chartData = getChartData(selectedExercise);
          return (
            <View style={{ marginHorizontal: 20, marginBottom: 24, backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.borderHi }}>
              <Text style={{ color: T.textPri, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>{selectedExercise}</Text>
              <Text style={{ color: T.textSec, fontSize: 12, marginBottom: 16 }}>Max weight per session (kg)</Text>
              {chartData ? (
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 72}
                  height={180}
                  chartConfig={CHART_CONFIG}
                  bezier
                  style={{ borderRadius: 12 }}
                  withInnerLines={true}
                  withOuterLines={false}
                  fromZero={false}
                />
              ) : (
                <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: T.textSec, fontSize: 13 }}>Need at least 2 sessions to show a chart.</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setSelectedExercise(null)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
                <Text style={{ color: T.textSec, fontSize: 12 }}>Close ×</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Personal Records */}
        {prList.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: T.textPri, fontSize: 18, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 }}>
              Personal Records
            </Text>
            {prList.map(([name, pr]) => {
              const isSelected = selectedExercise === name;
              const sessionCount = (exerciseHistory[name] || []).length;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedExercise(isSelected ? null : name)}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: isSelected ? T.lift : T.card,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isSelected ? T.borderHi : T.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ color: T.textPri, fontWeight: '700', fontSize: 15, marginBottom: 3 }}>{name}</Text>
                      {pr.muscles ? (
                        <Text style={{ color: T.textSec, fontSize: 12, textTransform: 'capitalize' }}>{pr.muscles}</Text>
                      ) : null}
                    </View>

                    {/* PR badge */}
                    <View style={{ alignItems: 'flex-end' }}>
                      {pr.weight > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                          <Text style={{ color: T.gold, fontFamily: 'BebasNeue-Regular', fontSize: 26, letterSpacing: 1 }}>
                            {pr.weight}
                          </Text>
                          <Text style={{ color: T.textSec, fontSize: 11, fontWeight: '600' }}>kg</Text>
                        </View>
                      ) : (
                        <Text style={{ color: T.green, fontWeight: '700', fontSize: 15 }}>Bodyweight</Text>
                      )}
                      <Text style={{ color: T.textSec, fontSize: 11, marginTop: 1 }}>
                        {pr.reps} reps · {shortDate(pr.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Footer row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border }}>
                    <Text style={{ color: T.textSec, fontSize: 12 }}>
                      {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ color: isSelected ? T.blue2 : T.textSec, fontSize: 12, fontWeight: '600' }}>
                      {isSelected ? 'Hide chart ▲' : 'View chart ▼'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProgressScreen;
