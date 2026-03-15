// src/screens/MeasurementsScreen.js
// Body Measurements Tracking — log weight, body fat, and body-part measurements
// with trend charts and history view.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import FirestoreService from '../services/FirestoreService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'body_measurements';
const SCREEN_WIDTH = Dimensions.get('window').width;

const T = {
  bg:       '#050508',
  surface:  '#0f0f1c',
  card:     '#131320',
  lift:     '#181828',
  border:   'rgba(255,255,255,0.05)',
  borderHi: 'rgba(59,130,246,0.22)',
  blue:     '#3b82f6',
  blue2:    '#60a5fa',
  blueDim:  'rgba(59,130,246,0.12)',
  green:    '#22c55e',
  greenDim: 'rgba(34,197,94,0.12)',
  red:      '#ef4444',
  gold:     '#f59e0b',
  goldDim:  'rgba(245,158,11,0.12)',
  purple:   '#8b5cf6',
  purpleDim:'rgba(139,92,246,0.12)',
  textPri:  '#e0eaff',
  textSec:  '#5a6a9a',
  textDim:  '#2a2a45',
};

// All trackable metrics — label shown in UI, key in data object, unit
const METRICS = [
  { key: 'weight',     label: 'Weight',    unit: 'kg',  color: T.blue   },
  { key: 'bodyFat',    label: 'Body Fat',  unit: '%',   color: T.gold   },
  { key: 'chest',      label: 'Chest',     unit: 'cm',  color: T.purple },
  { key: 'waist',      label: 'Waist',     unit: 'cm',  color: T.green  },
  { key: 'hips',       label: 'Hips',      unit: 'cm',  color: T.blue2  },
  { key: 'leftArm',    label: 'Left Arm',  unit: 'cm',  color: T.gold   },
  { key: 'rightArm',   label: 'Right Arm', unit: 'cm',  color: T.gold   },
  { key: 'leftThigh',  label: 'Left Thigh',unit: 'cm',  color: T.purple },
  { key: 'rightThigh', label: 'Right Thigh',unit: 'cm', color: T.purple },
];

const CHART_METRICS = METRICS.slice(0, 6); // top 6 shown as chart tabs

const CHART_CONFIG = {
  backgroundColor: T.card,
  backgroundGradientFrom: T.card,
  backgroundGradientTo: T.surface,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: () => T.textSec,
  strokeWidth: 2,
  propsForDots: { r: '4', strokeWidth: '2', stroke: T.blue2 },
  propsForBackgroundLines: { stroke: T.border },
  decimalPlaces: 1,
};

// Empty measurement form
const EMPTY_FORM = {
  weight: '',
  bodyFat: '',
  chest: '',
  waist: '',
  hips: '',
  leftArm: '',
  rightArm: '',
  leftThigh: '',
  rightThigh: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const parseNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};

// ─── Component ────────────────────────────────────────────────────────────────

