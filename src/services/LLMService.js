// src/services/LLMService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

class LLMService {
  constructor() {
    // Use environment variable for API key
    this.API_KEY = Config.GROQ_API_KEY || 'YOUR_GROQ_API_KEY_HERE';
    this.BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
    this.MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
    this.CURRENT_MODEL = this.MODELS[0];
  }

  // ─── WEEKLY PROGRAM GENERATION ───────────────────────────────────────────────

  /**
   * Generates a full weekly workout program based on user selections.
   * @param {Object} params
   * @param {string} params.goal        - e.g. 'bodybuilding', 'calisthenics', 'weight_loss', 'strength', 'general'
   * @param {number} params.daysPerWeek - 2 to 6
   * @param {string} params.splitType   - 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split'
   * @param {Object} params.userProfile - from AsyncStorage
   */
  async generateWeeklyProgram({ goal, daysPerWeek, splitType, gender, userProfile }) {
    try {
      const exerciseDatabase = await this.getExerciseDatabase();
      const prompt = this.createWeeklyProgramPrompt({
        goal,
        daysPerWeek,
        splitType,
        gender,
        userProfile,
        exerciseDatabase,
      });

      const response = await this.callLLM(prompt, 'weekly_program');
      const program = this.parseWeeklyProgramResponse(response);

      await this.saveWorkoutHistory({ type: 'weekly_program', program });

      return { success: true, program, generatedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Weekly Program Generation Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackWeeklyProgram(daysPerWeek),
      };
    }
  }

