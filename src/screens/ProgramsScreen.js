// ProgramsScreen.js - Complete Rewrite
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirestoreService from '../services/FirestoreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:        '#050508',
  surface:   '#0f0f1c',
  card:      '#131320',
  border:    'rgba(255,255,255,0.05)',
  borderHi:  'rgba(59,130,246,0.22)',
  accent:    '#3b82f6',
  accentDim: 'rgba(59,130,246,0.1)',
  accentDark:'#1e3a8a',
  green:     '#22C55E',
  red:       '#EF4444',
  textPri:   '#e0eaff',
  textSec:   '#5a6a9a',
  textDim:   '#2a2a45',
};

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const EMPTY_WEEKLY = () =>
  DAYS.reduce((acc, d) => ({ ...acc, [d.key]: [] }), {});

// ─── Fallback exercises ───────────────────────────────────────────────────────
const FALLBACK = [
  { id: 'f1',  name: 'Push-ups',          primaryMuscles: ['Chest'],      equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f2',  name: 'Squats',            primaryMuscles: ['Legs'],       equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f3',  name: 'Plank',             primaryMuscles: ['Core'],       equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f4',  name: 'Lunges',            primaryMuscles: ['Legs'],       equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f5',  name: 'Pull-ups',          primaryMuscles: ['Back'],       equipment: 'pull-up bar', level: 'intermediate', category: 'strength' },
  { id: 'f6',  name: 'Dumbbell Row',      primaryMuscles: ['Back'],       equipment: 'dumbbell',    level: 'beginner',     category: 'strength' },
  { id: 'f7',  name: 'Shoulder Press',    primaryMuscles: ['Shoulders'],  equipment: 'dumbbell',    level: 'intermediate', category: 'strength' },
  { id: 'f8',  name: 'Bicep Curl',        primaryMuscles: ['Biceps'],     equipment: 'dumbbell',    level: 'beginner',     category: 'strength' },
  { id: 'f9',  name: 'Tricep Dip',        primaryMuscles: ['Triceps'],    equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f10', name: 'Deadlift',          primaryMuscles: ['Hamstrings'], equipment: 'barbell',     level: 'intermediate', category: 'strength' },
  { id: 'f11', name: 'Bench Press',       primaryMuscles: ['Chest'],      equipment: 'barbell',     level: 'intermediate', category: 'strength' },
  { id: 'f12', name: 'Jumping Jacks',     primaryMuscles: ['Full Body'],  equipment: 'body only',   level: 'beginner',     category: 'cardio'   },
  { id: 'f13', name: 'Mountain Climbers', primaryMuscles: ['Core'],       equipment: 'body only',   level: 'intermediate', category: 'cardio'   },
  { id: 'f14', name: 'Burpees',           primaryMuscles: ['Full Body'],  equipment: 'body only',   level: 'advanced',     category: 'cardio'   },
  { id: 'f15', name: 'Russian Twist',     primaryMuscles: ['Core'],       equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f16', name: 'Hip Thrust',        primaryMuscles: ['Glutes'],     equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f17', name: 'Leg Press',         primaryMuscles: ['Legs'],       equipment: 'machine',     level: 'beginner',     category: 'strength' },
  { id: 'f18', name: 'Lat Pulldown',      primaryMuscles: ['Back'],       equipment: 'cable',       level: 'beginner',     category: 'strength' },
  { id: 'f19', name: 'Leg Curl',          primaryMuscles: ['Hamstrings'], equipment: 'machine',     level: 'beginner',     category: 'strength' },
  { id: 'f20', name: 'Calf Raise',        primaryMuscles: ['Calves'],     equipment: 'body only',   level: 'beginner',     category: 'strength' },
  { id: 'f21', name: 'Incline Press',     primaryMuscles: ['Chest'],      equipment: 'dumbbell',    level: 'intermediate', category: 'strength' },
  { id: 'f22', name: 'Face Pull',         primaryMuscles: ['Shoulders'],  equipment: 'cable',       level: 'beginner',     category: 'strength' },
  { id: 'f23', name: 'Romanian Deadlift', primaryMuscles: ['Hamstrings'], equipment: 'barbell',     level: 'intermediate', category: 'strength' },
  { id: 'f24', name: 'Leg Extension',     primaryMuscles: ['Quadriceps'], equipment: 'machine',     level: 'beginner',     category: 'strength' },
  { id: 'f25', name: 'Cable Fly',         primaryMuscles: ['Chest'],      equipment: 'cable',       level: 'intermediate', category: 'strength' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadExercisesFromCache() {
  try {
    const cached = await AsyncStorage.getItem('exercise_database_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return FALLBACK;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  color: T.textSec,
  fontSize: 13,
  fontWeight: '600',
  marginBottom: 6,
};
const inputStyle = {
  backgroundColor: T.card,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
  color: T.textPri,
  fontSize: 15,
  borderWidth: 1,
  borderColor: T.border,
  marginBottom: 14,
};
const miniInputStyle = {
  backgroundColor: T.surface,
  borderRadius: 8,
  paddingHorizontal: 4,
  paddingVertical: 5,
  color: T.textPri,
  fontSize: 13,
  textAlign: 'center',
  borderWidth: 1,
  borderColor: T.border,
  marginHorizontal: 2,
};

// ─── Table Row ────────────────────────────────────────────────────────────────
const TableHeader = () => (
  <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 }}>
    <Text style={{ flex: 3, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Exercise</Text>
    <Text style={{ width: 44, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Sets</Text>
    <Text style={{ width: 52, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Reps</Text>
    <Text style={{ width: 44, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>kg</Text>
  </View>
);

const TableRow = ({ ex, index, editable, onRemove, onChange }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(124,106,254,0.04)',
    borderRadius: 6,
  }}>
    <Text style={{ flex: 3, color: T.textPri, fontSize: 13, fontWeight: '500', paddingRight: 6 }} numberOfLines={1}>
      {ex.name}
    </Text>
    {editable ? (
      <>
        <TextInput
          value={ex.sets}
          onChangeText={v => onChange('sets', v)}
          placeholder="—"
          placeholderTextColor={T.textDim}
          keyboardType="numeric"
          style={[miniInputStyle, { width: 44 }]}
        />
        <TextInput
          value={ex.reps}
          onChangeText={v => onChange('reps', v)}
          placeholder="—"
          placeholderTextColor={T.textDim}
          style={[miniInputStyle, { width: 52 }]}
        />
        <TextInput
          value={ex.weight}
          onChangeText={v => onChange('weight', v)}
          placeholder="—"
          placeholderTextColor={T.textDim}
          keyboardType="numeric"
          style={[miniInputStyle, { width: 44 }]}
        />
        <TouchableOpacity onPress={onRemove} style={{ width: 24, alignItems: 'center', marginLeft: 2 }}>
          <Text style={{ color: T.red, fontSize: 18, lineHeight: 20 }}>×</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <Text style={{ width: 44, color: T.textSec, fontSize: 13, textAlign: 'center' }}>{ex.sets || '—'}</Text>
        <Text style={{ width: 52, color: T.textSec, fontSize: 13, textAlign: 'center' }}>{ex.reps || '—'}</Text>
        <Text style={{ width: 44, color: T.textSec, fontSize: 13, textAlign: 'center' }}>{ex.weight ? `${ex.weight}` : '—'}</Text>
      </>
    )}
  </View>
);

// ─── Daily Program Card ───────────────────────────────────────────────────────
const DailyCard = ({ program, onStart, onDelete }) => (
  <View style={{
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
    overflow: 'hidden',
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: T.textPri, fontSize: 18, fontFamily: 'BebasNeue-Regular', letterSpacing: 1 }}>{program.name}</Text>
        {program.description ? (
          <Text style={{ color: T.textSec, fontSize: 13, marginTop: 2 }}>{program.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
        <Text style={{ color: T.red, fontSize: 22, lineHeight: 24 }}>×</Text>
      </TouchableOpacity>
    </View>

    <View style={{ padding: 14 }}>
      {program.exercises.length === 0 ? (
        <Text style={{ color: T.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>No exercises</Text>
      ) : (
        <>
          <TableHeader />
          {program.exercises.map((ex, i) => (
            <TableRow key={i} ex={ex} index={i} editable={false} />
          ))}
        </>
      )}
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 }}>
      <Text style={{ color: T.textDim, fontSize: 12 }}>
        {program.exercises.length} exercises · {new Date(program.createdAt).toLocaleDateString()}
      </Text>
      <TouchableOpacity
        onPress={onStart}
        style={{ backgroundColor: T.accentDark, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Start ›</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Weekly Program Card ──────────────────────────────────────────────────────
const WeeklyCard = ({ program, onStart, onDelete }) => {
  const [expandedDay, setExpandedDay] = useState(null);
  const activeDays = DAYS.filter(d => (program.weeklySchedule[d.key] || []).length > 0);

  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
      marginBottom: 14,
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <View style={{ flex: 1 }}>
          {program.source === 'AI_WEEKLY' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <View style={{ backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' }}>
                <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>GENERATED BY AI</Text>
              </View>
            </View>
          )}
          <Text style={{ color: T.textPri, fontSize: 18, fontFamily: 'BebasNeue-Regular', letterSpacing: 1 }}>{program.name}</Text>
          {program.description ? (
            <Text style={{ color: T.textSec, fontSize: 13, marginTop: 2 }}>{program.description}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
          <Text style={{ color: T.red, fontSize: 22, lineHeight: 24 }}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Day pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        {DAYS.map(d => {
          const count = (program.weeklySchedule[d.key] || []).length;
          const isActive = count > 0;
          const isExpanded = expandedDay === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => setExpandedDay(isExpanded ? null : d.key)}
              disabled={!isActive}
              activeOpacity={0.7}
              style={{
                alignItems: 'center',
                marginRight: 8,
                backgroundColor: isExpanded ? T.accentDark : isActive ? 'rgba(59,130,246,0.12)' : T.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: isExpanded ? T.accent : isActive ? T.accent : T.border,
                opacity: isActive ? 1 : 0.35,
                minWidth: 52,
              }}
            >
              <Text style={{ color: isExpanded ? '#fff' : isActive ? T.textPri : T.textDim, fontWeight: '700', fontSize: 13 }}>{d.label}</Text>
              {isActive && (
                <Text style={{ color: isExpanded ? 'rgba(255,255,255,0.65)' : T.accent, fontSize: 10, marginTop: 1 }}>{count} ex</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Expanded day table */}
      {expandedDay && (
        <View style={{ marginHorizontal: 14, marginBottom: 12, backgroundColor: T.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: T.border }}>
          <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {DAYS.find(d => d.key === expandedDay)?.label}
          </Text>
          <TableHeader />
          {(program.weeklySchedule[expandedDay] || []).map((ex, i) => (
            <TableRow key={i} ex={ex} index={i} editable={false} />
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 }}>
        <Text style={{ color: T.textDim, fontSize: 12 }}>
          {activeDays.length} active days · {new Date(program.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          onPress={onStart}
          style={{ backgroundColor: T.accentDark, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Start ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Exercise Picker Modal ────────────────────────────────────────────────────
const ExercisePicker = ({ visible, exercises, loading, onAdd, onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? exercises.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.primaryMuscles || []).some(m => m.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 60)
    : exercises.slice(0, 60);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, backgroundColor: T.border, borderRadius: 2 }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Text style={{ color: T.textPri, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Exercise</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or muscle..."
              placeholderTextColor={T.textDim}
              style={{
                backgroundColor: T.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 11,
                color: T.textPri,
                fontSize: 15,
                borderWidth: 1,
                borderColor: T.border,
              }}
            />
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={T.accent} size="large" />
              <Text style={{ color: T.textSec, marginTop: 12, fontSize: 14 }}>Loading exercises...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onAdd(item)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: T.card,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: T.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.textPri, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: T.textSec, fontSize: 12, marginTop: 2 }}>
                      {(item.primaryMuscles || []).join(', ')} · {item.equipment || 'body only'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: T.accentDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.accent }}>
                    <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: T.textDim, textAlign: 'center', marginTop: 30, fontSize: 14 }}>No exercises found</Text>
              }
            />
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ margin: 16, marginTop: 4, backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border }}
          >
            <Text style={{ color: T.textSec, fontWeight: '600', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Create Program Modal ─────────────────────────────────────────────────────
const CreateModal = ({ visible, type, exercises, loadingExs, onSave, onClose }) => {
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [dailyExs, setDailyExs] = useState([]);
  const [weekly, setWeekly]   = useState(EMPTY_WEEKLY());
  const [activeDay, setActiveDay] = useState('mon');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(''); setDesc('');
      setDailyExs([]); setWeekly(EMPTY_WEEKLY()); setActiveDay('mon');
    }
  }, [visible]);

  const currentList = type === 'daily' ? dailyExs : (weekly[activeDay] || []);

  const handleAdd = (ex) => {
    const entry = {
      id: `${ex.id}_${Date.now()}`,
      name: ex.name,
      sets: '',
      reps: '10-12',
      weight: '',
    };
    if (type === 'daily') {
      setDailyExs(prev => [...prev, entry]);
    } else {
      setWeekly(prev => ({ ...prev, [activeDay]: [...(prev[activeDay] || []), entry] }));
    }
    setShowPicker(false);
  };

  const handleRemove = (idx) => {
    if (type === 'daily') {
      setDailyExs(prev => prev.filter((_, i) => i !== idx));
    } else {
      setWeekly(prev => ({ ...prev, [activeDay]: prev[activeDay].filter((_, i) => i !== idx) }));
    }
  };

  const handleChange = (idx, field, value) => {
    if (type === 'daily') {
      setDailyExs(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    } else {
      setWeekly(prev => ({
        ...prev,
        [activeDay]: prev[activeDay].map((e, i) => i === idx ? { ...e, [field]: value } : e),
      }));
    }
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter a program name'); return; }
    if (type === 'daily' && dailyExs.length === 0) { Alert.alert('Error', 'Add at least one exercise'); return; }
    if (type === 'weekly' && !Object.values(weekly).some(d => d.length > 0)) {
      Alert.alert('Error', 'Add exercises to at least one day'); return;
    }
    onSave({ name: name.trim(), description: desc.trim(), type, exercises: dailyExs, weeklySchedule: weekly });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '93%' }}>
          <View style={{ alignItems: 'center', paddingTop: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: T.border, borderRadius: 2 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: T.textPri, fontSize: 20, fontWeight: '700', marginBottom: 20 }}>
              New {type === 'daily' ? 'Daily' : 'Weekly'} Program
            </Text>

            <Text style={labelStyle}>Program Name *</Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="e.g. Push Day" placeholderTextColor={T.textDim}
              style={inputStyle}
            />

            <Text style={labelStyle}>Description (optional)</Text>
            <TextInput
              value={desc} onChangeText={setDesc}
              placeholder="Brief description..." placeholderTextColor={T.textDim}
              style={[inputStyle, { minHeight: 56, textAlignVertical: 'top' }]}
              multiline
            />

            {/* Day selector for weekly */}
            {type === 'weekly' && (
              <>
                <Text style={labelStyle}>Day</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {DAYS.map(d => {
                    const count = (weekly[d.key] || []).length;
                    const sel = activeDay === d.key;
                    return (
                      <TouchableOpacity
                        key={d.key}
                        onPress={() => setActiveDay(d.key)}
                        style={{
                          backgroundColor: sel ? T.accentDark : T.card,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: sel ? 'rgba(59,130,246,0.5)' : T.border,
                          alignItems: 'center',
                          minWidth: 52,
                        }}
                      >
                        <Text style={{ color: sel ? '#fff' : T.textSec, fontWeight: '700', fontSize: 13 }}>{d.label}</Text>
                        {count > 0 && (
                          <Text style={{ color: sel ? 'rgba(255,255,255,0.7)' : T.accent, fontSize: 10, marginTop: 1 }}>{count}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Exercise table */}
            {currentList.length > 0 && (
              <View style={{
                backgroundColor: T.card,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: T.border,
              }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 6 }}>
                  <Text style={{ flex: 3, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Exercise</Text>
                  <Text style={{ width: 44, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Sets</Text>
                  <Text style={{ width: 52, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Reps</Text>
                  <Text style={{ width: 44, color: T.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>kg</Text>
                  <View style={{ width: 26 }} />
                </View>
                {currentList.map((ex, i) => (
                  <TableRow
                    key={ex.id}
                    ex={ex}
                    index={i}
                    editable
                    onRemove={() => handleRemove(i)}
                    onChange={(field, val) => handleChange(i, field, val)}
                  />
                ))}
              </View>
            )}

            {/* Add Exercise */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(59,130,246,0.4)',
                borderStyle: 'dashed',
                borderRadius: 14,
                padding: 14,
                marginBottom: 20,
                backgroundColor: 'rgba(59,130,246,0.06)',
              }}
            >
              <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 15 }}>+ Add Exercise</Text>
            </TouchableOpacity>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border }}
              >
                <Text style={{ color: T.textSec, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{ flex: 2, backgroundColor: T.accentDark, borderRadius: 14, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create Program</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <ExercisePicker
        visible={showPicker}
        exercises={exercises}
        loading={loadingExs}
        onAdd={handleAdd}
        onClose={() => setShowPicker(false)}
      />
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProgramsScreen = ({ navigate, userProfile, setCurrentWorkout, uid }) => {
  const [programs, setPrograms]         = useState([]);
  const [activeTab, setActiveTab]       = useState('programs');
  const [programType, setProgramType]   = useState('daily');
  const [showCreate, setShowCreate]     = useState(false);
  const [createType, setCreateType]     = useState('daily');
  const [exercises, setExercises]       = useState(FALLBACK);
  const [loadingExs, setLoadingExs]     = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);

  useEffect(() => {
    loadPrograms();
    loadHistory();
    // Load exercises in background — non-blocking
    setLoadingExs(true);
    loadExercisesFromCache()
      .then(exs => setExercises(exs))
      .catch(() => {})
      .finally(() => setLoadingExs(false));
  }, []);

  const loadPrograms = async () => {
    try {
      // Load local first (fast)
      const saved = await AsyncStorage.getItem('workout_programs_v2');
      if (saved) setPrograms(JSON.parse(saved));

      // Then sync from Firestore in background
      if (uid) {
        const remotePrograms = await FirestoreService.getPrograms(uid);
        if (remotePrograms && remotePrograms.length > 0) {
          setPrograms(remotePrograms);
          await AsyncStorage.setItem('workout_programs_v2', JSON.stringify(remotePrograms));
        }
      }
    } catch (_) {}
  };

  const loadHistory = async () => {
    try {
      // Load local first (fast)
      const h = await AsyncStorage.getItem('workout_history');
      if (h) setWorkoutHistory(JSON.parse(h));

      // Then sync from Firestore in background
      if (uid) {
        const remoteHistory = await FirestoreService.getWorkoutHistory(uid);
        if (remoteHistory && remoteHistory.length > 0) {
          setWorkoutHistory(remoteHistory);
          await AsyncStorage.setItem('workout_history', JSON.stringify(remoteHistory));
        }
      }
    } catch (_) {}
  };

  const savePrograms = async (list) => {
    try {
      await AsyncStorage.setItem('workout_programs_v2', JSON.stringify(list));
      setPrograms(list);
    } catch (_) {}
  };

  const handleCreate = (type) => {
    setCreateType(type);
    setShowCreate(true);
  };

  const handleSave = async (data) => {
    const prog = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const updated = [prog, ...programs];
    await savePrograms(updated);
    if (uid) {
      FirestoreService.saveProgram(uid, prog);
    }
    setShowCreate(false);
    setProgramType(data.type);
    setActiveTab('programs');
    Alert.alert('Created!', `${data.name} saved successfully.`);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this program?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          savePrograms(programs.filter(p => p.id !== id));
          if (uid) {
            FirestoreService.deleteProgram(uid, id);
          }
        },
      },
    ]);
  };

  const handleStart = (program) => {
    if (program.type === 'weekly') {
      const opts = DAYS
        .filter(d => (program.weeklySchedule[d.key] || []).length > 0)
        .map(d => ({
          text: d.label,
          onPress: () => {
            setCurrentWorkout({
              exercises: program.weeklySchedule[d.key],
              estimatedTime: `${Math.max(15, program.weeklySchedule[d.key].length * 5)} min`,
              difficulty: userProfile?.fitnessLevel || 'beginner',
              focus: 'Custom Program',
              totalExercises: program.weeklySchedule[d.key].length,
              date: new Date().toDateString(),
              fromProgram: `${program.name} – ${d.label}`,
            });
            navigate('generated_workout');
          },
        }));
      Alert.alert('Choose Day', 'Which day to start?', [...opts, { text: 'Cancel', style: 'cancel' }]);
    } else {
      setCurrentWorkout({
        exercises: program.exercises,
        estimatedTime: `${Math.max(15, program.exercises.length * 5)} min`,
        difficulty: userProfile?.fitnessLevel || 'beginner',
        focus: 'Custom Program',
        totalExercises: program.exercises.length,
        date: new Date().toDateString(),
        fromProgram: program.name,
      });
      navigate('generated_workout');
    }
  };

  const filtered = programType === 'ai' ? programs.filter(p => p.source === 'AI_WEEKLY') : programs.filter(p => p.type === programType && p.source !== 'AI_WEEKLY');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View>
            <Text style={{ color: T.textPri, fontSize: 32, fontFamily: 'BebasNeue-Regular', letterSpacing: 2 }}>My Programs</Text>
            <Text style={{ color: T.textSec, fontSize: 13, marginTop: 2, fontWeight: '500' }}>Daily & weekly routines</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigate('workout')}
            style={{ backgroundColor: T.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: T.border }}
          >
            <Text style={{ color: T.textSec, fontWeight: '600', fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Main tab bar */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: T.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: T.border }}>
          {[['programs', 'Programs'], ['history', 'History']].map(([tab, label]) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: activeTab === tab ? T.accentDark : 'transparent' }}
            >
              <Text style={{ color: activeTab === tab ? '#fff' : T.textSec, fontWeight: '700', fontSize: 14 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'programs' ? (
          <View style={{ paddingHorizontal: 20 }}>

            {/* Type filter */}
            <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: T.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: T.border }}>
              {[['daily', 'Daily'], ['weekly', 'Weekly'], ['ai', 'AI']].map(([t, label]) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setProgramType(t)}
                  style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: programType === t ? (t === 'ai' ? 'rgba(139,92,246,0.18)' : 'rgba(59,130,246,0.12)') : 'transparent' }}
                >
                  <Text style={{ color: programType === t ? (t === 'ai' ? '#A78BFA' : '#60a5fa') : T.textSec, fontWeight: '700', fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Create buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => handleCreate('daily')}
                style={{ flex: 1, backgroundColor: T.accentDark, borderRadius: 14, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>+ Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCreate('weekly')}
                style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}
              >
                <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 14 }}>+ Weekly</Text>
              </TouchableOpacity>
            </View>

            {/* Programs list */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <Text style={{ fontSize: 40, marginBottom: 14 }}>📋</Text>
                <Text style={{ color: T.textSec, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No {programType} programs</Text>
                <Text style={{ color: T.textDim, fontSize: 14, textAlign: 'center' }}>Tap + to create your first {programType} program</Text>
              </View>
            ) : (
              filtered.map(p =>
                p.type === 'weekly'
                  ? <WeeklyCard key={p.id} program={p} onStart={() => handleStart(p)} onDelete={() => handleDelete(p.id)} />
                  : <DailyCard  key={p.id} program={p} onStart={() => handleStart(p)} onDelete={() => handleDelete(p.id)} />
              )
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {workoutHistory.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <Text style={{ fontSize: 40, marginBottom: 14 }}>📈</Text>
                <Text style={{ color: T.textSec, fontSize: 16, fontWeight: '600' }}>No history yet</Text>
                <Text style={{ color: T.textDim, fontSize: 14, marginTop: 4 }}>Complete a workout to see it here</Text>
              </View>
            ) : (
              workoutHistory.map((w, i) => (
                <View key={i} style={{ backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ color: T.green, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>✓ {w.fromProgram || 'Workout'}</Text>
                  <Text style={{ color: T.textSec, fontSize: 13 }}>{w.totalExercises} exercises · {w.focus}</Text>
                  <Text style={{ color: T.textDim, fontSize: 12, marginTop: 2 }}>{new Date(w.completedAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <CreateModal
        visible={showCreate}
        type={createType}
        exercises={exercises}
        loadingExs={loadingExs}
        onSave={handleSave}
        onClose={() => setShowCreate(false)}
      />
    </SafeAreaView>
  );
};

export default ProgramsScreen;