const MeasurementsScreen = ({ navigate, uid, userProfile }) => {
  const [measurements, setMeasurements] = useState([]); // sorted newest first
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      // Local first (fast)
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let local = raw ? JSON.parse(raw) : [];
      // Sort newest first
      local.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeasurements(local);

      // Firestore sync in background
      if (uid) {
        const remote = await FirestoreService.getMeasurements(uid);
        if (remote && remote.length > 0) {
          // Merge: remote overrides local (Firestore is source of truth)
          const merged = remote.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
          setMeasurements(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (err) {
      console.error('MeasurementsScreen.loadMeasurements:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  // ─── Save new entry ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Require at least one field to be filled
    const hasValue = METRICS.some(m => form[m.key].trim() !== '');
    if (!hasValue) {
      Alert.alert('Nothing to save', 'Please enter at least one measurement.');
      return;
    }

    setSaving(true);
    try {
      const entry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        notes: form.notes.trim(),
      };
      METRICS.forEach(m => {
        const v = parseNum(form[m.key]);
        if (v !== null) entry[m.key] = v;
      });

      // Prepend to local state + AsyncStorage
      const updated = [entry, ...measurements];
      setMeasurements(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Sync to Firestore (non-blocking)
      if (uid) {
        FirestoreService.saveMeasurement(uid, entry);
      }

      setForm(EMPTY_FORM);
      setShowModal(false);
    } catch (err) {
      console.error('MeasurementsScreen.handleSave:', err);
      Alert.alert('Error', 'Could not save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete entry ────────────────────────────────────────────────────────────

  const handleDelete = (entryId) => {
    Alert.alert(
      'Delete Entry',
      'Remove this measurement log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = measurements.filter(m => m.id !== entryId);
            setMeasurements(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            if (uid) {
              FirestoreService.deleteMeasurement(uid, entryId);
            }
          },
        },
      ]
    );
  };

  // ─── Derived data ────────────────────────────────────────────────────────────

  // Latest values for the header stats row
  const latestWeight  = measurements.find(m => m.weight  != null)?.weight;
  const latestBodyFat = measurements.find(m => m.bodyFat != null)?.bodyFat;
  const latestWaist   = measurements.find(m => m.waist   != null)?.waist;
  const lastDate      = measurements[0]?.date;

  // Build chart data for the currently selected metric (up to last 10 entries)
  const buildChartData = (metricKey) => {
    const pts = measurements
      .filter(m => m[metricKey] != null)
      .slice(0, 10)
      .reverse(); // oldest → newest for chart left→right

    if (pts.length < 2) return null;

    return {
      labels: pts.map(p => formatShortDate(p.date)),
      datasets: [{ data: pts.map(p => p[metricKey]) }],
    };
  };

  const chartData   = buildChartData(activeMetric);
  const activeInfo  = METRICS.find(m => m.key === activeMetric);

  // Dynamic chart color based on selected metric
  const metricColor = (opacity = 1) => {
    const hex = activeInfo?.color || T.blue;
    // Convert hex to rgba
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  };

  // ─── BMI helper (if height in profile) ─────────────────────────────────────

  const getBMI = () => {
    if (!latestWeight || !userProfile?.height) return null;
    const h = parseFloat(userProfile.height) / 100; // cm → m
    if (!h || h <= 0) return null;
    return (latestWeight / (h * h)).toFixed(1);
  };

  const bmi = getBMI();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigate('workout')}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Body Measurements</Text>
        <TouchableOpacity style={s.logBtn} onPress={() => setShowModal(true)}>
          <Text style={s.logBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={T.blue} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Latest Stats Row ── */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { borderColor: 'rgba(59,130,246,0.3)' }]}>
              <Text style={[s.statValue, { color: T.blue }]}>
                {latestWeight != null ? `${latestWeight}` : '—'}
              </Text>
              <Text style={s.statLabel}>Weight (kg)</Text>
            </View>
            <View style={[s.statCard, { borderColor: 'rgba(245,158,11,0.3)' }]}>
              <Text style={[s.statValue, { color: T.gold }]}>
                {latestBodyFat != null ? `${latestBodyFat}%` : '—'}
              </Text>
              <Text style={s.statLabel}>Body Fat</Text>
            </View>
            <View style={[s.statCard, { borderColor: 'rgba(34,197,94,0.3)' }]}>
              <Text style={[s.statValue, { color: T.green }]}>
                {bmi != null ? bmi : (latestWaist != null ? `${latestWaist}` : '—')}
              </Text>
              <Text style={s.statLabel}>{bmi != null ? 'BMI' : 'Waist (cm)'}</Text>
            </View>
          </View>

          {lastDate && (
            <Text style={s.lastLoggedText}>Last logged: {formatDate(lastDate)}</Text>
          )}

          {/* ── Chart Section ── */}
          {measurements.length > 0 && (
            <View style={s.chartSection}>
              <Text style={s.sectionTitle}>Trends</Text>

              {/* Metric selector pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.pillsScroll}
                contentContainerStyle={s.pillsRow}
              >
                {CHART_METRICS.map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[s.pill, activeMetric === m.key && { backgroundColor: m.color + '22', borderColor: m.color }]}
                    onPress={() => setActiveMetric(m.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.pillText, activeMetric === m.key && { color: m.color }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Chart or empty hint */}
              {chartData ? (
                <View style={s.chartWrap}>
                  <LineChart
                    data={chartData}
                    width={SCREEN_WIDTH - 48}
                    height={180}
                    chartConfig={{
                      ...CHART_CONFIG,
                      color: metricColor,
                      propsForDots: { r: '4', strokeWidth: '2', stroke: activeInfo?.color || T.blue },
                    }}
                    bezier
                    style={{ borderRadius: 12 }}
                    withInnerLines={false}
                    withOuterLines={false}
                    withShadow={false}
                    fromZero={false}
                    yAxisSuffix={` ${activeInfo?.unit || ''}`}
                  />
                  <Text style={s.chartCaption}>
                    {activeInfo?.label} over last {chartData.datasets[0].data.length} entries
                  </Text>
                </View>
              ) : (
                <View style={s.chartEmpty}>
                  <Text style={s.chartEmptyText}>
                    Log at least 2 {activeInfo?.label.toLowerCase()} entries to see a chart.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── History ── */}
          <View style={s.historySection}>
            <Text style={s.sectionTitle}>
              {measurements.length === 0 ? 'No Measurements Yet' : `History (${measurements.length})`}
            </Text>

            {measurements.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📏</Text>
                <Text style={s.emptyTitle}>Start Tracking</Text>
                <Text style={s.emptyText}>
                  Log your weight, body fat, and body measurements to track progress over time.
                </Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.emptyBtnText}>Log First Measurement</Text>
                </TouchableOpacity>
              </View>
            ) : (
              measurements.map(entry => (
                <View key={entry.id} style={s.entryCard}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryDate}>{formatDate(entry.date)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Metrics grid for this entry */}
                  <View style={s.entryGrid}>
                    {METRICS.filter(m => entry[m.key] != null).map(m => (
                      <View key={m.key} style={s.entryMetric}>
                        <Text style={[s.entryMetricValue, { color: m.color }]}>
                          {entry[m.key]}{m.unit}
                        </Text>
                        <Text style={s.entryMetricLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>

                  {entry.notes ? (
                    <Text style={s.entryNotes}>"{entry.notes}"</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Log Measurement Modal ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Handle */}
            <View style={s.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>Log Measurement</Text>
              <Text style={s.modalSubtitle}>Fill in what you have — everything is optional.</Text>

              {/* ── Primary metrics ── */}
              <Text style={s.formGroupLabel}>PRIMARY</Text>
              <View style={s.formRow}>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.weight}
                    onChangeText={v => setForm({ ...form, weight: v })}
                    placeholder="e.g. 75.5"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Body Fat (%)</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.bodyFat}
                    onChangeText={v => setForm({ ...form, bodyFat: v })}
                    placeholder="e.g. 18.0"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* ── Body measurements ── */}
              <Text style={s.formGroupLabel}>BODY MEASUREMENTS (cm)</Text>
              <View style={s.formRow}>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Chest</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.chest}
                    onChangeText={v => setForm({ ...form, chest: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Waist</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.waist}
                    onChangeText={v => setForm({ ...form, waist: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={s.formRow}>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Hips</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.hips}
                    onChangeText={v => setForm({ ...form, hips: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }} />
              </View>

              {/* ── Arms ── */}
              <Text style={s.formGroupLabel}>ARMS (cm)</Text>
              <View style={s.formRow}>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Left Arm</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.leftArm}
                    onChangeText={v => setForm({ ...form, leftArm: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Right Arm</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.rightArm}
                    onChangeText={v => setForm({ ...form, rightArm: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* ── Thighs ── */}
              <Text style={s.formGroupLabel}>THIGHS (cm)</Text>
              <View style={s.formRow}>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Left Thigh</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.leftThigh}
                    onChangeText={v => setForm({ ...form, leftThigh: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.formField}>
                  <Text style={s.fieldLabel}>Right Thigh</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.rightThigh}
                    onChangeText={v => setForm({ ...form, rightThigh: v })}
                    placeholder="cm"
                    placeholderTextColor={T.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* ── Notes ── */}
              <Text style={s.formGroupLabel}>NOTES (optional)</Text>
              <TextInput
                style={[s.fieldInput, s.notesInput]}
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
                placeholder="e.g. Morning, fasted"
                placeholderTextColor={T.textDim}
                multiline
                numberOfLines={2}
              />

              {/* ── Buttons ── */}
              <View style={s.modalBtns}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                  disabled={saving}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: T.textPri,
    fontSize: 18,
    lineHeight: 22,
  },
  headerTitle: {
    color: T.textPri,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logBtn: {
    backgroundColor: T.blue,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  logBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Scroll content
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: T.textPri,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: T.textSec,
    textAlign: 'center',
  },

  lastLoggedText: {
    color: T.textSec,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 20,
  },

  // Section title
  sectionTitle: {
    color: T.textPri,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },

  // Chart section
  chartSection: {
    marginBottom: 28,
  },
  pillsScroll: {
    marginBottom: 14,
  },
  pillsRow: {
    gap: 8,
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.lift,
    borderWidth: 1,
    borderColor: T.border,
  },
  pillText: {
    color: T.textSec,
    fontSize: 13,
    fontWeight: '600',
  },
  chartWrap: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  chartCaption: {
    color: T.textSec,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
  },
  chartEmpty: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  chartEmptyText: {
    color: T.textSec,
    fontSize: 13,
    textAlign: 'center',
  },

  // History
  historySection: {
    marginBottom: 8,
  },
  entryCard: {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryDate: {
    color: T.textPri,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteIcon: {
    fontSize: 16,
  },
  entryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryMetric: {
    backgroundColor: T.lift,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  entryMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  entryMetricLabel: {
    color: T.textSec,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  entryNotes: {
    color: T.textSec,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: T.textPri,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: T.textSec,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: T.blue,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 0,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: T.textPri,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: T.textSec,
    fontSize: 13,
    marginBottom: 20,
  },

  // Form
  formGroupLabel: {
    color: T.textSec,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    color: T.textSec,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: T.lift,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: T.textPri,
    fontSize: 15,
    borderWidth: 1,
    borderColor: T.border,
  },
  notesInput: {
    marginBottom: 20,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Modal buttons
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: T.lift,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: T.textSec,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: T.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
};

export default MeasurementsScreen;