  createWeeklyProgramPrompt({ goal, daysPerWeek, splitType, gender, userProfile, exerciseDatabase }) {
    const GOAL_LABELS = {
      bodybuilding:   'Bodybuilding (muscle hypertrophy, 8-12 reps, moderate-heavy weight)',
      calisthenics:   'Calisthenics (bodyweight mastery, progressions, skill work)',
      weight_loss:    'Weight loss & conditioning (higher reps, shorter rest, supersets)',
      strength:       'Powerlifting / max strength (3-6 reps, heavy compound lifts)',
      general:        'General fitness & health (balanced, 3-4 sets, 10-15 reps)',
      // profile goal aliases
      'muscle building': 'Bodybuilding (muscle hypertrophy)',
      cardio:            'Weight loss & conditioning',
    };

    const SPLIT_LABELS = {
      full_body:        'Full Body (every session works all major muscle groups)',
      upper_lower:      'Upper / Lower split (alternate upper and lower body days)',
      push_pull_legs:   'Push / Pull / Legs split (PPL)',
      bro_split:        'Body-part split (one main muscle group per day)',
    };

    // Map workoutDuration string to readable minutes
    const SESSION_MAP = { short: '30–40', medium: '45–60', long: '60–75' };
    const sessionMins = SESSION_MAP[userProfile?.workoutDuration]
      || (userProfile?.sessionTime ? String(userProfile.sessionTime) : '45–60');

    // Filter exercises to match user equipment so AI suggestions are realistic
    const userEquipment = (userProfile?.equipment || []).map(e => e.toLowerCase());
    let filtered = exerciseDatabase;
    if (userEquipment.length > 0) {
      filtered = exerciseDatabase.filter(ex => {
        const exEquip = (ex.equipment || []).map(e => e.toLowerCase());
        // always include bodyweight; otherwise check overlap with user equipment
        const hasBodyweight = exEquip.some(e => e === 'body only' || e === 'bodyweight');
        const hasUserEquip  = exEquip.some(e =>
          userEquipment.some(ue => e.includes(ue) || ue.includes(e))
        );
        return hasBodyweight || hasUserEquip;
      });
      // Safety: if too few matching exercises, fall back to full list
      if (filtered.length < 15) filtered = exerciseDatabase;
    }

    const sampleExercises = filtered
      .slice(0, 50)
      .map(ex =>
        `${ex.name} — muscles: ${ex.primaryMuscles?.join(', ') || 'full body'} — equipment: ${(ex.equipment || ['bodyweight']).join(', ')}`
      )
      .join('\n');

    // Gender-specific programming guidance
    const GENDER_GUIDANCE = {
      female: `FEMALE-SPECIFIC PROGRAMMING:
- Prioritize lower body volume: glutes, hamstrings, quads get 60% of total exercises.
- For every upper body exercise include at least 2 lower body or glute exercises.
- Include hip thrusts, glute bridges, Romanian deadlifts, lunges, step-ups, cable kickbacks, and abductor work whenever possible.
- Upper body: use moderate weights, higher reps (12-15), focus on toning not bulk.
- Core work (planks, dead bugs) should appear in most sessions.
- Avoid very heavy compound upper body pressing (no 3-5 rep bench press sets).`,
      male: `MALE-SPECIFIC PROGRAMMING:
- Balanced upper and lower body volume.
- Include compound lifts (squat, deadlift, bench press, overhead press, row) as primary movements.
- Upper body can be 50% of total exercise volume.
- Strength and hypertrophy rep ranges apply as normal per goal.`,
    };

    const genderGuidance = GENDER_GUIDANCE[gender] || GENDER_GUIDANCE.male;

    return `Create a ${daysPerWeek}-day weekly workout program.

USER PROFILE:
- Gender: ${gender === 'female' ? 'Female' : 'Male'}
- Fitness level: ${userProfile?.fitnessLevel || 'intermediate'}
- Primary goal: ${GOAL_LABELS[goal] || goal}
- Split type: ${SPLIT_LABELS[splitType] || splitType}
- Training days per week: ${daysPerWeek}
- Available equipment: ${userEquipment.length > 0 ? userEquipment.join(', ') : 'full gym (barbells, dumbbells, cables, machines)'}
- Session duration: ${sessionMins} minutes

${genderGuidance}

AVAILABLE EXERCISES (use ONLY exercises from this list when possible):
${sampleExercises}

RULES:
1. Produce EXACTLY ${daysPerWeek} training days (Day 1 to Day ${daysPerWeek}). No rest days in the output.
2. Each day needs a "dayName" matching the split (e.g. "Push Day", "Upper Body A", "Glutes & Legs").
3. Each day: 4–6 exercises. No more, no less.
4. Volume by goal: strength → 4-5 sets × 3-6 reps; hypertrophy → 3-4 sets × 8-12 reps; weight_loss → 3 sets × 12-20 reps; general → 3 sets × 10-15 reps.
5. Only use exercises compatible with the user's equipment. Prioritize exercises from the list above.
6. For each exercise include 2-3 short "instructions" steps (imperative sentences, max 10 words each).
7. Include warmup and cooldown notes per day.

Respond ONLY with this exact JSON (no markdown fences, no text outside the JSON):

{
  "programName": "...",
  "goal": "${goal}",
  "splitType": "${splitType}",
  "daysPerWeek": ${daysPerWeek},
  "estimatedSessionTime": "${sessionMins} minutes",
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Push Day",
      "focus": "Chest, Shoulders, Triceps",
      "warmup": "5 min treadmill + arm circles",
      "cooldown": "5 min chest & shoulder stretch",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest": "90 seconds",
          "notes": "Control the eccentric, 2 sec down",
          "instructions": ["Lie flat on bench with feet on floor", "Lower bar to chest with control", "Press up powerfully to full extension"],
          "primaryMuscles": ["chest", "triceps", "shoulders"]
        }
      ]
    }
  ],
  "generalTips": "..."
}`;
  }

  parseWeeklyProgramResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getFallbackWeeklyProgram(3);
    } catch (error) {
      console.error('Weekly program parse error:', error);
      return this.getFallbackWeeklyProgram(3);
    }
  }

  getFallbackWeeklyProgram(daysPerWeek = 3) {
    // 6 day templates so the fallback works for any daysPerWeek 2-6
    const dayTemplates = [
      {
        dayName: 'Push Day',
        focus: 'Chest, Shoulders, Triceps',
        exercises: [
          { name: 'Bench Press',       sets: 4, reps: '8-10',  rest: '90 seconds', notes: 'Control descent', instructions: ['Set up with shoulder blades retracted', 'Lower bar to mid-chest', 'Press up to full extension'], primaryMuscles: ['chest', 'triceps', 'shoulders'] },
          { name: 'Overhead Press',    sets: 3, reps: '8-10',  rest: '75 seconds', notes: 'Brace your core',  instructions: ['Stand with bar at shoulder height', 'Press overhead until arms lock out', 'Lower under control'],           primaryMuscles: ['shoulders', 'triceps'] },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '75 seconds', notes: '', instructions: ['Lie on incline bench', 'Press dumbbells up and slightly inward', 'Lower with control'],                            primaryMuscles: ['chest', 'shoulders'] },
          { name: 'Tricep Dips',       sets: 3, reps: '10-12', rest: '60 seconds', notes: 'Lean slightly forward', instructions: ['Grip parallel bars', 'Lower until elbows reach 90°', 'Push back up fully'],                        primaryMuscles: ['triceps', 'chest'] },
        ],
      },
      {
        dayName: 'Pull Day',
        focus: 'Back, Biceps',
        exercises: [
          { name: 'Pull-ups',          sets: 4, reps: '6-10',  rest: '90 seconds', notes: 'Full ROM', instructions: ['Hang from bar with overhand grip', 'Pull chest toward bar', 'Lower slowly'],                                    primaryMuscles: ['back', 'biceps'] },
          { name: 'Bent-over Row',     sets: 4, reps: '8-10',  rest: '75 seconds', notes: 'Keep back flat', instructions: ['Hinge at hips with slight knee bend', 'Row bar to lower chest', 'Squeeze shoulder blades at top'],        primaryMuscles: ['back', 'biceps'] },
          { name: 'Face Pulls',        sets: 3, reps: '12-15', rest: '60 seconds', notes: 'Elbows high', instructions: ['Attach rope to cable at face height', 'Pull toward face with elbows flared', 'Squeeze rear delts'],          primaryMuscles: ['rear delts', 'back'] },
          { name: 'Dumbbell Curl',     sets: 3, reps: '10-12', rest: '60 seconds', notes: '', instructions: ['Stand with dumbbells at sides', 'Curl up without swinging', 'Lower with control'],                                      primaryMuscles: ['biceps'] },
        ],
      },
      {
        dayName: 'Legs Day',
        focus: 'Quadriceps, Hamstrings, Glutes',
        exercises: [
          { name: 'Barbell Squat',     sets: 4, reps: '8-10',  rest: '120 seconds', notes: 'Depth to parallel', instructions: ['Bar on upper traps, feet shoulder-width', 'Squat down keeping chest tall', 'Drive through heels to stand'], primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '90 seconds',  notes: 'Feel hamstring stretch', instructions: ['Hold bar at hips', 'Hinge forward keeping back flat', 'Squeeze glutes to stand'], primaryMuscles: ['hamstrings', 'glutes'] },
          { name: 'Leg Press',         sets: 3, reps: '12-15', rest: '75 seconds',  notes: 'Don\'t lock knees', instructions: ['Sit in machine with feet shoulder-width on platform', 'Lower sled until 90° knee angle', 'Press back without locking'], primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Calf Raises',       sets: 4, reps: '15-20', rest: '60 seconds',  notes: 'Full stretch at bottom', instructions: ['Stand on edge of step', 'Lower heel below step level', 'Rise onto toes fully'],                  primaryMuscles: ['calves'] },
        ],
      },
      {
        dayName: 'Upper Body A',
        focus: 'Chest, Back',
        exercises: [
          { name: 'Incline Bench Press', sets: 4, reps: '8-10',  rest: '90 seconds', notes: '',           instructions: ['Set bench to 30-45°', 'Lower bar to upper chest', 'Press explosively'], primaryMuscles: ['chest', 'shoulders'] },
          { name: 'Cable Row',           sets: 4, reps: '10-12', rest: '75 seconds', notes: 'Chest tall', instructions: ['Sit upright with slight lean back', 'Pull handle to abdomen', 'Pause and squeeze'],                        primaryMuscles: ['back', 'biceps'] },
          { name: 'Lateral Raise',       sets: 3, reps: '12-15', rest: '60 seconds', notes: 'Control descent', instructions: ['Hold dumbbells at sides', 'Raise to shoulder height with slight bend', 'Lower slowly'],              primaryMuscles: ['shoulders'] },
          { name: 'Hammer Curl',         sets: 3, reps: '10-12', rest: '60 seconds', notes: '',           instructions: ['Hold dumbbells in neutral grip', 'Curl without rotating wrist', 'Lower with control'],                    primaryMuscles: ['biceps', 'brachialis'] },
        ],
      },
      {
        dayName: 'Lower Body B',
        focus: 'Glutes, Hamstrings',
        exercises: [
          { name: 'Deadlift',           sets: 4, reps: '5-6',   rest: '120 seconds', notes: 'Brace core hard', instructions: ['Stand over bar, feet hip-width', 'Grip bar, brace and pull', 'Lock hips at top'],                    primaryMuscles: ['back', 'hamstrings', 'glutes'] },
          { name: 'Lunges',             sets: 3, reps: '10 each', rest: '75 seconds', notes: 'Step wide',     instructions: ['Stand tall with dumbbells', 'Step forward and lower knee toward floor', 'Push back to start'],          primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Leg Curl',           sets: 3, reps: '12-15', rest: '60 seconds', notes: 'Squeeze at top', instructions: ['Lie face down on machine', 'Curl weight toward glutes', 'Lower slowly'],                               primaryMuscles: ['hamstrings'] },
          { name: 'Hip Thrust',         sets: 3, reps: '12-15', rest: '75 seconds', notes: 'Squeeze glutes at top', instructions: ['Sit with upper back on bench', 'Drive hips up with bar on hip crease', 'Hold at top 1 sec'],    primaryMuscles: ['glutes', 'hamstrings'] },
        ],
      },
      {
        dayName: 'Full Body',
        focus: 'Total Body Volume',
        exercises: [
          { name: 'Dumbbell Press',     sets: 3, reps: '12-15', rest: '60 seconds', notes: '', instructions: ['Hold dumbbells at chest level', 'Press up and slightly inward', 'Lower with control'],                               primaryMuscles: ['chest', 'shoulders'] },
          { name: 'Dumbbell Row',       sets: 3, reps: '12-15', rest: '60 seconds', notes: '', instructions: ['Brace on bench with one hand', 'Row dumbbell to hip', 'Squeeze lat at top'],                                         primaryMuscles: ['back', 'biceps'] },
          { name: 'Goblet Squat',       sets: 3, reps: '15',    rest: '60 seconds', notes: '', instructions: ['Hold dumbbell at chest', 'Squat with elbows inside knees', 'Stand and repeat'],                                       primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Plank',              sets: 3, reps: '45 sec',rest: '45 seconds', notes: 'Squeeze everything', instructions: ['Forearms and toes on floor', 'Maintain straight line from head to heels', 'Breathe steadily'],     primaryMuscles: ['core'] },
        ],
      },
    ];

    const days = [];
    for (let i = 0; i < Math.min(daysPerWeek, dayTemplates.length); i++) {
      days.push({
        dayNumber: i + 1,
        dayName: dayTemplates[i].dayName,
        focus: dayTemplates[i].focus,
        warmup: '5-10 min light cardio + dynamic stretches',
        cooldown: '5 min static stretching',
        exercises: dayTemplates[i].exercises,
      });
    }

    return {
      programName: 'Strength & Fitness Program',
      goal: 'general',
      splitType: daysPerWeek <= 3 ? 'full_body' : daysPerWeek <= 4 ? 'upper_lower' : 'push_pull_legs',
      daysPerWeek,
      estimatedSessionTime: '45-60 minutes',
      days,
      generalTips: 'Progressive overload: add a little weight or reps each week. Stay hydrated and prioritize sleep for recovery.',
    };
  }

  // ─── SINGLE WORKOUT GENERATION (unchanged) ────────────────────────────────

  async generatePersonalizedWorkout() {
    try {
      const userProfile = await this.getUserProfile();
      const exerciseDatabase = await this.getExerciseDatabase();
      const prompt = this.createWorkoutPrompt(userProfile, exerciseDatabase);
      const response = await this.callLLM(prompt, 'workout_generation');
      const workout = this.parseWorkoutResponse(response);

      return {
        success: true,
        workout: workout,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Workout Generation Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackWorkout()
      };
    }
  }

  async askFitnessQuestion(userQuestion) {
    try {
      const userProfile = await this.getUserProfile();
      const prompt = this.createQuestionPrompt(userQuestion, userProfile);
      const response = await this.callLLM(prompt, 'question_answer');

      return {
        success: true,
        answer: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Question Answer Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: "I'm sorry, I couldn't process your question right now. Please try again later."
      };
    }
  }

  // ─── CORE LLM CALL ───────────────────────────────────────────────────────────

  async callLLM(prompt, type = 'general') {
    let lastError = null;

    for (let i = 0; i < this.MODELS.length; i++) {
      const model = this.MODELS[i];

      try {
        console.log(`Trying model: ${model}`);

        const response = await fetch(this.BASE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gymapp.com',
            'X-Title': 'GymApp'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: this.getSystemPrompt(type) },
              { role: 'user', content: prompt }
            ],
            temperature: type === 'weekly_program' ? 0.6 : type === 'workout_generation' ? 0.7 : 0.8,
            // weekly_program needs more tokens for 6-day programs with instructions
            max_tokens: type === 'weekly_program' ? 4500 : type === 'workout_generation' ? 1200 : 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = new Error(`Model ${model}: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          console.log(`Model ${model} failed, trying next...`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        this.CURRENT_MODEL = model;
        console.log(`Success with model: ${model}`);
        return content;

      } catch (error) {
        lastError = error;
        console.log(`Model ${model} error:`, error.message);
        continue;
      }
    }

    throw lastError || new Error('All models failed');
  }

  getSystemPrompt(type) {
    const basePrompt = `You are an expert personal trainer and fitness coach with 15 years of experience. Provide precise, science-backed, personalized fitness programming.`;

    switch (type) {
      case 'weekly_program':
        return `${basePrompt}

You specialize in creating structured weekly workout programs. Always respond with valid JSON only — no markdown fences, no extra commentary before or after the JSON object. The JSON must exactly match the schema provided.`;

      case 'workout_generation':
        return `${basePrompt}

WORKOUT GENERATION RULES:
1. Create workouts based on user's fitness level, goals, and available equipment
2. Always include proper warm-up and cool-down suggestions
3. Provide sets, reps, and rest periods
4. Return response in this EXACT JSON format:

{
  "workoutName": "Upper Body Strength",
  "estimatedTime": "45 minutes",
  "difficulty": "intermediate",
  "exercises": [
    {
      "name": "Push-ups",
      "sets": 3,
      "reps": "10-12",
      "rest": "60 seconds",
      "notes": "Keep core tight, full range of motion",
      "primaryMuscles": ["chest", "triceps"],
      "secondaryMuscles": ["shoulders"],
      "equipment": ["bodyweight"],
      "category": "strength",
      "level": "intermediate",
      "instructions": ["Start in plank position", "Lower chest to ground", "Push back up"]
    }
  ],
  "warmup": "5-10 minutes light cardio",
  "cooldown": "5-10 minutes stretching"
}

IMPORTANT: Always include primaryMuscles as an array, even if just one muscle group.`;

      case 'question_answer':
        return `${basePrompt}

QUESTION ANSWERING RULES:
1. Provide personalized answers based on user's profile
2. Give practical, actionable advice
3. Be encouraging and motivational
4. If medical advice is needed, recommend consulting a healthcare professional
5. Keep responses concise but informative
6. Use the user's name if available`;

      default:
        return basePrompt;
    }
  }

  // ─── PROMPTS ─────────────────────────────────────────────────────────────────

  createWorkoutPrompt(userProfile, exerciseDatabase) {
    const availableExercises = exerciseDatabase.slice(0, 20).map(ex =>
      `${ex.name} (${ex.primaryMuscles?.join(', ') || 'Full body'}) - Equipment: ${ex.equipment?.join(', ') || 'Bodyweight'}`
    ).join('\n');

    return `Create a personalized workout for:

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Age: ${userProfile.age || 'Not specified'}
- Weight: ${userProfile.weight || 'Not specified'}kg
- Height: ${userProfile.height || 'Not specified'}cm
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Primary Goal: ${userProfile.goal || 'general fitness'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'bodyweight only'}
- Workout Days per Week: ${userProfile.workoutDays || 3}
- Session Duration: ${userProfile.sessionTime || 45} minutes

AVAILABLE EXERCISES:
${availableExercises}

Please create a workout that matches their profile and goals.`;
  }

  createQuestionPrompt(question, userProfile) {
    return `User Question: "${question}"

USER CONTEXT:
- Name: ${userProfile.name || 'User'}
- Age: ${userProfile.age || 'Not specified'}
- Weight: ${userProfile.weight || 'Not specified'}kg
- Height: ${userProfile.height || 'Not specified'}cm
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Goal: ${userProfile.goal || 'general fitness'}
- Equipment: ${userProfile.equipment?.join(', ') || 'limited'}

Please provide a personalized answer considering their profile and fitness level.`;
  }

  // ─── PARSERS ─────────────────────────────────────────────────────────────────

  parseWorkoutResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        workoutName: "AI Generated Workout",
        estimatedTime: "45 minutes",
        difficulty: "moderate",
        exercises: this.extractExercisesFromText(response),
        notes: response
      };
    } catch (error) {
      console.error('Parse error:', error);
      return this.getFallbackWorkout();
    }
  }

  extractExercisesFromText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const exercises = [];

    lines.forEach(line => {
      if (line.includes('sets') || line.includes('reps') || line.includes('x')) {
        exercises.push({
          name: line.split(':')[0]?.trim() || line.trim(),
          sets: 3,
          reps: "10-12",
          rest: "60 seconds",
          notes: line
        });
      }
    });

    return exercises.length > 0 ? exercises : this.getFallbackWorkout().exercises;
  }

  // ─── STORAGE ──────────────────────────────────────────────────────────────────

  async getUserProfile() {
    try {
      // App saves profile under 'user_info'; fall back to legacy 'userProfile' key
      const raw = (await AsyncStorage.getItem('user_info'))
               || (await AsyncStorage.getItem('userProfile'));
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  async getExerciseDatabase() {
    try {
      const cachedExercises = await AsyncStorage.getItem('exercises_cache');
      if (cachedExercises) {
        return JSON.parse(cachedExercises).slice(0, 50);
      }

      return [
        { name: "Push-ups", primaryMuscles: ["chest", "triceps"], equipment: ["bodyweight"] },
        { name: "Squats", primaryMuscles: ["quadriceps", "glutes"], equipment: ["bodyweight"] },
        { name: "Pull-ups", primaryMuscles: ["back", "biceps"], equipment: ["pull-up bar"] },
        { name: "Planks", primaryMuscles: ["core"], equipment: ["bodyweight"] },
        { name: "Lunges", primaryMuscles: ["legs", "glutes"], equipment: ["bodyweight"] },
        { name: "Barbell Bench Press", primaryMuscles: ["chest", "triceps"], equipment: ["barbell"] },
        { name: "Deadlift", primaryMuscles: ["back", "hamstrings", "glutes"], equipment: ["barbell"] },
        { name: "Overhead Press", primaryMuscles: ["shoulders", "triceps"], equipment: ["barbell"] },
        { name: "Dumbbell Row", primaryMuscles: ["back", "biceps"], equipment: ["dumbbell"] },
        { name: "Romanian Deadlift", primaryMuscles: ["hamstrings", "glutes"], equipment: ["barbell"] },
      ];
    } catch (error) {
      console.error('Error loading exercise database:', error);
      return [];
    }
  }

  getFallbackWorkout() {
    return {
      workoutName: "Basic Full Body Workout",
      estimatedTime: "30 minutes",
      difficulty: "beginner",
      exercises: [
        { name: "Push-ups", sets: 3, reps: "8-12", rest: "60 seconds", notes: "Modify on knees if needed" },
        { name: "Squats", sets: 3, reps: "12-15", rest: "60 seconds", notes: "Keep chest up, knees behind toes" },
        { name: "Plank", sets: 3, reps: "30-60 seconds", rest: "60 seconds", notes: "Keep body straight, engage core" }
      ],
      warmup: "5 minutes light movement",
      cooldown: "5 minutes stretching"
    };
  }

  async saveWorkoutHistory(workout) {
    try {
      const history = await AsyncStorage.getItem('workoutHistory');
      const workouts = history ? JSON.parse(history) : [];

      workouts.unshift({
        ...workout,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      });

      const limitedHistory = workouts.slice(0, 50);
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving workout history:', error);
    }
  }

  async saveChatHistory(question, answer) {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      const chats = history ? JSON.parse(history) : [];

      chats.unshift({
        id: Date.now().toString(),
        question,
        answer,
        timestamp: new Date().toISOString()
      });

      const limitedHistory = chats.slice(0, 20);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  async getChatHistory() {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  async testAPI() {
    try {
      console.log('Testing API connectivity...');
      const response = await this.callLLM('Say "API Connected!" in exactly 3 words.', 'general');
      console.log('API Test Result:', response);
      return { success: true, message: response };
    } catch (error) {
      console.error('API Test Failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new LLMService();